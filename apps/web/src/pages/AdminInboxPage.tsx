import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api/http';
import type { Reservation } from '../api/types';
import { ErrorState } from '../components/FeedbackState';
import { formatIntervalBogota } from '../dates';
import { useApiResource } from '../hooks/useApiResource';
import { RESERVATION_STATUS_LABEL, toReservationErrorMessage } from '../reservations/messages';

export function AdminInboxPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [onlyPending, setOnlyPending] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const list = useApiResource<Reservation[]>('/reservations', refreshKey);

  const reservations =
    list.status === 'success'
      ? list.data.filter((item) => (onlyPending ? item.status === 'PENDING' : true))
      : [];

  async function approve(id: string) {
    setError('');
    setSuccess('');
    setActingId(id);
    try {
      await apiPost(`/reservations/${id}/approve`);
      setRejectId(null);
      setRefreshKey((value) => value + 1);
      setSuccess('Solicitud aprobada.');
    } catch (cause) {
      setError(toReservationErrorMessage(cause));
    } finally {
      setActingId(null);
    }
  }

  async function reject(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Indica un motivo de al menos 3 caracteres.');
      return;
    }
    setError('');
    setSuccess('');
    setActingId(id);
    try {
      await apiPost(`/reservations/${id}/reject`, { reason: trimmed });
      setRejectId(null);
      setReason('');
      setRefreshKey((value) => value + 1);
      setSuccess('Solicitud rechazada.');
    } catch (cause) {
      setError(toReservationErrorMessage(cause));
    } finally {
      setActingId(null);
    }
  }

  if (list.status === 'loading') {
    return (
      <p className="muted" role="status">
        Cargando la bandeja…
      </p>
    );
  }

  if (list.status === 'error') {
    return <ErrorState title="Solicitudes" description={list.message} />;
  }

  return (
    <section>
      <h2>Solicitudes</h2>
      <p className="muted">Aprueba o rechaza reservas pendientes. El rechazo exige un motivo visible para el estudiante.</p>
      <label className="admin-filter">
        <input
          type="checkbox"
          checked={onlyPending}
          onChange={(event) => setOnlyPending(event.target.checked)}
        />
        Solo pendientes
      </label>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="success-text" role="status">
          {success}
        </p>
      ) : null}

      {list.status === 'empty' || reservations.length === 0 ? (
        <p className="muted">
          {onlyPending ? 'No hay solicitudes pendientes por revisar.' : 'Todavía no hay reservas registradas.'}
        </p>
      ) : (
        <ul className="reservation-list">
          {reservations.map((reservation) => (
            <li key={reservation.id} className="reservation-card">
              <div>
                <strong>{reservation.space.name}</strong>
                <p className="muted">
                  {reservation.space.type} · {reservation.space.campus}
                </p>
                <p>{formatIntervalBogota(reservation.startsAt, reservation.endsAt)}</p>
                {reservation.user ? (
                  <p>
                    {reservation.user.name} · {reservation.user.email}
                  </p>
                ) : null}
                {reservation.reason ? <p>Motivo: {reservation.reason}</p> : null}
              </div>
              <div className="reservation-card__actions">
                <span className={`status-badge status-badge--${reservation.status.toLowerCase()}`}>
                  {RESERVATION_STATUS_LABEL[reservation.status]}
                </span>
                {reservation.status === 'PENDING' ? (
                  <>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={actingId === reservation.id}
                      onClick={() => void approve(reservation.id)}
                    >
                      {actingId === reservation.id && rejectId !== reservation.id ? 'Aprobando…' : 'Aprobar'}
                    </button>
                    {rejectId === reservation.id ? (
                      <form className="reject-form" onSubmit={(event) => void reject(event, reservation.id)}>
                        <label>
                          Motivo del rechazo
                          <textarea
                            name="reason"
                            rows={3}
                            minLength={3}
                            required
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                          />
                        </label>
                        <div className="availability-actions">
                          <button type="submit" className="danger-button" disabled={actingId === reservation.id}>
                            {actingId === reservation.id ? 'Rechazando…' : 'Confirmar rechazo'}
                          </button>
                          <button
                            type="button"
                            className="link-button"
                            disabled={actingId === reservation.id}
                            onClick={() => {
                              setRejectId(null);
                              setReason('');
                            }}
                          >
                            No
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="danger-button"
                        disabled={actingId === reservation.id}
                        onClick={() => {
                          setRejectId(reservation.id);
                          setReason('');
                          setError('');
                        }}
                      >
                        Rechazar
                      </button>
                    )}
                  </>
                ) : null}
                <Link to={`/spaces/${reservation.spaceId}/availability`}>Ver disponibilidad</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
