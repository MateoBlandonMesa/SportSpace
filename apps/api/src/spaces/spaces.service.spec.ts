import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from './spaces.service';

describe('SpacesService', () => {
  function createService() {
    const prisma = {
      space: {
        findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    return {
      service: new SpacesService(prisma as unknown as PrismaService),
      prisma,
    };
  }

  it('lista únicamente espacios activos y aplica los filtros solicitados', async () => {
    const { service, prisma } = createService();
    const spaces = [{ id: 'space-1', name: 'Cancha Norte' }];
    prisma.space.findMany.mockResolvedValue(spaces);

    await expect(
      service.listActive({ campus: 'Principal', type: 'Cancha' }),
    ).resolves.toBe(spaces);

    expect(prisma.space.findMany).toHaveBeenCalledWith({
      where: { isActive: true, campus: 'Principal', type: 'Cancha' },
      orderBy: { name: 'asc' },
    });
  });

  it('lanza NotFoundException si el espacio no existe', async () => {
    const { service, prisma } = createService();
    prisma.space.findUnique.mockResolvedValue(null);

    await expect(service.getById('missing-space')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('recorta los campos de texto al crear un espacio', async () => {
    const { service, prisma } = createService();
    const created = { id: 'space-1', name: 'Cancha Norte' };
    prisma.space.create.mockResolvedValue(created);

    await expect(
      service.create({
        name: ' Cancha Norte ',
        type: ' Cancha ',
        campus: ' Principal ',
        capacity: 10,
        usageRules: ' Reservar con anticipación ',
      }),
    ).resolves.toBe(created);

    expect(prisma.space.create).toHaveBeenCalledWith({
      data: {
        name: 'Cancha Norte',
        type: 'Cancha',
        campus: 'Principal',
        capacity: 10,
        usageRules: 'Reservar con anticipación',
        isActive: true,
      },
    });
  });
});
