import { useEffect, useState } from 'react';
import { ApiError, apiGet } from '../api/http';

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string; httpStatus?: number };

function isEmptyPayload(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0;
}

export function useApiResource<T>(path: string, refreshKey = 0): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    if (!path) {
      setState({
        status: 'error',
        message: 'No encontramos lo que buscabas.',
        httpStatus: 404,
      });
      return;
    }

    setState({ status: 'loading' });

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
        if (error instanceof ApiError) {
          setState({ status: 'error', message: error.message, httpStatus: error.status });
          return;
        }
        setState({
          status: 'error',
          message: 'No hay conexión con el servidor. ¿Está corriendo la API?',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [path, refreshKey]);

  return state;
}
