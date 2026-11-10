import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiDelete, apiPost, apiPut } from '../api/http';
import type { AvailabilityBlock, Space, WeeklyHourRule } from '../api/types';
import { ErrorState } from '../components/FeedbackState';
import { formatIntervalBogota, isValidIsoDate, shiftIsoDate, todayInBogota } from '../dates';
import { useApiResource } from '../hooks/useApiResource';

const DAYS = [
  { dayOfWeek: 1, label: 'Lunes' },
  { dayOfWeek: 2, label: 'Martes' },
  { dayOfWeek: 3, label: 'Miércoles' },
  { dayOfWeek: 4, label: 'Jueves' },
  { dayOfWeek: 5, label: 'Viernes' },
  { dayOfWeek: 6, label: 'Sábado' },
  { dayOfWeek: 7, label: 'Domingo' },
] as const;

type DayDraft = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};
type WeeklyDraft = Record<number, DayDraft>;

function emptyDraft(): WeeklyDraft {
  return Object.fromEntries(
    DAYS.map(({ dayOfWeek }) => [dayOfWeek, { enabled: false, startTime: '06:00', endTime: '22:00' }]),
  ) as WeeklyDraft;
}

function draftFromRules(rules: WeeklyHourRule[]): WeeklyDraft {
  const draft = emptyDraft();
  for (const rule of rules) {
    draft[rule.dayOfWeek] = { enabled: true, startTime: rule.startTime, endTime: rule.endTime };
  }
  return draft;
}

function availabilityError(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError && cause.status === 403) {
    return 'Solo el personal autorizado puede modificar la disponibilidad.';
  }
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }
  return fallback;
}

export function AdminAvailabilityPage() {
  const spaces = useApiResource<Space[]>('/spaces');
  const [spaceId, setSpaceId] = useState('');

  useEffect(() => {
    if (spaces.status !== 'success') {
      return;
    }
    if (!spaces.data.some((space) => space.id === spaceId)) {
      setSpaceId(spaces.data[0]?.id ?? '');
    }
  }, [spaces, spaceId]);

  if (spaces.status === 'loading') {
    return <p className="muted" role="status">Cargando espacios…</p>;
  }
  if (spaces.status === 'error') {
    return <ErrorState title="Horarios" description={spaces.message} />;
  }
  if (spaces.status === 'empty' || spaces.data.length === 0) {
    return (
      <section>
        <h2>Disponibilidad</h2>
        <p className="muted">No hay espacios registrados para configurar.</p>
      </section>
    );
  }

  const selectedSpace = spaces.data.find((space) => space.id === spaceId) ?? spaces.data[0];

  return (
    <section className="admin-availability-page">
      <h2>Disponibilidad de espacios</h2>
      <p className="muted">Configura el horario semanal y administra cierres temporales del espacio.</p>
      <label className="admin-availability-space">
        Espacio
        <select value={selectedSpace.id} onChange={(event) => setSpaceId(event.target.value)}>
          {spaces.data.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}{space.isActive ? '' : ' · inactivo'} — {space.campus}
            </option>
          ))}
        </select>
      </label>
      <WeeklyHoursEditor key={selectedSpace.id} spaceId={selectedSpace.id} />
      <BlocksPanel key={`blocks-${selectedSpace.id}`} spaceId={selectedSpace.id} />
    </section>
  );
}

function WeeklyHoursEditor({ spaceId }: { spaceId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [draft, setDraft] = useState<WeeklyDraft>(() => emptyDraft());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const weeklyHours = useApiResource<WeeklyHourRule[]>(
    `/spaces/${spaceId}/availability/weekly-hours`,
    refreshKey,
  );

  useEffect(() => {
    if (weeklyHours.status === 'success') {
      setDraft(draftFromRules(weeklyHours.data));
    } else if (weeklyHours.status === 'empty') {
      setDraft(emptyDraft());
    }
  }, [weeklyHours]);

  function updateDay(dayOfWeek: number, changes: Partial<DayDraft>) {
    setDraft((current) => ({
      ...current,
      [dayOfWeek]: { ...current[dayOfWeek], ...changes },
    }));
    setSuccess('');
    setSaveError('');
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    setSuccess('');

    const rules = DAYS.flatMap(({ dayOfWeek }) => {
      const day = draft[dayOfWeek];
      return day.enabled ? [{ dayOfWeek, startTime: day.startTime, endTime: day.endTime }] : [];
    });

    try {
      await apiPut<WeeklyHourRule[]>(`/spaces/${spaceId}/availability/weekly-hours`, { rules });
      setRefreshKey((value) => value + 1);
      setSuccess('Horario semanal guardado.');
    } catch (cause) {
      setSaveError(availabilityError(cause, 'No se pudo guardar el horario. Inténtalo de nuevo.'));
    } finally {
      setSaving(false);
    }
  }

  if (weeklyHours.status === 'loading') {
    return <p className="muted" role="status">Cargando el horario…</p>;
  }
  if (weeklyHours.status === 'error') {
    return <ErrorState title="Horario semanal" description={weeklyHours.message} />;
  }

  return (
    <section className="weekly-hours-section">
      <h3>Horario semanal</h3>
      <p className="muted">Define las horas disponibles para reservar cada día. Guardar reemplaza el horario completo.</p>
      <form className="weekly-hours-form" onSubmit={(event) => void saveSchedule(event)}>
        <div className="weekly-hours-list">
          {DAYS.map(({ dayOfWeek, label }) => {
            const day = draft[dayOfWeek];
            return (
              <fieldset className="weekly-day-card" key={dayOfWeek}>
                <div className="weekly-day-card__header">
                  <legend>{label}</legend>
                  <label className="weekly-day-toggle">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(event) => updateDay(dayOfWeek, { enabled: event.target.checked })}
                    />
                    Abierto
                  </label>
                </div>
                {day.enabled ? (
                  <div className="weekly-day-card__times">
                    <label>
                      Desde
                      <input
                        type="time"
                        required
                        value={day.startTime}
                        onChange={(event) => updateDay(dayOfWeek, { startTime: event.target.value })}
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        type="time"
                        required
                        value={day.endTime}
                        onChange={(event) => updateDay(dayOfWeek, { endTime: event.target.value })}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="muted">Cerrado</p>
                )}
              </fieldset>
            );
          })}
        </div>
        <p className="muted">Si cierras todos los días, el espacio no tendrá horario disponible para reservas.</p>
        {saveError ? <p className="error-text" role="alert">{saveError}</p> : null}
        {success ? <p className="success-text" role="status">{success}</p> : null}
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar horario'}
        </button>
      </form>
    </section>
  );
}

function blockQueryPath(spaceId: string, fromDate: string, toDate: string): string {
  const params = new URLSearchParams({
    from: `${fromDate}T00:00:00-05:00`,
    to: `${shiftIsoDate(toDate, 1)}T00:00:00-05:00`,
  });
  return `/spaces/${spaceId}/availability/blocks?${params.toString()}`;
}

function dateOfBogota(value: string): string {
  return value.slice(0, 10);
}

function BlocksPanel({ spaceId }: { spaceId: string }) {
  const initialDate = todayInBogota();
  const [fromDate, setFromDate] = useState(initialDate);
  const [toDate, setToDate] = useState(() => shiftIsoDate(initialDate, 6));
  const [refreshKey, setRefreshKey] = useState(0);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const rangeValid = isValidIsoDate(fromDate) && isValidIsoDate(toDate) && fromDate <= toDate;
  const blocks = useApiResource<AvailabilityBlock[]>(
    rangeValid ? blockQueryPath(spaceId, fromDate, toDate) : '',
    refreshKey,
  );

  async function createBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (endsAt <= startsAt) {
      setError('La hora de cierre debe ser posterior a la de inicio.');
      setSaving(false);
      return;
    }

    const startsAtIso = `${startsAt}:00-05:00`;
    const endsAtIso = `${endsAt}:00-05:00`;
    try {
      await apiPost<AvailabilityBlock>(`/spaces/${spaceId}/availability/blocks`, {
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        reason: reason.trim(),
      });
      setFromDate(dateOfBogota(startsAt));
      setToDate(dateOfBogota(endsAt));
      setRefreshKey((value) => value + 1);
      setStartsAt('');
      setEndsAt('');
      setReason('');
      setSuccess('Bloqueo creado.');
    } catch (cause) {
      setError(availabilityError(cause, 'No se pudo crear el bloqueo. Inténtalo de nuevo.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteBlock(blockId: string) {
    setDeletingId(blockId);
    setError('');
    setSuccess('');
    try {
      await apiDelete<void>(`/spaces/${spaceId}/availability/blocks/${blockId}`);
      setConfirmDeleteId(null);
      setRefreshKey((value) => value + 1);
      setSuccess('Bloqueo eliminado.');
    } catch (cause) {
      setError(availabilityError(cause, 'No se pudo eliminar el bloqueo. Inténtalo de nuevo.'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="availability-blocks-section">
      <h3>Bloqueos temporales</h3>
      <p className="muted">Registra cierres por mantenimiento u otras novedades. Las fechas y horas corresponden a Colombia.</p>

      <form className="block-create-form" onSubmit={(event) => void createBlock(event)}>
        <label>
          Desde
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="datetime-local"
            required
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </label>
        <label className="block-create-form__reason">
          Motivo
          <input
            type="text"
            required
            minLength={3}
            maxLength={240}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ej. Mantenimiento"
          />
        </label>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Guardando…' : 'Crear bloqueo'}
        </button>
      </form>

      <form className="block-range-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Desde
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          Hasta (incluido)
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
      </form>
      {!rangeValid ? <p className="error-text" role="alert">El rango debe tener fechas válidas y la fecha final no puede ser anterior a la inicial.</p> : null}
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {success ? <p className="success-text" role="status">{success}</p> : null}

      {rangeValid && blocks.status === 'loading' ? <p className="muted" role="status">Cargando bloqueos…</p> : null}
      {rangeValid && blocks.status === 'error' ? <ErrorState title="Bloqueos" description={blocks.message} /> : null}
      {rangeValid && blocks.status === 'empty' ? <p className="muted">No hay bloqueos en este rango.</p> : null}
      {rangeValid && blocks.status === 'success' ? (
        <ul className="reservation-list block-list">
          {blocks.data.map((block) => (
            <li key={block.id} className="reservation-card">
              <div>
                <strong>{formatIntervalBogota(block.startsAt, block.endsAt)}</strong>
                <p>Motivo: {block.reason}</p>
              </div>
              <div className="reservation-card__actions">
                {confirmDeleteId === block.id ? (
                  <>
                    <p className="muted">¿Eliminar este bloqueo?</p>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={deletingId === block.id}
                      onClick={() => void deleteBlock(block.id)}
                    >
                      {deletingId === block.id ? 'Eliminando…' : 'Confirmar'}
                    </button>
                    <button
                      type="button"
                      className="link-button"
                      disabled={deletingId === block.id}
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="danger-button"
                    disabled={deletingId === block.id}
                    onClick={() => setConfirmDeleteId(block.id)}
                  >
                    Eliminar bloqueo
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}