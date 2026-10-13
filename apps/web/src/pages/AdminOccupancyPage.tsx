import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { OccupancySpace, OccupancyWeek } from '../api/types';
import { ErrorState } from '../components/FeedbackState';
import { formatWeekRange, isValidIsoDate, mondayOfWeek, shiftIsoDate, todayInBogota } from '../dates';
import { useApiResource } from '../hooks/useApiResource';

function occupancyPath(weekStart: string, spaceId: string): string {
  const params = new URLSearchParams({ weekStart });
  if (spaceId) {
    params.set('spaceId', spaceId);
  }
  return `/occupancy?${params.toString()}`;
}

export function AdminOccupancyPage() {
  const [params, setParams] = useSearchParams();
  const rawWeek = params.get('weekStart') ?? '';
  const weekStart = mondayOfWeek(isValidIsoDate(rawWeek) ? rawWeek : todayInBogota());
  const spaceId = params.get('spaceId') ?? '';
  const occupancy = useApiResource<OccupancyWeek>(occupancyPath(weekStart, spaceId));
  const [spaceOptions, setSpaceOptions] = useState<OccupancySpace[]>([]);

  useEffect(() => {
    if (rawWeek === weekStart) {
      return;
    }
    const next = new URLSearchParams(params);
    next.set('weekStart', weekStart);
    setParams(next, { replace: true });
  }, [params, rawWeek, setParams, weekStart]);

  useEffect(() => {
    if (occupancy.status === 'success' && !spaceId) {
      setSpaceOptions(occupancy.data.spaces);
    }
  }, [occupancy, spaceId]);

  function goToWeek(nextMonday: string) {
    const next = new URLSearchParams(params);
    next.set('weekStart', nextMonday);
    setParams(next, { replace: true });
  }

  function setSpaceFilter(value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set('spaceId', value);
    } else {
      next.delete('spaceId');
    }
    setParams(next, { replace: true });
  }

  if (occupancy.status === 'error') {
    return <ErrorState title="Ocupación" description={occupancy.message} />;
  }

  const week = occupancy.status === 'success' ? occupancy.data : null;
  const spaces = week?.spaces ?? [];
  const options = spaceOptions.length > 0 ? spaceOptions : spaces;

  return (
    <section>
      <h2>Ocupación semanal</h2>
      <p className="muted">
        Horas ocupadas por reservas pendientes o aprobadas frente a las horas hábiles. Los bloqueos no cuentan como
        ocupación.
      </p>

      <form className="availability-nav" onSubmit={(event) => event.preventDefault()}>
        <button type="button" onClick={() => goToWeek(shiftIsoDate(weekStart, -7))}>
          Semana anterior
        </button>
        <label>
          Semana (lunes)
          <input
            type="date"
            name="weekStart"
            value={weekStart}
            onChange={(event) => {
              if (isValidIsoDate(event.target.value)) {
                goToWeek(mondayOfWeek(event.target.value));
              }
            }}
          />
        </label>
        <button type="button" onClick={() => goToWeek(shiftIsoDate(weekStart, 7))}>
          Semana siguiente
        </button>
        <label>
          Espacio
          <select name="spaceId" value={spaceId} onChange={(event) => setSpaceFilter(event.target.value)}>
            <option value="">Todos</option>
            {options.map((space) => (
              <option key={space.spaceId} value={space.spaceId}>
                {space.name}
              </option>
            ))}
          </select>
        </label>
      </form>
      <p className="muted">{formatWeekRange(weekStart, shiftIsoDate(weekStart, 6))}</p>

      {occupancy.status === 'loading' || !week ? (
        <p className="muted" role="status">
          Calculando la semana…
        </p>
      ) : spaces.length === 0 ? (
        <p className="muted">No hay espacios para mostrar en esta semana.</p>
      ) : (
        <div className="occupancy-table-wrap">
          <table className="occupancy-table">
            <thead>
              <tr>
                <th>Espacio</th>
                <th>Campus</th>
                <th>Hábiles</th>
                <th>Ocupadas</th>
                <th>Bloqueadas</th>
                <th>Ocupación</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((space) => (
                <tr key={space.spaceId}>
                  <td>
                    <strong>{space.name}</strong>
                    <p className="muted">
                      {space.type}
                      {space.isActive ? '' : ' · inactivo'}
                    </p>
                  </td>
                  <td>{space.campus}</td>
                  <td>{space.enabledHours} h</td>
                  <td>{space.occupiedHours} h</td>
                  <td>{space.blockedHours} h</td>
                  <td>
                    <div className="occupancy-meter">
                      <span>{space.occupancyPercent.toLocaleString('es-CO')} %</span>
                      <div className="occupancy-bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(space.occupancyPercent, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
