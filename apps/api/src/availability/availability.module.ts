import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AvailabilityController } from './availability.controller';

@Module({
  imports: [AuthModule],
  controllers: [AvailabilityController],
})
export class AvailabilityModule {}
