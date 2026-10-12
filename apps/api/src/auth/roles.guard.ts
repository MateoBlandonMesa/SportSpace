import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // Stub for session 0. Carlos replaces this with role checks on feat/auth.
    return true;
  }
}
