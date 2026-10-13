import { BadRequestException, Injectable } from '@nestjs/common';
import { AvailabilityKind, ReservationStatus } from '@prisma/client';
import {
  SLOT_MINUTES,
  TIME_ZONE,
  addDays,
  bogotaDateTime,
  buildSlots,
  isValidIsoDate,
  isoDayOfWeek,
  mondayOfWeek,
  overlaps,
  uniqueByStart,
  weekDates,
} from '../availability/slot-math';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { OccupancyQueryDto } from './dto/occupancy-query.dto';

@Injectable()
export class OccupancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
  ) {}

  async getWeek(query: OccupancyQueryDto) {
    if (!isValidIsoDate(query.weekStart)) {
      throw new BadRequestException('weekStart must be a valid calendar day (YYYY-MM-DD)');
    }

    if (query.spaceId) {
      await this.spacesService.getById(query.spaceId);
    }

    const monday = mondayOfWeek(query.weekStart);
    const sunday = addDays(monday, 6);
    const weekStart = bogotaDateTime(monday, '00:00');
    const weekEnd = bogotaDateTime(addDays(monday, 7), '00:00');
    const days = weekDates(monday);

    const spaces = await this.prisma.space.findMany({
      where: query.spaceId ? { id: query.spaceId } : {},
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, campus: true, isActive: true },
    });
    const spaceIds = spaces.map((space) => space.id);

    const [weeklyHours, blocks, reservations] = spaceIds.length
      ? await Promise.all([
          this.prisma.availabilityRule.findMany({
            where: { spaceId: { in: spaceIds }, kind: AvailabilityKind.WEEKLY_HOURS },
          }),
          this.prisma.availabilityRule.findMany({
            where: {
              spaceId: { in: spaceIds },
              kind: AvailabilityKind.BLOCK,
              startsAt: { not: null, lt: weekEnd },
              endsAt: { not: null, gt: weekStart },
            },
          }),
          this.prisma.reservation.findMany({
            where: {
              spaceId: { in: spaceIds },
              status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
              startsAt: { lt: weekEnd },
              endsAt: { gt: weekStart },
            },
          }),
        ])
      : [[], [], []];

    const hoursPerSlot = SLOT_MINUTES / 60;

    return {
      weekStart: monday,
      weekEnd: sunday,
      timeZone: TIME_ZONE,
      slotMinutes: SLOT_MINUTES,
      spaces: spaces.map((space) => {
        let enabledHours = 0;
        let occupiedHours = 0;
        let blockedHours = 0;

        for (const date of days) {
          const isoDay = isoDayOfWeek(date);
          const slots = uniqueByStart(
            weeklyHours
              .filter((rule) => rule.spaceId === space.id && rule.dayOfWeek === isoDay)
              .flatMap((rule) => buildSlots(date, rule.startTime ?? '00:00', rule.endTime ?? '00:00')),
          );

          for (const slot of slots) {
            const blocked = blocks.some(
              (item) => item.spaceId === space.id && overlaps(slot, item.startsAt, item.endsAt),
            );
            if (blocked) {
              blockedHours += hoursPerSlot;
              continue;
            }

            enabledHours += hoursPerSlot;
            const occupied = reservations.some(
              (item) => item.spaceId === space.id && overlaps(slot, item.startsAt, item.endsAt),
            );
            if (occupied) {
              occupiedHours += hoursPerSlot;
            }
          }
        }

        return {
          spaceId: space.id,
          name: space.name,
          type: space.type,
          campus: space.campus,
          isActive: space.isActive,
          enabledHours,
          occupiedHours,
          blockedHours,
          occupancyPercent: enabledHours === 0 ? 0 : roundOne(occupiedHours / enabledHours * 100),
        };
      }),
    };
  }
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
