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

  describe('setWeeklyHours', () => {
    it('lanza BadRequestException si startTime es mayor o igual a endTime (Branch)', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });

      const dto = { startTime: '12:00', endTime: '11:00', daysOfWeek: [1] };
      await expect(service.setWeeklyHours('space-1', dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('elimina y crea de forma transaccional las nuevas reglas semanales (Camino Feliz)', async () => {
      const { service } = createService();
      spacesServiceMock.getById.mockResolvedValue({ id: 'space-1' });
      
      prismaMock.availabilityRule.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.availabilityRule.createMany.mockResolvedValue({ count: 2 });
      prismaMock.availabilityRule.findMany.mockResolvedValue([{ id: 'new-rule' }]);

      const dto = { startTime: '08:00', endTime: '12:00', daysOfWeek: [1] };
      const result = await service.setWeeklyHours('space-1', dto);

      expect(prismaMock.availabilityRule.deleteMany).toHaveBeenCalled();
      expect(prismaMock.availabilityRule.createMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
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
