import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/FeedbackState';
import { useAuth } from './AuthProvider';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'bootstrapping') {
    return <LoadingState title="SportSpace" description="Restaurando tu sesión…" />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function GuestOnly() {
  const { status } = useAuth();

  if (status === 'bootstrapping') {
    return <LoadingState title="SportSpace" description="Restaurando tu sesión…" />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/spaces" replace />;
  }

  return <Outlet />;
}

export function RequireStaff() {
  const { user } = useAuth();
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  if (!isStaff) {
    return (
      <ErrorState
        title="Administración"
        description="No tienes permiso para ver esta sección."
      />
    );
  }

  return <Outlet />;
}
