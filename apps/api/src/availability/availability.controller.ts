import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('spaces/:spaceId/availability')
export class AvailabilityController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getBySpace(@Param('spaceId') _spaceId: string) {
    return [];
  }
}
