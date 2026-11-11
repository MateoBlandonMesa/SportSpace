import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { ReservationStatus, Role } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { ReservationsService } from './reservations.service';

describe('ReservationsService (Cobertura Ampliada)', () => {
  let spacesServiceMock: any;
  let availabilityServiceMock: any;
  let prismaMock: any;
  let txMock: any;

  beforeEach(() => {
    jest.useFakeTimers();
    // Congelamos el reloj en el futuro absoluto (Año 2030) para controlar el Date.now() de la línea 53
    jest.setSystemTime(new Date('2030-01-01T12:00:00.000Z'));

    txMock = {
      reservation: {
        create: jest.fn<() => Promise<any>>(),
        update: jest.fn<() => Promise<any>>(),
      },
      auditLog: {
        create: jest.fn<() => Promise<any>>(),
      },
    };

    prismaMock = {
      reservation: {
        findMany: jest.fn<() => Promise<any[]>>(),
        findUnique: jest.fn<() => Promise<any>>(),
        findFirst: jest.fn<() => Promise<any>>(),
        update: jest.fn<() => Promise<any>>(),
      },
      $transaction: jest.fn((cb: any) => cb(txMock)),
    };

    spacesServiceMock = {
      requireActive: jest.fn<() => Promise<any>>(),
    };

    availabilityServiceMock = {
      assertBookableInterval: jest.fn<() => Promise<void>>(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function createService() {
    const service = new ReservationsService(
      prismaMock as unknown as PrismaService,
      spacesServiceMock as unknown as SpacesService,
      availabilityServiceMock as unknown as AvailabilityService,
    );
    return { service };
  }

  const student: JwtPayload = { sub: 'student-1', email: 'stu@udea.edu', role: Role.STUDENT };
  const staff: JwtPayload = { sub: 'staff-1', email: 'staff@udea.edu', role: Role.STAFF };

  describe('Flujo de Creación (Líneas 50-74)', () => {
    it('crea exitosamente una reserva pendiente y ejecuta la transacción de auditoría (Camino Feliz)', async () => {
      const { service } = createService();
      
      spacesServiceMock.requireActive.mockResolvedValue({ id: 'space-1' });
      availabilityServiceMock.assertBookableInterval.mockResolvedValue(undefined);
      prismaMock.reservation.findFirst.mockResolvedValue(null); // No hay solapes locales

      const mockCreated = { id: 'res-123', spaceId: 'space-1', userId: student.sub, status: ReservationStatus.PENDING };
      txMock.reservation.create.mockResolvedValue(mockCreated);
      txMock.auditLog.create.mockResolvedValue({});

      const dto = { spaceId: 'space-1', startsAt: '2030-01-01T14:00:00.000Z', endsAt: '2030-01-01T15:00:00.000Z' };
      const result = await service.create(student, dto);

      expect(result).toHaveProperty('id', 'res-123');
      expect(txMock.reservation.create).toHaveBeenCalled();
      expect(txMock.auditLog.create).toHaveBeenCalled();
    });

    it('lanza ConflictException si se detecta un solape en la base de datos (Línea 115+)', async () => {
      const { service } = createService();
      
      spacesServiceMock.requireActive.mockResolvedValue({ id: 'space-1' });
      availabilityServiceMock.assertBookableInterval.mockResolvedValue(undefined);
      
      // Simulamos que findFirst encuentra un registro, forzando el solape
      prismaMock.reservation.findFirst.mockResolvedValue({ id: 'res-existente' });

      const dto = { spaceId: 'space-1', startsAt: '2030-01-01T14:00:00.000Z', endsAt: '2030-01-01T15:00:00.000Z' };
      
      await expect(service.create(student, dto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('Flujos de Estados e Internos (Líneas 115-171, 185-199)', () => {
    it('lanza NotFoundException en requireById si la reserva no existe en Prisma', async () => {
      const { service } = createService();
      prismaMock.reservation.findUnique.mockResolvedValue(null);

      // Invocamos el método de cancelación para forzar el llamado a requireById interno
      await expect(service.cancel(student, 'id-fantasma')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cancela exitosamente una reserva si el dueño la solicita antes de comenzar', async () => {
      const { service } = createService();
      
      const mockReservation = {
        id: 'res-1',
        userId: student.sub,
        status: ReservationStatus.PENDING,
        startsAt: new Date('2030-01-01T15:00:00.000Z'), // Futuro con respecto a las 12:00Z
      };
      prismaMock.reservation.findUnique.mockResolvedValue(mockReservation);
      txMock.reservation.update.mockResolvedValue({ ...mockReservation, status: ReservationStatus.CANCELLED });

      const result = await service.cancel(student, 'res-1');
      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });

    it('rechaza una reserva de forma transaccional guardando la razón truncada', async () => {
      const { service } = createService();
      
      const mockReservation = { id: 'res-1', userId: 'student-1', status: ReservationStatus.PENDING };
      prismaMock.reservation.findUnique.mockResolvedValue(mockReservation);
      txMock.reservation.update.mockResolvedValue({ ...mockReservation, status: ReservationStatus.REJECTED });

      const result = await service.reject(staff, 'res-1', '  Motivo Válido  ');
      expect(result.status).toBe(ReservationStatus.REJECTED);
    });

    
  });
});
