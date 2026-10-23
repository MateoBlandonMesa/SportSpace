import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { AvailabilityKind, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { OccupancyService } from './occupancy.service';

describe('OccupancyService', () => {
  function createService(
    spaces: Array<Record<string, unknown>> = [],
    weeklyHours: Array<Record<string, unknown>> = [],
    blocks: Array<Record<string, unknown>> = [],
    reservations: Array<Record<string, unknown>> = [],
  ) {
    const prisma = {
      space: {
        findMany: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(spaces),
      },
      availabilityRule: {
        findMany: jest
          .fn<
            (
              query: { where: { kind: AvailabilityKind } },
            ) => Promise<Array<Record<string, unknown>>>
          >()
          .mockImplementation((query) =>
            Promise.resolve(
              query.where.kind === AvailabilityKind.WEEKLY_HOURS
                ? weeklyHours
                : blocks,
            )),
      },
      reservation: {
        findMany: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(reservations),
      },
    };
    const spacesService = { getById: jest.fn() };
    const service = new OccupancyService(
      prisma as unknown as PrismaService,
      spacesService as unknown as SpacesService,
    );
    return { service, prisma, spacesService };
  }

  it('rechaza una fecha que no existe en el calendario', async () => {
    const { service, prisma } = createService();

    await expect(service.getWeek({ weekStart: '2026-02-30' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.space.findMany).not.toHaveBeenCalled();
  });

  it('calcula horas habilitadas, ocupadas y bloqueadas de la semana', async () => {
    const space = {
      id: 'space-1',
      name: 'Cancha Norte',
      type: 'Cancha',
      campus: 'Principal',
      isActive: true,
    };
    const { service } = createService(
      [space],
      [
        {
          spaceId: space.id,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '11:00',
        },
      ],
      [
        {
          spaceId: space.id,
          startsAt: new Date('2026-10-19T09:00:00-05:00'),
          endsAt: new Date('2026-10-19T10:00:00-05:00'),
        },
      ],
      [
        {
          spaceId: space.id,
          status: ReservationStatus.APPROVED,
          startsAt: new Date('2026-10-19T10:00:00-05:00'),
          endsAt: new Date('2026-10-19T11:00:00-05:00'),
        },
      ],
    );

    const result = await service.getWeek({ weekStart: '2026-10-19' });

    expect(result).toMatchObject({
      weekStart: '2026-10-19',
      weekEnd: '2026-10-25',
      spaces: [
        {
          spaceId: space.id,
          enabledHours: 1,
          occupiedHours: 1,
          blockedHours: 1,
          occupancyPercent: 100,
        },
      ],
    });
  });
});
