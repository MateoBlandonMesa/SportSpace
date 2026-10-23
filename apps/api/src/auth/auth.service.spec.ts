import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user-1',
    name: 'Ada Lovelace',
    email: 'ada@example.edu',
    passwordHash: 'stored-hash',
    role: Role.STUDENT,
    refreshToken: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  function createService() {
    const prisma = {
      user: {
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      {} as JwtService,
      {} as ConfigService,
    );
    return { service, prisma };
  }

  it('registra al usuario con email normalizado y nombre sin espacios externos', async () => {
    const { service, prisma } = createService();
    const hashSpy = jest.spyOn(argon2, 'hash').mockResolvedValue('new-hash');
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });

    await expect(
      service.register({
        name: '  Ada Lovelace  ',
        email: 'ADA@EXAMPLE.EDU',
        password: 'strong-password',
      }),
    ).resolves.toMatchObject({ id: user.id, email: user.email });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: user.email },
    });
    expect(hashSpy).toHaveBeenCalledWith('strong-password', {
      type: argon2.argon2id,
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: user.name,
          email: user.email,
          passwordHash: 'new-hash',
          role: Role.STUDENT,
        }),
      }),
    );
    hashSpy.mockRestore();
  });

  it('rechaza el registro si el email ya existe', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.register({
        name: user.name,
        email: user.email,
        password: 'strong-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rechaza el inicio de sesión si no encuentra el usuario', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.edu', password: 'password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza la renovación si no se proporciona refresh token', async () => {
    const { service, prisma } = createService();

    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
