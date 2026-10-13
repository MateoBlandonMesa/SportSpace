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

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, value);
  } catch {
    // Private mode or disabled storage: keep the in-memory value only.
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  writeStorage(ACCESS_TOKEN_KEY, token);
}

export function getStoredUser(): AuthUser | null {
  const raw = readStorage(USER_KEY);
  if (!raw) {
    return null;
  }

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
