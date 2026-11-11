import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityKind, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { ListBlocksQueryDto } from './dto/list-blocks-query.dto';
import { SetWeeklyHoursDto } from './dto/set-weekly-hours.dto';
import {
  SLOT_MINUTES,
  TIME_ZONE,
  addDays,
  bogotaDateOf,
  bogotaDateTime,
  buildSlots,
  isValidIsoDate,
  isoDayOfWeek,
  overlaps,
  uniqueByStart,
} from './slot-math';

export type SlotStatus = 'FREE' | 'BUSY' | 'BLOCKED' | 'PAST';

export type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  status: SlotStatus;
  bookable: boolean;
  reason?: string;
};

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
  ) {}

  async getDay(spaceId: string, date: string) {
    if (!isValidIsoDate(date)) {
      throw new BadRequestException('date must be a valid calendar day (YYYY-MM-DD)');
    }

    const space = await this.spacesService.requireActive(spaceId);
    const dayStart = bogotaDateTime(date, '00:00');
    const dayEnd = bogotaDateTime(addDays(date, 1), '00:00');
    const isoDay = isoDayOfWeek(date);

    const [weeklyHours, blocks, reservations] = await Promise.all([
      this.prisma.availabilityRule.findMany({
        where: { spaceId, kind: AvailabilityKind.WEEKLY_HOURS, dayOfWeek: isoDay },
      }),
      this.prisma.availabilityRule.findMany({
        where: {
          spaceId,
          kind: AvailabilityKind.BLOCK,
          startsAt: { not: null, lt: dayEnd },
          endsAt: { not: null, gt: dayStart },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          spaceId,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
          startsAt: { lt: dayEnd },
          endsAt: { gt: dayStart },
        },
      }),
    ]);

    const now = new Date();
    const generated = weeklyHours.flatMap((rule) =>
      buildSlots(date, rule.startTime ?? '00:00', rule.endTime ?? '00:00'),
    );
    const unique = uniqueByStart(generated);

    const slots: AvailabilitySlot[] = unique.map((slot) => {
      if (slot.endsAt.getTime() <= now.getTime()) {
        return toSlot(slot, 'PAST');
      }

      const block = blocks.find((item) => overlaps(slot, item.startsAt, item.endsAt));
      if (block) {
        return toSlot(slot, 'BLOCKED', block.reason ?? 'blocked');
      }

      const busy = reservations.some((item) => overlaps(slot, item.startsAt, item.endsAt));
      if (busy) {
        return toSlot(slot, 'BUSY', 'reservation');
      }

      return toSlot(slot, 'FREE');
    });

    return {
      spaceId: space.id,
      spaceName: space.name,
      date,
      timeZone: TIME_ZONE,
      slotMinutes: SLOT_MINUTES,
      slots,
    };
  }

  async getWeeklyHours(spaceId: string) {
    await this.spacesService.getById(spaceId);
    return this.prisma.availabilityRule.findMany({
      where: { spaceId, kind: AvailabilityKind.WEEKLY_HOURS },
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async setWeeklyHours(spaceId: string, dto: SetWeeklyHoursDto) {
    await this.spacesService.getById(spaceId);

    const seenDays = new Set<number>();
    for (const rule of dto.rules) {
      if (seenDays.has(rule.dayOfWeek)) {
        throw new BadRequestException(`dayOfWeek ${rule.dayOfWeek} appears more than once`);
      }
      if (rule.startTime >= rule.endTime) {
        throw new BadRequestException('endTime must be after startTime');
      }
      seenDays.add(rule.dayOfWeek);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({
        where: { spaceId, kind: AvailabilityKind.WEEKLY_HOURS },
      });
      if (dto.rules.length > 0) {
        await tx.availabilityRule.createMany({
          data: dto.rules.map((rule) => ({
            spaceId,
            kind: AvailabilityKind.WEEKLY_HOURS,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
          })),
        });
      }
      return tx.availabilityRule.findMany({
        where: { spaceId, kind: AvailabilityKind.WEEKLY_HOURS },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  async listBlocks(spaceId: string, query: ListBlocksQueryDto) {
    await this.spacesService.getById(spaceId);
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      throw new BadRequestException('to must be after from');
    }

    return this.prisma.availabilityRule.findMany({
      where: {
        spaceId,
        kind: AvailabilityKind.BLOCK,
        startsAt: { not: null, lt: to },
        endsAt: { not: null, gt: from },
      },
      select: { id: true, startsAt: true, endsAt: true, reason: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  async deleteBlock(spaceId: string, blockId: string): Promise<void> {
    await this.spacesService.getById(spaceId);
    const result = await this.prisma.availabilityRule.deleteMany({
      where: { id: blockId, spaceId, kind: AvailabilityKind.BLOCK },
    });
    if (result.count === 0) {
      throw new NotFoundException('Block not found');
    }
  }

  async createBlock(spaceId: string, dto: CreateBlockDto) {
    await this.spacesService.getById(spaceId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.prisma.availabilityRule.create({
      data: {
        spaceId,
        kind: AvailabilityKind.BLOCK,
        startsAt,
        endsAt,
        reason: dto.reason.trim(),
      },
    });
  }

  async assertBookableInterval(spaceId: string, startsAt: Date, endsAt: Date): Promise<void> {
    const startDate = bogotaDateOf(startsAt);
    const endDate = bogotaDateOf(new Date(endsAt.getTime() - 1));
    if (startDate !== endDate) {
      throw new BadRequestException('Reservations must stay on a single calendar day');
    }

    const day = await this.getDay(spaceId, startDate);
    const covering = day.slots.filter((slot) => {
      const slotStart = new Date(slot.startsAt);
      const slotEnd = new Date(slot.endsAt);
      return slotStart < endsAt && slotEnd > startsAt;
    });

    if (covering.length === 0) {
      throw new BadRequestException('Interval is outside operating hours');
    }

    const firstStart = new Date(covering[0].startsAt).getTime();
    const lastEnd = new Date(covering[covering.length - 1].endsAt).getTime();
    if (firstStart !== startsAt.getTime() || lastEnd !== endsAt.getTime()) {
      throw new BadRequestException('Interval must align to 60-minute operating slots');
    }

    const blocked = covering.find((slot) => slot.status === 'BLOCKED');
    if (blocked) {
      throw new ConflictException(blocked.reason ?? 'This time is blocked');
    }

    const past = covering.find((slot) => slot.status === 'PAST');
    if (past) {
      throw new BadRequestException('Cannot reserve a past time slot');
    }

    const busy = covering.find((slot) => slot.status === 'BUSY');
    if (busy) {
      throw new ConflictException('This time overlaps an existing reservation');
    }
  }
}

function toSlot(
  slot: { startsAt: Date; endsAt: Date },
  status: SlotStatus,
  reason?: string,
): AvailabilitySlot {
  return {
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    status,
    bookable: status === 'FREE',
    ...(reason ? { reason } : {}),
  };
}
