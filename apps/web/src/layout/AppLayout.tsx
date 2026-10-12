import { NavLink, Outlet } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource';
import type { HealthResponse } from '../api/types';

export function AppLayout() {
  const health = useApiResource<HealthResponse>('/health');
  const apiReady = health.status === 'success' && health.data.status === 'ok';

  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>SportSpace</strong>
        <nav>
          <NavLink to="/spaces">Espacios</NavLink>
          <NavLink to="/my-reservations">Mis reservas</NavLink>
          <NavLink to="/admin">Administración</NavLink>
          <NavLink to="/login">Iniciar sesión</NavLink>
        </nav>
        <span className={apiReady ? 'api-status api-status--ok' : 'api-status'}>
          {apiReady ? 'API conectada' : 'API no disponible'}
        </span>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
