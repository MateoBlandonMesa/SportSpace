import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SpacesModule } from '../spaces/spaces.module';
import { OccupancyController } from './occupancy.controller';
import { OccupancyService } from './occupancy.service';

@Module({
  imports: [AuthModule, SpacesModule],
  controllers: [OccupancyController],
  providers: [OccupancyService],
})
export class OccupancyModule {}
