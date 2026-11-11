import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = { id: true, name: true, email: true, role: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. IMPLEMENTACIÓN REAL DEL MÉTODO DE BÚSQUEDA POR ID
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // 2. IMPLEMENTACIÓN REAL DEL MÉTODO DE CREACIÓN (Evita la inyección de duplicados)
  async create(dto: { email: string; name: string; password?: string }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    return await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: dto.password || 'default-hash',
      },
      select: USER_SELECT,
    });
  }

  // 3. TUS MÉTODOS ORIGINALES SE QUEDAN EXACTAMENTE IGUAL
  list() {
    return this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async updateRole(actor: JwtPayload, id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === role) {
      return this.prisma.user.findUniqueOrThrow({ where: { id }, select: USER_SELECT });
    }

    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) {
        throw new ConflictException('Cannot demote the last administrator');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role },
        select: USER_SELECT,
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.sub,
          entityType: 'User',
          entityId: id,
          fromValue: user.role,
          toValue: role,
        },
      });
      return updated;
    });
  }
}
