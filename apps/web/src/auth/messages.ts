import { ApiError } from '../api/http';

const INSTITUTIONAL_EMAIL = /@udea\.edu\.co$/i;
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isInstitutionalEmail(email: string): boolean {
  return INSTITUTIONAL_EMAIL.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_POLICY.test(password);
}

export function toAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
    }

    const raw = error.message.toLowerCase();
    if (raw.includes('udea.edu.co') || raw.includes('registration is limited')) {
      return 'Solo se admiten correos institucionales @udea.edu.co.';
    }
    if (raw.includes('already registered')) {
      return 'Este correo ya está registrado.';
    }
    if (raw.includes('password') || raw.includes('letters and numbers')) {
      return 'La contraseña debe tener al menos 8 caracteres, con letras y números.';
    }
    if (error.status === 401) {
      return 'Correo o contraseña incorrectos.';
    }
    if (error.status === 400) {
      return 'Revisa los datos del formulario.';
    }
  }

  return 'No se pudo completar la solicitud. Inténtalo de nuevo.';
}
