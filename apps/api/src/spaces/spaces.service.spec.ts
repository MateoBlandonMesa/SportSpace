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
  });

  // --- NUEVA PRUEBA 1: requireActive lanza excepción si la cancha está inactiva (Líneas 28-36) ---
  it('lanza NotFoundException en requireActive si el espacio existe pero no está activo', async () => {
    const { service, prisma } = createService();
    // Simulamos que el espacio se encuentra, pero su flag isActive es falso
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1', isActive: false });

    await expect(service.requireActive('space-1')).rejects.toThrow(
      'Space is not available for new reservations',
    );
  });

  // --- NUEVA PRUEBA 2: requireActive pasa exitosamente si la cancha está activa ---
  it('retorna el espacio en requireActive si existe y se encuentra activo', async () => {
    const { service, prisma } = createService();
    const activeSpace = { id: 'space-1', isActive: true };
    prisma.space.findUnique.mockResolvedValue(activeSpace);

    const result = await service.requireActive('space-1');
    expect(result).toEqual(activeSpace);
  });

  // --- NUEVA PRUEBA 3: Recorrer todas las bifurcaciones lógicas de actualización (Líneas 53-74) ---
  it('construye correctamente el payload mapeando las propiedades pasadas en el DTO de actualización', async () => {
    const { service, prisma } = createService();
    const existing = { id: 'space-1', isActive: true, name: 'Viejo Nombre' };
    
    prisma.space.findUnique.mockResolvedValue(existing);
    prisma.space.update.mockResolvedValue({ ...existing, name: 'Nuevo Nombre' });

    const dto = {
      name: '  Cancha Sintética  ',
      type: 'Fútbol',
      isActive: false
    };

    await service.update('space-1', dto);

    // Verificamos que se ejecutó el .trim() de las cadenas y se inyectaron los flags lógicos
    expect(prisma.space.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: {
        name: 'Cancha Sintética',
        type: 'Fútbol',
        isActive: false
      }
    });
  });
});
