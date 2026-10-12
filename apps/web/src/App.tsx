import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { AdminPage } from './pages/AdminPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { LoginPage } from './pages/LoginPage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { RegisterPage } from './pages/RegisterPage';
import { SpacesPage } from './pages/SpacesPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/spaces" replace />} />
        <Route path="/spaces" element={<SpacesPage />} />
        <Route path="/spaces/:spaceId/availability" element={<AvailabilityPage />} />
        <Route path="/my-reservations" element={<MyReservationsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}
