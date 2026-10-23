import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { ReservationStatus, Role } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  function createService() {
    const tx = {
      reservation: {
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
      auditLog: {
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    const prisma = {
      reservation: {
        findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const spacesService = { requireActive: jest.fn() };
    const availabilityService = { assertBookableInterval: jest.fn() };
    const service = new ReservationsService(
      prisma as unknown as PrismaService,
      spacesService as unknown as SpacesService,
      availabilityService as unknown as AvailabilityService,
    );
    return { service, prisma, tx, spacesService, availabilityService };
  }

  const student: JwtPayload = {
    sub: 'student-1',
    email: 'student@example.edu',
    role: Role.STUDENT,
  };

  it('rechaza una reserva cuyo final ocurre antes de su inicio', async () => {
    const { service, spacesService } = createService();

    await expect(
      service.create(student, {
        spaceId: 'space-1',
        startsAt: '2030-01-01T11:00:00.000Z',
        endsAt: '2030-01-01T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(spacesService.requireActive).not.toHaveBeenCalled();
  });

  it('impide que un estudiante apruebe una reserva', async () => {
    const { service, prisma } = createService();

    await expect(service.approve(student, 'reservation-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.reservation.findUnique).not.toHaveBeenCalled();
  });

  it('aprueba una reserva pendiente y registra la auditoría', async () => {
    const { service, prisma, tx } = createService();
    const reservation = {
      id: 'reservation-1',
      userId: student.sub,
      status: ReservationStatus.PENDING,
      startsAt: new Date('2030-01-01T10:00:00.000Z'),
      endsAt: new Date('2030-01-01T11:00:00.000Z'),
    };
    const updated = { ...reservation, status: ReservationStatus.APPROVED };
    prisma.reservation.findUnique.mockResolvedValue(reservation);
    tx.reservation.update.mockResolvedValue(updated);
    tx.auditLog.create.mockResolvedValue({});

    await expect(
      service.approve(
        { ...student, sub: 'staff-1', role: Role.STAFF },
        reservation.id,
      ),
    ).resolves.toBe(updated);

    expect(tx.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: reservation.id },
        data: { status: ReservationStatus.APPROVED },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'staff-1',
          entityId: reservation.id,
          fromValue: ReservationStatus.PENDING,
          toValue: ReservationStatus.APPROVED,
        }),
      }),
    );
  });
});
