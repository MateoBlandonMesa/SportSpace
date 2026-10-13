import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus, Role } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

const LIST_TAKE = 100;
const SPACE_SELECT = { id: true, name: true, type: true, campus: true } as const;
const USER_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async list(actor: JwtPayload) {
    const isStaff = actor.role === Role.STAFF || actor.role === Role.ADMIN;
    return this.prisma.reservation.findMany({
      where: isStaff ? {} : { userId: actor.sub },
      include: {
        space: { select: SPACE_SELECT },
        ...(isStaff ? { user: { select: USER_SELECT } } : {}),
      },
      orderBy: { startsAt: 'desc' },
      take: LIST_TAKE,
    });
  }

  async create(actor: JwtPayload, dto: CreateReservationDto) {
    const startsAt = parseInstant(dto.startsAt);
    const endsAt = parseInstant(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot reserve a past time slot');
    }

    await this.spacesService.requireActive(dto.spaceId);
    await this.availabilityService.assertBookableInterval(dto.spaceId, startsAt, endsAt);
    await this.assertNoOverlap(dto.spaceId, startsAt, endsAt);

    try {
      const reservation = await this.prisma.$transaction(async (tx) => {
        const created = await tx.reservation.create({
          data: {
            spaceId: dto.spaceId,
            userId: actor.sub,
            startsAt,
            endsAt,
            status: ReservationStatus.PENDING,
          },
          include: { space: { select: SPACE_SELECT } },
        });
        await writeAudit(tx, actor.sub, created.id, null, ReservationStatus.PENDING);
        return created;
      });
      return reservation;
    } catch (error) {
      if (isOverlapConstraintError(error)) {
        throw new ConflictException('This time overlaps an existing reservation');
      }
      throw error;
    }
  }

  async cancel(actor: JwtPayload, id: string) {
    const reservation = await this.requireById(id);
    if (reservation.userId !== actor.sub) {
      throw new ForbiddenException('You can only cancel your own reservations');
    }
    this.assertTransition(reservation.status, ReservationStatus.CANCELLED);
    if (reservation.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot cancel a reservation that already started');
    }
    return this.updateStatus(actor.sub, reservation.id, reservation.status, ReservationStatus.CANCELLED);
  }

  async approve(actor: JwtPayload, id: string) {
    this.assertStaff(actor);
    const reservation = await this.requireById(id);
    this.assertTransition(reservation.status, ReservationStatus.APPROVED);
    return this.updateStatus(actor.sub, reservation.id, reservation.status, ReservationStatus.APPROVED);
  }

  async reject(actor: JwtPayload, id: string, reason: string) {
    this.assertStaff(actor);
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new BadRequestException('A rejection reason is required');
    }
    const reservation = await this.requireById(id);
    this.assertTransition(reservation.status, ReservationStatus.REJECTED);
    return this.updateStatus(
      actor.sub,
      reservation.id,
      reservation.status,
      ReservationStatus.REJECTED,
      trimmed,
    );
  }

  private async requireById(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { space: { select: SPACE_SELECT } },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return reservation;
  }

  private async assertNoOverlap(spaceId: string, startsAt: Date, endsAt: Date) {
    const overlapping = await this.prisma.reservation.findFirst({
      where: {
        spaceId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (overlapping) {
      throw new ConflictException('This time overlaps an existing reservation');
    }
  }

  private assertStaff(actor: JwtPayload) {
    if (actor.role !== Role.STAFF && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private assertTransition(from: ReservationStatus, to: ReservationStatus) {
    const allowed: Record<ReservationStatus, ReservationStatus[]> = {
      PENDING: [ReservationStatus.APPROVED, ReservationStatus.REJECTED, ReservationStatus.CANCELLED],
      APPROVED: [ReservationStatus.CANCELLED],
      REJECTED: [],
      CANCELLED: [],
    };
    if (!allowed[from].includes(to)) {
      throw new ConflictException(`Cannot transition from ${from} to ${to}`);
    }
  }

  private updateStatus(
    actorId: string,
    id: string,
    from: ReservationStatus,
    to: ReservationStatus,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: { status: to, ...(reason !== undefined ? { reason } : {}) },
        include: { space: { select: SPACE_SELECT } },
      });
      await writeAudit(tx, actorId, id, from, to);
      return updated;
    });
  }
}

function parseInstant(value: string): Date {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new BadRequestException('Invalid datetime');
  }
  return instant;
}

function isOverlapConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('23P01') || message.includes('Reservation_no_overlap')) {
    return true;
  }
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2010';
}

function writeAudit(
  tx: Prisma.TransactionClient,
  actorId: string,
  entityId: string,
  fromValue: string | null,
  toValue: string,
) {
  return tx.auditLog.create({
    data: {
      actorId,
      entityType: 'Reservation',
      entityId,
      fromValue,
      toValue,
    },
  });
}
