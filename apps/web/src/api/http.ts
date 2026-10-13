import { clearSession, getAccessToken, setAccessToken } from '../auth/session';
import type { RefreshResponse } from './types';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

type UnauthorizedListener = () => void;

let unauthorizedListener: UnauthorizedListener | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setOnUnauthorized(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as RefreshResponse;
      setAccessToken(payload.accessToken);
      return payload.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function shouldRetryWithRefresh(path: string, status: number): boolean {
  return (
    status === 401 &&
    path !== '/auth/login' &&
    path !== '/auth/register' &&
    path !== '/auth/refresh'
  );
}

async function apiRequest<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = getAccessToken();
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...rest,
  });

  if (response.status === 401 && !isRetry && shouldRetryWithRefresh(path, response.status)) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return apiRequest<T>(path, options, true);
    }
    clearSession();
    unauthorizedListener?.();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message.join(' ');
    }
  } catch {
    // Ignore non-JSON error bodies.
  }

  if (response.status === 401) {
    return 'Necesitas iniciar sesión para continuar.';
  }
  if (response.status === 403) {
    return 'No tienes permiso para esta acción.';
  }
  if (response.status === 404) {
    return 'No encontramos lo que buscabas.';
  }

  return 'No se pudo completar la solicitud. Inténtalo de nuevo.';
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}
