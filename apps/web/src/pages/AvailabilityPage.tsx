import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, apiPost } from '../api/http';
import type { AvailabilityDay, AvailabilitySlot, Reservation } from '../api/types';
import { ErrorState } from '../components/FeedbackState';
import { formatDayLabel, formatTimeBogota, isValidIsoDate, shiftIsoDate, todayInBogota } from '../dates';
import { useApiResource } from '../hooks/useApiResource';
import { SLOT_STATUS_LABEL, toReservationErrorMessage } from '../reservations/messages';

function availabilityErrorMessage(message: string, httpStatus?: number): string {
  if (httpStatus === 404 || httpStatus === 400 || message.toLowerCase().includes('not found')) {
    return 'Este espacio no existe o ya no está disponible.';
  }
  if (httpStatus === 401) {
    return 'Necesitas iniciar sesión para ver la disponibilidad.';
  }
  return message;
}

function isSelected(from: number | null, to: number | null, index: number): boolean {
  if (from === null || to === null) {
    return false;
  }
  return index >= Math.min(from, to) && index <= Math.max(from, to);
}

function rangeIsBookable(slots: AvailabilitySlot[], from: number, to: number): boolean {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  return slots.slice(start, end + 1).every((slot) => slot.bookable);
}

export function AvailabilityPage() {
  const { spaceId } = useParams();
  const [params, setParams] = useSearchParams();
  const rawDate = params.get('date') ?? '';
  const date = isValidIsoDate(rawDate) ? rawDate : todayInBogota();
  const [refreshKey, setRefreshKey] = useState(0);
  const [fromIndex, setFromIndex] = useState<number | null>(null);
  const [toIndex, setToIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const availability = useApiResource<AvailabilityDay>(
    spaceId ? `/spaces/${spaceId}/availability?date=${date}` : '',
    refreshKey,
  );

  useEffect(() => {
    if (rawDate === date) {
      return;
    }
    setParams({ date }, { replace: true });
  }, [date, rawDate, setParams]);

  useEffect(() => {
    setFromIndex(null);
    setToIndex(null);
    setError('');
    setSuccess('');
  }, [date, spaceId]);

  const day = availability.status === 'success' && availability.data.date === date ? availability.data : null;
  const slots = day?.slots ?? [];
  const loadingSlots = !day && availability.status !== 'error';
  const selected = useMemo(() => {
    if (fromIndex === null || toIndex === null || !slots[fromIndex] || !slots[toIndex]) {
      return null;
    }
    const start = slots[Math.min(fromIndex, toIndex)];
    const end = slots[Math.max(fromIndex, toIndex)];
    return { startsAt: start.startsAt, endsAt: end.endsAt };
  }, [fromIndex, toIndex, slots]);

  function goToDate(nextDate: string) {
    if (!isValidIsoDate(nextDate)) {
      return;
    }
    setParams({ date: nextDate }, { replace: true });
  }

  function handleDateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('date');
    if (typeof value === 'string' && isValidIsoDate(value)) {
      goToDate(value);
    }
  }

  function selectSlot(index: number) {
    const slot = slots[index];
    if (!slot?.bookable || submitting) {
      return;
    }
    setError('');
    setSuccess('');

    if (fromIndex === null || toIndex === null) {
      setFromIndex(index);
      setToIndex(index);
      return;
    }

    if (isSelected(fromIndex, toIndex, index) && fromIndex === toIndex) {
      setFromIndex(null);
      setToIndex(null);
      return;
    }

    if (rangeIsBookable(slots, fromIndex, index)) {
      setToIndex(index);
      return;
    }

    setFromIndex(index);
    setToIndex(index);
  }

  async function requestReservation() {
    if (!spaceId || !selected) {
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await apiPost<Reservation>('/reservations', {
        spaceId,
        startsAt: selected.startsAt,
        endsAt: selected.endsAt,
      });
      setFromIndex(null);
      setToIndex(null);
      setRefreshKey((value) => value + 1);
      setSuccess('Solicitud enviada. Quedó pendiente de aprobación.');
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setFromIndex(null);
        setToIndex(null);
        setRefreshKey((value) => value + 1);
      }
      setError(toReservationErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  if (!spaceId) {
    return (
      <ErrorState
        title="Espacio no encontrado"
        description="Este espacio no existe o ya no está disponible."
      />
    );
  }

  if (availability.status === 'error') {
    return (
      <section>
        <ErrorState
          title="Disponibilidad"
          description={availabilityErrorMessage(availability.message, availability.httpStatus)}
        />
        <p>
          <Link to="/spaces">Volver al catálogo</Link>
        </p>
      </section>
    );
  }

  const spaceName = day?.spaceName ?? (availability.status === 'success' ? availability.data.spaceName : 'Espacio deportivo');

  return (
    <section className="availability-page">
      <p>
        <Link to={`/spaces/${spaceId}`}>← {spaceName}</Link>
      </p>
      <h1>Disponibilidad</h1>
      <p className="muted">
        Elige un día y una o más franjas libres consecutivas. La solicitud queda pendiente hasta que la administración la
        confirme.
      </p>

      <form className="availability-nav" onSubmit={handleDateSubmit}>
        <button type="button" onClick={() => goToDate(shiftIsoDate(date, -1))}>
          Día anterior
        </button>
        <label>
          Fecha
          <input type="date" name="date" value={date} onChange={(event) => goToDate(event.target.value)} />
        </label>
        <button type="button" onClick={() => goToDate(shiftIsoDate(date, 1))}>
          Día siguiente
        </button>
      </form>
      <p className="muted">{formatDayLabel(date)}</p>

      <ul className="slot-legend">
        <li>
          <span className="slot-swatch slot-swatch--free" /> Libre
        </li>
        <li>
          <span className="slot-swatch slot-swatch--busy" /> Ocupada
        </li>
        <li>
          <span className="slot-swatch slot-swatch--blocked" /> Bloqueada
        </li>
        <li>
          <span className="slot-swatch slot-swatch--past" /> Pasada
        </li>
      </ul>

      {loadingSlots ? (
        <p className="muted" role="status">
          Cargando franjas…
        </p>
      ) : null}

      {day && slots.length === 0 ? (
        <p className="muted">No hay horario este día. Prueba un día hábil o elige otra fecha.</p>
      ) : null}

      {slots.length > 0 ? (
        <ul className="slot-grid">
          {slots.map((slot, index) => {
            const selectedSlot = isSelected(fromIndex, toIndex, index);
            const label = `${formatTimeBogota(slot.startsAt)} – ${formatTimeBogota(slot.endsAt)}`;
            return (
              <li key={slot.startsAt}>
                <button
                  type="button"
                  className={`slot slot--${slot.status.toLowerCase()}${selectedSlot ? ' slot--selected' : ''}`}
                  disabled={!slot.bookable || submitting}
                  aria-pressed={selectedSlot}
                  onClick={() => selectSlot(index)}
                >
                  <strong>{label}</strong>
                  <span>{SLOT_STATUS_LABEL[slot.status]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selected ? (
        <div className="availability-actions">
          <p>
            Franja seleccionada: {formatTimeBogota(selected.startsAt)} – {formatTimeBogota(selected.endsAt)}
          </p>
          <button type="button" className="primary-button" disabled={submitting} onClick={() => void requestReservation()}>
            {submitting ? 'Enviando solicitud…' : 'Solicitar reserva'}
          </button>
        </div>
      ) : null}
      {!selected && slots.length > 0 ? (
        <p className="muted">
          Selecciona una franja libre para solicitarla. Puedes ampliar el horario haciendo clic en otra franja consecutiva.
        </p>
      ) : null}

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="success-text" role="status">
          {success} <Link to="/my-reservations">Ver mis reservas</Link>
        </p>
      ) : null}
    </section>
  );
}
