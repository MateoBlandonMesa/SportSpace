import { Controller, Get, Post, Body, Res, HttpCode, HttpStatus, UseGuards, Req} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Rate limit: máximo 5 intentos por minuto
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(dto);
    const tokens = await this.authService.generateTokens(user.id, user.email, user.role);

    // Inyección de Refresh Token en Cookie HttpOnly
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/api/v1/auth',
    });

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request & { user: { sub: string, email: string, role: string } },
    @Res({ passthrough: true }) response: Response,
  ) {
    // Aquí ya puedes usar req.user.sub de forma segura si necesitas registrar el evento de salida
    response.clearCookie('refreshToken', { path: '/api/v1/auth' });
    return { message: 'Sesión cerrada correctamente.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request & { user: any }) {
    // req.user contiene el payload que devolvió tu JwtStrategy (sub, email, role)
    return {
      message: 'Acceso autorizado a la ruta protegida',
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN') // <--- Solo los usuarios con rol ADMIN podrán entrar aquí
  @Get('admin-dashboard')
  getAdminDashboard(@Req() req: Request & { user: any }) {
    return {
      message: 'Bienvenido al panel de administración exclusivo para ADMINS',
      adminUser: req.user,
    };
  }


}