import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { AvailabilityKind, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  let spacesServiceMock: any;
  let prismaMock: any;

  beforeEach(() => {
    // Congelamos el tiempo de forma absoluta en el futuro para que las fechas del test no dependan de la hora en que ejecutas Jest
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-24T12:00:00.000-05:00'));

    spacesServiceMock = {
      requireActive: jest.fn<() => Promise<any>>(),
      getById: jest.fn<() => Promise<any>>(),
    };

    prismaMock = {
      availabilityRule: {
        findMany: jest.fn<() => Promise<any[]>>(),
        createMany: jest.fn<() => Promise<any>>(),
        deleteMany: jest.fn<() => Promise<any>>(),
        create: jest.fn<() => Promise<any>>(),
      },
      reservation: {
        findMany: jest.fn<() => Promise<any[]>>(),
      },
      $transaction: jest.fn<(cb: any) => Promise<any>>().mockImplementation((cb: any) => cb(prismaMock)),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function createService() {
    const service = new AvailabilityService(
      prismaMock as unknown as PrismaService,
      spacesServiceMock as unknown as SpacesService,
    );
    return { service };
  }

  describe('getDay', () => {
    it('lanza BadRequestException si el formato de la fecha es inválido (Branch)', async () => {
      const { service } = createService();
      await expect(service.getDay('space-1', '23-10-2026')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('retorna las franjas horarias mapeando estados FREE, PAST, BLOCKED y BUSY (Camino Feliz Completo)', async () => {
      const { service } = createService();
      
      spacesServiceMock.requireActive.mockResolvedValue({ id: 'space-1', name: 'Cancha 1' });
      
      // Simulamos una regla semanal de 06:00 a 08:00 (Generará slots de 1 hora pasados en base a las 12:00 pm)
      prismaMock.availabilityRule.findMany.mockResolvedValueOnce([
        { id: 'rule-1', kind: AvailabilityKind.WEEKLY_HOURS, dayOfWeek: 6, startTime: '06:00', endTime: '08:00' }
      ]);
      
      prismaMock.availabilityRule.findMany.mockResolvedValueOnce([]);
      prismaMock.reservation.findMany.mockResolvedValue([]);

      const result = await service.getDay('space-1', '2026-10-24');

      expect(result).toHaveProperty('spaceId', 'space-1');
      expect(result.slots).toHaveLength(2);
      
      // Al estar el reloj congelado a las 12:00pm, la franja de 06:00 a 07:00 obligatoriamente es PAST
      expect(result.slots[0].status).toBe('PAST');
      expect(result.slots[0].bookable).toBe(false);
    });
  });

  describe('weekly hours', () => {
    it('lists the saved schedule for a space in weekday order', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });
      const rules = [{ id: 'rule-1', dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }];
      prismaMock.availabilityRule.findMany.mockResolvedValue(rules);

      await expect(service.getWeeklyHours('space-1')).resolves.toBe(rules);
      expect(prismaMock.availabilityRule.findMany).toHaveBeenCalledWith({
        where: { spaceId: 'space-1', kind: AvailabilityKind.WEEKLY_HOURS },
        select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    it('rejects invalid intervals and duplicate weekdays', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });

      await expect(
        service.setWeeklyHours('space-1', { rules: [{ dayOfWeek: 1, startTime: '12:00', endTime: '11:00' }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.setWeeklyHours('space-1', {
          rules: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
            { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('replaces the complete weekly schedule transactionally with per-day rules', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });
      prismaMock.availabilityRule.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.availabilityRule.createMany.mockResolvedValue({ count: 2 });
      prismaMock.availabilityRule.findMany.mockResolvedValue([{ id: 'new-rule' }]);
      const rules = [
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 2, startTime: '10:00', endTime: '16:00' },
      ];

      const result = await service.setWeeklyHours('space-1', { rules });

      expect(prismaMock.availabilityRule.deleteMany).toHaveBeenCalledWith({
        where: { spaceId: 'space-1', kind: AvailabilityKind.WEEKLY_HOURS },
      });
      expect(prismaMock.availabilityRule.createMany).toHaveBeenCalledWith({
        data: rules.map((rule) => ({ ...rule, spaceId: 'space-1', kind: AvailabilityKind.WEEKLY_HOURS })),
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('blocks', () => {
    it('lists blocks that overlap the requested date range', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });
      const blocks = [{ id: 'block-1', reason: 'Mantenimiento' }];
      prismaMock.availabilityRule.findMany.mockResolvedValue(blocks);

      await expect(
        service.listBlocks('space-1', { from: '2026-10-24T00:00:00-05:00', to: '2026-10-25T00:00:00-05:00' }),
      ).resolves.toBe(blocks);
      expect(prismaMock.availabilityRule.findMany).toHaveBeenCalledWith({
        where: {
          spaceId: 'space-1',
          kind: AvailabilityKind.BLOCK,
          startsAt: { not: null, lt: new Date('2026-10-25T00:00:00-05:00') },
          endsAt: { not: null, gt: new Date('2026-10-24T00:00:00-05:00') },
        },
        select: { id: true, startsAt: true, endsAt: true, reason: true },
        orderBy: { startsAt: 'asc' },
      });
    });

    it('rejects invalid date ranges', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });
      await expect(
        service.listBlocks('space-1', { from: '2026-10-25T00:00:00Z', to: '2026-10-24T00:00:00Z' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes only a block belonging to the requested space', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });
      prismaMock.availabilityRule.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.deleteBlock('space-1', 'block-1')).resolves.toBeUndefined();
      expect(prismaMock.availabilityRule.deleteMany).toHaveBeenCalledWith({
        where: { id: 'block-1', spaceId: 'space-1', kind: AvailabilityKind.BLOCK },
      });
    });

    it('returns not found when the block does not belong to the space', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });
      prismaMock.availabilityRule.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.deleteBlock('space-1', 'missing')).rejects.toThrow('Block not found');
    });
  });

  describe('createBlock', () => {
    it('lanza BadRequestException si las fechas de bloqueo son inválidas o inversas (Branch)', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });

      const dto = { startsAt: '2026-10-24T10:00:00Z', endsAt: '2026-10-24T09:00:00Z', reason: 'Fiesta' };
      await expect(service.createBlock('space-1', dto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('assertBookableInterval', () => {
    it('lanza BadRequestException si la reserva cruza la medianoche (Branch)', async () => {
      const { service } = createService();
      
      // Pasamos fechas con diferencias de días enteros locales para forzar la inyección de la excepción nativa
      const start = new Date('2026-10-24T23:00:00.000-05:00');
      const end = new Date('2026-10-25T02:00:00.000-05:00');

      await expect(service.assertBookableInterval('space-1', start, end)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza ConflictException si el intervalo coincide con un bloque bloqueado (Branch)', async () => {
      const { service } = createService();
      
      const mockDayResult = {
        slots: [{
          startsAt: '2026-10-24T14:00:00.000-05:00',
          endsAt: '2026-10-24T15:00:00.000-05:00',
          status: 'BLOCKED' as const,
          bookable: false,
          reason: 'Clase reservada'
        }]
      };

      jest.spyOn(service, 'getDay').mockResolvedValue(mockDayResult as any);

      const start = new Date('2026-10-24T14:00:00.000-05:00');
      const end = new Date('2026-10-24T15:00:00.000-05:00');

      await expect(service.assertBookableInterval('space-1', start, end)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
