import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reservations')
export class ReservationsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  listMine() {
    return [];
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create() {
    return { implemented: false, owner: 'Dilan' };
  }
}
