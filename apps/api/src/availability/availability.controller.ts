import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { ListBlocksQueryDto } from './dto/list-blocks-query.dto';
import { SetWeeklyHoursDto } from './dto/set-weekly-hours.dto';

@Controller('spaces/:spaceId/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getBySpace(
    @Param('spaceId', new ParseUUIDPipe({ version: '4' })) spaceId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.availabilityService.getDay(spaceId, query.date);
  }

  @Get('weekly-hours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  getWeeklyHours(@Param('spaceId', new ParseUUIDPipe({ version: '4' })) spaceId: string) {
    return this.availabilityService.getWeeklyHours(spaceId);
  }

  @Put('weekly-hours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  setWeeklyHours(
    @Param('spaceId', new ParseUUIDPipe({ version: '4' })) spaceId: string,
    @Body() dto: SetWeeklyHoursDto,
  ) {
    return this.availabilityService.setWeeklyHours(spaceId, dto);
  }

  @Get('blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  listBlocks(
    @Param('spaceId', new ParseUUIDPipe({ version: '4' })) spaceId: string,
    @Query() query: ListBlocksQueryDto,
  ) {
    return this.availabilityService.listBlocks(spaceId, query);
  }

  @Post('blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  createBlock(
    @Param('spaceId', new ParseUUIDPipe({ version: '4' })) spaceId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.availabilityService.createBlock(spaceId, dto);
  }

  @Delete('blocks/:blockId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBlock(
    @Param('spaceId', new ParseUUIDPipe({ version: '4' })) spaceId: string,
    @Param('blockId', new ParseUUIDPipe({ version: '4' })) blockId: string,
  ) {
    return this.availabilityService.deleteBlock(spaceId, blockId);
  }
}
