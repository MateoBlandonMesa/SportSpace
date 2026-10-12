import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Space } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { ListSpacesQueryDto } from './dto/list-spaces-query.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  listActive(query: ListSpacesQueryDto): Promise<Space[]> {
    return this.prisma.space.findMany({
      where: {
        isActive: true,
        ...(query.campus ? { campus: query.campus } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string): Promise<Space> {
    const space = await this.prisma.space.findUnique({ where: { id } });
    if (!space) {
      throw new NotFoundException('Space not found');
    }
    return space;
  }

  async requireActive(id: string): Promise<Space> {
    const space = await this.getById(id);
    if (!space.isActive) {
      throw new NotFoundException('Space is not available for new reservations');
    }
    return space;
  }

  create(dto: CreateSpaceDto): Promise<Space> {
    return this.prisma.space.create({
      data: {
        name: dto.name.trim(),
        type: dto.type.trim(),
        campus: dto.campus.trim(),
        capacity: dto.capacity,
        usageRules: dto.usageRules.trim(),
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<Space> {
    await this.getById(id);
    const data: Prisma.SpaceUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.type !== undefined) {
      data.type = dto.type.trim();
    }
    if (dto.campus !== undefined) {
      data.campus = dto.campus.trim();
    }
    if (dto.capacity !== undefined) {
      data.capacity = dto.capacity;
    }
    if (dto.usageRules !== undefined) {
      data.usageRules = dto.usageRules.trim();
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return this.prisma.space.update({
      where: { id },
      data,
    });
  }
}
