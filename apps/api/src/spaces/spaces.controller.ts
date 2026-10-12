import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('spaces')
export class SpacesController {
  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return [];
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  create() {
    return { implemented: false, owner: 'Dilan' };
  }
}
