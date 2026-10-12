import { NavLink, Outlet } from 'react-router-dom';

export function AppLayout() {
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
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
