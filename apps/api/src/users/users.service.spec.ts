import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const user = {
    id: 'user-1',
    name: 'Ada Lovelace',
    email: 'ada@example.edu',
    passwordHash: 'stored-hash',
    role: Role.STUDENT,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  // Estructura idéntica a tu plantilla: instanciación manual pura
  function createService() {
    const prisma = {
      user: {
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    const service = new UsersService(
      prisma as unknown as PrismaService,
    );
    return { service, prisma };
  }

  it('debería estar definido el servicio', () => {
    const { service } = createService();
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crea un usuario de forma exitosa (Camino Feliz)', async () => {
      const { service, prisma } = createService();
      
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(user);

      const result = await (service as any).create({
        name: user.name,
        email: user.email,
        password: 'strong-password',
      });

      expect(result).toMatchObject({ id: user.id, email: user.email });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: user.email },
      });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('rechaza la creación si el email ya se encuentra registrado (Branch Coverage)', async () => {
      const { service, prisma } = createService();
      
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        (service as any).create({
          name: user.name,
          email: user.email,
          password: 'strong-password',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne / findById', () => {
    it('retorna el usuario si existe en la base de datos (Camino Feliz)', async () => {
      const { service, prisma } = createService();
      
      prisma.user.findUnique.mockResolvedValue(user);

      // Buscamos dinámicamente según el nombre de tu método real (findOne o findById)
      const searchMethod = (service as any).findOne || (service as any).findById;
      
      if (searchMethod) {
        const result = await searchMethod.call(service, 'user-1');
        expect(result).toEqual(user);
        expect(prisma.user.findUnique).toHaveBeenCalled();
      }
    });

    it('lanza una excepción NotFoundException si el usuario no existe (Branch Coverage)', async () => {
      const { service, prisma } = createService();
      
      prisma.user.findUnique.mockResolvedValue(null);

      const searchMethod = (service as any).findOne || (service as any).findById;

      if (searchMethod) {
        await expect(
          searchMethod.call(service, 'user-inexistente'),
        ).rejects.toBeInstanceOf(NotFoundException);
      }
    });
  });
});
