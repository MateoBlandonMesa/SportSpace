import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function AdminPage() {
  const { user } = useAuth();
  const canManageRoles = user?.role === 'ADMIN';

  return (
    <section className="admin-page">
      <h1>Administración</h1>
      <p className="muted">Gestiona solicitudes, horarios semanales, ocupación y, si eres administrador, los roles.</p>
      <nav className="admin-nav" aria-label="Secciones de administración">
        <NavLink to="/admin/inbox">Solicitudes</NavLink>
        <NavLink to="/admin/occupancy">Ocupación</NavLink>
        <NavLink to="/admin/availability">Horarios</NavLink>
        {canManageRoles ? <NavLink to="/admin/roles">Roles</NavLink> : null}
      </nav>
      <Outlet />
    </section>
  );
}
