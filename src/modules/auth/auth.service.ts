import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DatabaseService } from '../../database/database.service'; // Tu servicio de Prisma
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.db.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('El correo institucional ya se encuentra registrado.');
    }

    // Hash de la contraseña con Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const newUser = await this.db.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: Role.STUDENT,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return newUser;
  }

  async validateUser(dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Respuesta genérica para evitar enumeración de usuarios
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return user;
  }

  async generateTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
      } as any),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      } as any),
    ]);

    // Guardar Refresh Token hasheado en BD para revocación opcional
    const refreshTokenHash = await argon2.hash(refreshToken, { type: argon2.argon2id });
    await this.db.user.update({
      where: { id: userId },
      data: { refreshToken: refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }
/*
///////////////////////////////////////////////////////////////////////
async refreshToken(refreshToken: string){
  try {
      // 1. Verificar la firma y vigencia del refresh token usando su secreto específico
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // 2. Buscar al usuario en la base de datos
      const user = await this.db.user.findUnique({
        where: { id: payload.sub },
      });

      // 3. Validar que el usuario exista y que su refreshToken en BD coincida con el enviado
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token inválido o revocado');
      }

      // 4. Generar un NUEVO Access Token
      const newAccessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRATION || '1m',
        },
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException('Refresh token expirado o inválido');
    }
  }
  ///////////////////////////////////////////////////////////////////////
  */
  async logout(userId: string) {
    await this.db.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

}