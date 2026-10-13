import { ApiError } from '../api/http';
import type { Role } from '../api/types';

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Estudiante',
  STAFF: 'Staff',
  ADMIN: 'Administrador',
};

export function toRoleErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'Solo un administrador puede gestionar roles.';
    }
    if (error.status === 404) {
      return 'No encontramos ese usuario.';
    }
    const raw = error.message.toLowerCase();
    if (error.status === 409 || raw.includes('last administrator')) {
      return 'No se puede dejar el sistema sin un administrador.';
    }
    if (error.status === 400) {
      return 'Revisa el rol seleccionado e inténtalo de nuevo.';
    }
  }

  return 'No hay conexión con el servidor. ¿Está corriendo la API?';
}
