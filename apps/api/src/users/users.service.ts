import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = { id: true, name: true, email: true, role: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
