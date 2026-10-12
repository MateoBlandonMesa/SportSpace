import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // Stub for session 0. Carlos replaces this with JWT validation on feat/auth.
    return true;
  }
}
