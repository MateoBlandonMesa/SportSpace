import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SpacesController } from './spaces.controller';

@Module({
  imports: [AuthModule],
  controllers: [SpacesController],
})
export class SpacesModule {}
