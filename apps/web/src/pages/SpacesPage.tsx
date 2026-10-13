import { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/FeedbackState';
import { useApiResource } from '../hooks/useApiResource';
import type { Space } from '../api/types';

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
}

function shortDescription(rules: string, max = 140): string {
  const text = rules.trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function spacesPath(campus: string, type: string): string {
  const params = new URLSearchParams();
  if (campus) {
    params.set('campus', campus);
  }
  if (type) {
    params.set('type', type);
  }
  const query = params.toString();
  return query ? `/spaces?${query}` : '/spaces';
}

export function SpacesPage() {
  const [params, setParams] = useSearchParams();
  const campus = params.get('campus') ?? '';
  const type = params.get('type') ?? '';
  const hasFilters = Boolean(campus || type);

  const catalog = useApiResource<Space[]>('/spaces');
  const spaces = useApiResource<Space[]>(spacesPath(campus, type));

  function updateFilter(key: 'campus' | 'type', value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next, { replace: true });
  }

  function clearFilters(event: FormEvent) {
    event.preventDefault();
    setParams({}, { replace: true });
  }

  if (catalog.status === 'loading' && !hasFilters) {
    return <LoadingState title="Espacios deportivos" description="Cargando el catálogo…" />;
  }

  if (catalog.status === 'error') {
    return <ErrorState title="Espacios deportivos" description={catalog.message} />;
  }

  const filterSource = catalog.status === 'success' ? catalog.data : [];
  const campuses = uniqueSorted(filterSource.map((space) => space.campus));
  const types = uniqueSorted(filterSource.map((space) => space.type));

  return (
    <section>
      <h1>Espacios deportivos</h1>
      <p className="muted">Consulta escenarios activos y entra al detalle para ver capacidad y reglas de uso.</p>

      {campuses.length > 0 || types.length > 0 ? (
        <form className="space-filters" onSubmit={clearFilters}>
          <label>
            Campus
            <select name="campus" value={campus} onChange={(event) => updateFilter('campus', event.target.value)}>
              <option value="">Todos</option>
              {campuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select name="type" value={type} onChange={(event) => updateFilter('type', event.target.value)}>
              <option value="">Todos</option>
              {types.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          {hasFilters ? (
            <button type="submit" className="link-button">
              Quitar filtros
            </button>
          ) : null}
        </form>
      ) : null}

      {spaces.status === 'loading' ? (
        <p className="muted" role="status">
          Actualizando el catálogo…
        </p>
      ) : null}

      {spaces.status === 'error' ? <p className="error-text">{spaces.message}</p> : null}

      {spaces.status === 'empty' ? (
        <p className="muted">
          {hasFilters
            ? 'No hay espacios que coincidan con esos filtros.'
            : 'Aún no hay espacios activos.'}
        </p>
      ) : null}

      {spaces.status === 'success' ? (
        <ul className="space-grid">
          {spaces.data.map((space) => (
            <li key={space.id}>
              <Link to={`/spaces/${space.id}`} className="space-card">
                <strong>{space.name}</strong>
                <span className="muted">
                  {space.type} · {space.campus}
                </span>
                <p>{shortDescription(space.usageRules)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
