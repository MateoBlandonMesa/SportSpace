import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { useApiResource } from './hooks/useApiResource';
import { App } from './App';

jest.mock('./auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: jest.fn(),
}));
jest.mock('./hooks/useApiResource', () => ({ useApiResource: jest.fn() }));
const auth = jest.mocked(useAuth);
const resource = jest.mocked(useApiResource);
const logout = jest.fn<() => Promise<void>>();

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockReturnValue({
    status: 'authenticated',
    user: { id: '1', name: 'Ana', email: 'ana@udea.edu.co', role: 'ADMIN' },
    login: async () => {}, register: async () => {}, logout,
  });
  resource.mockReturnValue({ status: 'loading' });
});
function show(path: string) {
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>,
  );
}

describe('Application routes', () => {
  it('redirects the root to the catalogue and provides logout', () => {
    show('/');
    expect(resource).toHaveBeenCalledWith('/spaces');
    expect(screen.getByText('API no disponible')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
  it.each(['/login', '/register'])('redirects an authenticated guest from %s', (path) => {
    show(path);
    expect(screen.getByRole('heading', { name: 'Espacios deportivos' })).toBeTruthy();
  });
  it('sends anonymous users to login', () => {
    auth.mockReturnValue({ ...auth(), status: 'anonymous', user: null });
    show('/admin/spaces');
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
  });
  it('renders registration for an anonymous visitor', () => {
    auth.mockReturnValue({ ...auth(), status: 'anonymous', user: null });
    show('/register');
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeTruthy();
  });
  it('shows the restored API health and selected administrative section', () => {
    resource.mockReturnValue({ status: 'success', data: { status: 'ok' } });
    // Only health succeeds. The selected roles section remains in its loading state.
    const loading = { status: 'loading' as const };
    resource.mockImplementation(<T,>(path: string) => path === '/health'
      ? { status: 'success', data: { status: 'ok' } as T }
      : loading);
    show('/admin/roles');
    expect(screen.getByText('API conectada')).toBeTruthy();
    expect(screen.getByText('Cargando usuarios…')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Roles' })).toBeTruthy();
  });
  it.each(['STAFF', 'STUDENT'] as const)('limits administrative navigation for %s', (role) => {
    auth.mockReturnValue({ ...auth(), user: { ...auth().user!, role } });
    show('/admin');
    if (role === 'STUDENT') {
      expect(screen.getByRole('alert').textContent).toContain('No tienes permiso');
      expect(screen.queryByRole('link', { name: 'Administración' })).toBeNull();
    } else {
      expect(resource).toHaveBeenCalledWith('/reservations', 0);
      expect(screen.queryByRole('link', { name: 'Roles' })).toBeNull();
    }
  });
  it('renders the not found page for an unknown route', () => {
    show('/unknown');
    expect(screen.getByRole('heading')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  });
});
