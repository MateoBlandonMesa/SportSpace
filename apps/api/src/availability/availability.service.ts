import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AvailabilityKind, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { SetWeeklyHoursDto } from './dto/set-weekly-hours.dto';

export const TIME_ZONE = 'America/Bogota';
export const SLOT_MINUTES = 60;
const BOGOTA_OFFSET = '-05:00';

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

  async setWeeklyHours(spaceId: string, dto: SetWeeklyHoursDto) {
    await this.spacesService.getById(spaceId);
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const daysOfWeek = [...new Set(dto.daysOfWeek)].sort((a, b) => a - b);

    return this.prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({
        where: { spaceId, kind: AvailabilityKind.WEEKLY_HOURS },
      });
      await tx.availabilityRule.createMany({
        data: daysOfWeek.map((dayOfWeek) => ({
          spaceId,
          kind: AvailabilityKind.WEEKLY_HOURS,
          dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
        })),
      });
      return tx.availabilityRule.findMany({
        where: { spaceId, kind: AvailabilityKind.WEEKLY_HOURS },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
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

function bogotaDateOf(instant: Date): string {
  return instant.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

function isValidIsoDate(date: string): boolean {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

function bogotaDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${BOGOTA_OFFSET}`);
}

function addDays(date: string, amount: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + amount));
  return utc.toISOString().slice(0, 10);
}

function isoDayOfWeek(date: string): number {
  const noon = bogotaDateTime(date, '12:00');
  const jsDay = noon.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

function buildSlots(date: string, startTime: string, endTime: string): Array<{ startsAt: Date; endsAt: Date }> {
  const slots: Array<{ startsAt: Date; endsAt: Date }> = [];
  let cursor = bogotaDateTime(date, startTime);
  const end = bogotaDateTime(date, endTime);
  const step = SLOT_MINUTES * 60 * 1000;

  while (cursor.getTime() + step <= end.getTime()) {
    const next = new Date(cursor.getTime() + step);
    slots.push({ startsAt: cursor, endsAt: next });
    cursor = next;
  }

  return slots;
}

function uniqueByStart(slots: Array<{ startsAt: Date; endsAt: Date }>) {
  const seen = new Map<number, { startsAt: Date; endsAt: Date }>();
  for (const slot of slots) {
    seen.set(slot.startsAt.getTime(), slot);
  }
  return [...seen.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function overlaps(
  slot: { startsAt: Date; endsAt: Date },
  startsAt: Date | null,
  endsAt: Date | null,
): boolean {
  if (!startsAt || !endsAt) {
    return false;
  }
  return startsAt < slot.endsAt && endsAt > slot.startsAt;
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
