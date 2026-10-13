import { NavLink, Outlet } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource';
import type { HealthResponse } from '../api/types';
import { useAuth } from '../auth/AuthProvider';

export function AppLayout() {
  const { user, logout } = useAuth();
  const health = useApiResource<HealthResponse>('/health');
  const apiReady = health.status === 'success' && health.data.status === 'ok';
  const canSeeAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';

  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>SportSpace</strong>
        <nav>
          <NavLink to="/spaces">Espacios</NavLink>
          <NavLink to="/my-reservations">Mis reservas</NavLink>
          {canSeeAdmin ? <NavLink to="/admin">Administración</NavLink> : null}
        </nav>
        <div className="header-session">
          <span className={apiReady ? 'api-status api-status--ok' : 'api-status'}>
            {apiReady ? 'API conectada' : 'API no disponible'}
          </span>
          {user ? (
            <>
              <span className="header-user">{user.name}</span>
              <button type="button" className="logout-button" onClick={() => void logout()}>
                Cerrar sesión
              </button>
            </>
          ) : null}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
