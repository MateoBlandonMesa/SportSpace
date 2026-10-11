import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../../database/database.module'; // Ajusta la ruta según tu estructura
import { JwtStrategy } from './strategies/jwt.strategy';
import { ThrottlerModule } from '@nestjs/throttler';
@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { 
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION') || '1m' 
        } as any,
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Ventana de tiempo: 1 minuto
        limit: 5,   // Límite estricto de intentos para prevenir fuerza bruta en login (RNF-03)
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {} 
