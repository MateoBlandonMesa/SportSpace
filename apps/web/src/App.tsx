import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { GuestOnly, RequireAuth } from './auth/route-guards';
import { AppLayout } from './layout/AppLayout';
import { AdminPage } from './pages/AdminPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { LoginPage } from './pages/LoginPage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { SpaceDetailPage } from './pages/SpaceDetailPage';
import { SpacesPage } from './pages/SpacesPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/spaces" replace />} />
            <Route path="/spaces" element={<SpacesPage />} />
            <Route path="/spaces/:spaceId" element={<SpaceDetailPage />} />
            <Route path="/spaces/:spaceId/availability" element={<AvailabilityPage />} />
            <Route path="/my-reservations" element={<MyReservationsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
