import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
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
    refreshToken: 'hashed-refresh-token',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let jwtServiceMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    jwtServiceMock = {
      signAsync: jest.fn<() => Promise<string>>().mockResolvedValue('mock-token'),
      verifyAsync: jest.fn<() => Promise<any>>(),
    };

    configServiceMock = {
      getOrThrow: jest.fn<(key: string) => string>().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        throw new Error('Missing secret');
      }),
      get: jest.fn<(key: string) => string>().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return '';
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );
    return { service, prisma };
  }

  it('debería retornar las opciones de cookies de refresh de forma correcta', () => {
    const { service } = createService();
    const options = service.getRefreshCookieOptions();
    expect(options).toHaveProperty('path', '/api/auth');
    expect(options).toHaveProperty('httpOnly', true);
  });

  describe('Registro', () => {
    it('registra al usuario con email normalizado y nombre sin espacios externos', async () => {
      const { service, prisma } = createService();
      const hashSpy = jest.spyOn(argon2, 'hash').mockResolvedValue('new-hash');
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(user);

      await expect(
        service.register({
          name: '  Ada Lovelace  ',
          email: 'ADA@EXAMPLE.EDU',
          password: 'strong-password',
        }),
      ).resolves.toMatchObject({ id: user.id, email: user.email });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: user.email } });
      hashSpy.mockRestore();
    });

    it('rechaza el registro si el email ya existe', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.register({ name: user.name, email: user.email, password: 'strong-password' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('Inicio de Sesión (Login)', () => {
    it('inicia sesión correctamente si las credenciales son válidas (Camino Feliz completo)', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(user);
      
      const verifySpy = jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      const hashSpy = jest.spyOn(argon2, 'hash').mockResolvedValue('new-refresh-hash');
      prisma.user.update.mockResolvedValue(user);

      const result = await service.login({ email: user.email, password: 'strong-password' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(user.email);
      
      verifySpy.mockRestore();
      hashSpy.mockRestore();
    });

    it('rechaza el inicio de sesión si no encuentra el usuario', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.edu', password: 'password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza el inicio de sesión si la contraseña no coincide', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(user);
      const verifySpy = jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      verifySpy.mockRestore();
    });
  });

  describe('Renovación de Tokens (Refresh)', () => {
    it('rechaza la renovación si no se proporciona refresh token', async () => {
      const { service } = createService();
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza si el token de refresco está alterado o expiró (Branch Excepción)', async () => {
      const { service } = createService();
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Jwt expired'));

      await expect(service.refresh('token-invalido')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lanza excepción si el usuario recuperado no tiene guardado un token de sesión', async () => {
      const { service, prisma } = createService();
      jwtServiceMock.verifyAsync.mockResolvedValue({ sub: user.id });
      prisma.user.findUnique.mockResolvedValue({ ...user, refreshToken: null });

      await expect(service.refresh('token-valido')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza si el token no pasa la validación criptográfica de argon2', async () => {
      const { service, prisma } = createService();
      jwtServiceMock.verifyAsync.mockResolvedValue({ sub: user.id });
      prisma.user.findUnique.mockResolvedValue(user);
      
      const verifySpy = jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(service.refresh('token-incorrecto')).rejects.toBeInstanceOf(UnauthorizedException);
      verifySpy.mockRestore();
    });

    it('renueva los tokens exitosamente si la firma y la sesión coinciden (Camino Feliz)', async () => {
      const { service, prisma } = createService();
      jwtServiceMock.verifyAsync.mockResolvedValue({ sub: user.id });
      prisma.user.findUnique.mockResolvedValue(user);
      
      const verifySpy = jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      const hashSpy = jest.spyOn(argon2, 'hash').mockResolvedValue('new-refresh-hash');
      prisma.user.update.mockResolvedValue(user);

      const result = await service.refresh('token-de-refresco-valido');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      
      verifySpy.mockRestore();
      hashSpy.mockRestore();
    });
  });

  describe('Cierre de Sesión (Logout)', () => {
    it('debería limpiar el token de refresco de la base de datos', async () => {
      const { service, prisma } = createService();
      prisma.user.update.mockResolvedValue(user);

      await service.logout(user.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { refreshToken: null },
      });
    });
  });
});
