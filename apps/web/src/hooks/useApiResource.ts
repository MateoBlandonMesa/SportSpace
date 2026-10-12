import { useEffect, useState } from 'react';
import { ApiError, apiGet } from '../api/http';

type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function isEmptyPayload(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0;
}

export function useApiResource<T>(path: string): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    apiGet<T>(path)
      .then((data) => {
        if (cancelled) {
          return;
        }
        if (isEmptyPayload(data)) {
          setState({ status: 'empty' });
          return;
        }
        setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof ApiError
            ? error.message
            : 'No hay conexión con el servidor. ¿Está corriendo la API?';
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
