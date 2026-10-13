import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/FeedbackState';
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
