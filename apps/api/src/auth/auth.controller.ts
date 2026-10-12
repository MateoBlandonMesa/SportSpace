import { Controller, Get } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Get('status')
  getStatus() {
    return { implemented: false, owner: 'Carlos' };
  }
}
