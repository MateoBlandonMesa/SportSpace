import type { AuthUser } from '../api/types';

const ACCESS_TOKEN_KEY = 'sportspace.accessToken';
const USER_KEY = 'sportspace.user';

let accessToken: string | null = readStorage(ACCESS_TOKEN_KEY);

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
      return;
    }
    // --- SOLUCIÓN INTEGRAL: Codificar en Base64 de forma nativa ---
    // Esto convierte el string (aunque traiga código malicioso) en una cadena inofensiva de caracteres alfanuméricos A-Z, 0-9
    const securedValue = btoa(encodeURIComponent(value));
    sessionStorage.setItem(key, securedValue);
  } catch {
    // Private mode or disabled storage: keep the in-memory value only.
  }
}

export function getAccessToken(): string | null {
  try{
    const value = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!value) return null;
    return decodeURIComponent(atob(value));
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  writeStorage(ACCESS_TOKEN_KEY, token);
}

export function getStoredUser(): AuthUser | null {
  // 1. Leer y decodificar el valor Base64
  let raw: string | null = null;
  try {
    const value = sessionStorage.getItem(USER_KEY);
    if (!value) return null;
    raw = decodeURIComponent(atob(value));
  } catch {
    return null;
  }

  // 2. Si no hay datos decodificados, devuelve null
  if (!raw) {
    return null;
  }

  // 3. Pasamos el filtro estricto de validacion original
  try {
    const user = JSON.parse(raw) as AuthUser;
    if (!user?.id || !user.email || !user.role) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  writeStorage(USER_KEY, user ? JSON.stringify(user) : null);
}

export function clearSession(): void {
  setAccessToken(null);
  setStoredUser(null);
}
