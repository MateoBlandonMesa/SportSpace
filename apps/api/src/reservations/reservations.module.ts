import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReservationsController } from './reservations.controller';

@Module({
  imports: [AuthModule],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
