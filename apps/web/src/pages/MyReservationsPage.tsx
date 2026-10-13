import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api/http';
import type { Reservation, ReservationStatus } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { EmptyState, ErrorState, LoadingState } from '../components/FeedbackState';
import { formatIntervalBogota } from '../dates';
import { useApiResource } from '../hooks/useApiResource';
import { RESERVATION_STATUS_LABEL, toReservationErrorMessage } from '../reservations/messages';

const CANCELLABLE: ReservationStatus[] = ['PENDING', 'APPROVED'];

function canCancel(reservation: Reservation, now: number): boolean {
  return CANCELLABLE.includes(reservation.status) && new Date(reservation.startsAt).getTime() > now;
}

export function MyReservationsPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const list = useApiResource<Reservation[]>('/reservations', refreshKey);
  const now = Date.now();

  async function cancelReservation(id: string) {
    setError('');
    setCancellingId(id);
    try {
      await apiPost(`/reservations/${id}/cancel`);
      setConfirmId(null);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(toReservationErrorMessage(cause));
    } finally {
      setCancellingId(null);
    }
  }

  if (list.status === 'loading') {
    return <LoadingState title="Mis reservas" description="Cargando tus solicitudes…" />;
  }

  if (list.status === 'error') {
    return <ErrorState title="Mis reservas" description={list.message} />;
  }

  const mine =
    list.status === 'success'
      ? list.data.filter((reservation) => reservation.userId === user?.id)
      : [];

  if (mine.length === 0) {
    return (
      <section>
        <EmptyState
          title="Mis reservas"
          description="Aún no tienes solicitudes. Elige un espacio y una franja libre para reservar."
        />
        <p>
          <Link className="primary-link" to="/spaces">
            Ver espacios
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Mis reservas</h1>
      <p className="muted">Consulta el estado de tus solicitudes. Puedes cancelar las que aún no hayan iniciado.</p>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="reservation-list">
        {mine.map((reservation) => (
          <li key={reservation.id} className="reservation-card">
            <div>
              <strong>{reservation.space.name}</strong>
              <p className="muted">
                {reservation.space.type} · {reservation.space.campus}
              </p>
              <p>{formatIntervalBogota(reservation.startsAt, reservation.endsAt)}</p>
              {reservation.status === 'REJECTED' && reservation.reason ? (
                <p>Motivo: {reservation.reason}</p>
              ) : null}
            </div>
            <div className="reservation-card__actions">
              <span className={`status-badge status-badge--${reservation.status.toLowerCase()}`}>
                {RESERVATION_STATUS_LABEL[reservation.status]}
              </span>
              {canCancel(reservation, now) && confirmId === reservation.id ? (
                <>
                  <p className="muted">¿Cancelar esta reserva?</p>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={cancellingId === reservation.id}
                    onClick={() => void cancelReservation(reservation.id)}
                  >
                    {cancellingId === reservation.id ? 'Cancelando…' : 'Sí, cancelar'}
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    disabled={cancellingId === reservation.id}
                    onClick={() => setConfirmId(null)}
                  >
                    No
                  </button>
                </>
              ) : null}
              {canCancel(reservation, now) && confirmId !== reservation.id ? (
                <button type="button" className="danger-button" onClick={() => setConfirmId(reservation.id)}>
                  Cancelar
                </button>
              ) : null}
              <Link to={`/spaces/${reservation.spaceId}/availability`}>Ver disponibilidad</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
