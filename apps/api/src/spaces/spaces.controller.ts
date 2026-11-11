import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSpaceDto } from './dto/create-space.dto';
import { ListSpacesQueryDto } from './dto/list-spaces-query.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpacesService } from './spaces.service';

type AuthedRequest = { user: JwtPayload };

@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() request: AuthedRequest, @Query() query: ListSpacesQueryDto) {
    return this.spacesService.list(query, request.user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.spacesService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  create(@Body() dto: CreateSpaceDto) {
    return this.spacesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(id, dto);
  }
}
