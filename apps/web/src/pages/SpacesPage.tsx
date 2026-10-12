import { EmptyState, ErrorState, LoadingState } from '../components/FeedbackState';
import { useApiResource } from '../hooks/useApiResource';
import type { Space } from '../api/types';

export function SpacesPage() {
  const spaces = useApiResource<Space[]>('/spaces');

  if (spaces.status === 'loading') {
    return <LoadingState title="Espacios deportivos" description="Cargando el catálogo…" />;
  }

  if (spaces.status === 'error') {
    return <ErrorState title="Espacios deportivos" description={spaces.message} />;
  }

  if (spaces.status === 'empty') {
    return (
      <EmptyState
        title="Espacios deportivos"
        description="Aún no hay espacios activos. Dilan los cargará en feat/spaces."
      />
    );
  }

  return (
    <section>
      <h1>Espacios deportivos</h1>
      <ul className="space-list">
        {spaces.data.map((space) => (
          <li key={space.id}>
            <strong>{space.name}</strong>
            <span className="muted">
              {' '}
              · {space.type} · {space.campus}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted">El detalle y filtros se arman en feat/web-spaces.</p>
    </section>
  );
}
