import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { RejectReservationDto } from './dto/reject-reservation.dto';
import { ReservationsService } from './reservations.service';

type AuthedRequest = { user: JwtPayload };

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() request: AuthedRequest) {
    return this.reservationsService.list(request.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Req() request: AuthedRequest, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(request.user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Req() request: AuthedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.reservationsService.cancel(request.user, id);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  approve(
    @Req() request: AuthedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.reservationsService.approve(request.user, id);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  reject(
    @Req() request: AuthedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectReservationDto,
  ) {
    return this.reservationsService.reject(request.user, id, dto.reason);
  }
}
