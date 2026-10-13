import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt.strategy';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    response.cookie('refreshToken', result.refreshToken, this.authService.getRefreshCookieOptions());
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(request.cookies?.refreshToken);
    response.cookie('refreshToken', result.refreshToken, this.authService.getRefreshCookieOptions());
    return { accessToken: result.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() request: AuthedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.user.sub);
    response.clearCookie('refreshToken', this.authService.getRefreshCookieOptions());
    return { message: 'Signed out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() request: AuthedRequest) {
    return { user: request.user };
  }
}
