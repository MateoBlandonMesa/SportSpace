import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { Role } from '@prisma/client';

describe('JwtStrategy', () => {
  it('debería validar y retornar el payload del token si el usuario existe (Camino Feliz)', async () => {
    const configMock = {
      getOrThrow: jest.fn<() => string>().mockReturnValue('access-secret'),
    };

    // Simulamos la respuesta de la base de datos que busca tu estrategia
    const prismaMock = {
      user: {
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({
          id: 'user-123',
          email: 'test@udea.edu.co',
          role: Role.STUDENT,
        }),
      },
    };

    const strategy = new JwtStrategy(
      configMock as unknown as ConfigService,
      prismaMock as unknown as PrismaService,
    );
    
    const payload = { sub: 'user-123', email: 'test@udea.edu.co', role: Role.STUDENT };
    const result = await strategy.validate(payload);

    expect(prismaMock.user.findUnique).toHaveBeenCalled();
    expect(result).toEqual({ sub: 'user-123', email: 'test@udea.edu.co', role: Role.STUDENT });
  });
});
it('debería lanzar una excepción UnauthorizedException si el usuario no existe en la base de datos (Línea 29+)', async () => {
  const configMock = { getOrThrow: jest.fn<() => string>().mockReturnValue('secret') };
  const prismaMock = { user: { findUnique: jest.fn<() => Promise<null>>().mockResolvedValue(null) } }; // Retorna null

  const strategy = new JwtStrategy(configMock as unknown as ConfigService, prismaMock as unknown as PrismaService);
  
  await expect(strategy.validate({
      sub: 'user-999',
      email: '',
      role: 'STUDENT'
  })).rejects.toThrow();
});
