import { Link, useParams } from 'react-router-dom';
import type { Space } from '../api/types';
import { ErrorState, LoadingState } from '../components/FeedbackState';
import { useApiResource } from '../hooks/useApiResource';

function detailErrorMessage(message: string, httpStatus?: number): string {
  if (httpStatus === 404 || message.toLowerCase().includes('not found')) {
    return 'Este espacio no existe o ya no está disponible.';
  }
  if (httpStatus === 401) {
    return 'Necesitas iniciar sesión para ver este espacio.';
  }
    if (httpStatus === 400) {
      return 'Este espacio no existe o ya no está disponible.';
    }
    return message;
}

export function SpaceDetailPage() {
  const { spaceId } = useParams();
  const space = useApiResource<Space>(spaceId ? `/spaces/${spaceId}` : '');

  if (!spaceId) {
    return (
      <ErrorState
        title="Espacio no encontrado"
        description="Este espacio no existe o ya no está disponible."
      />
    );
  }

  if (space.status === 'loading') {
    return <LoadingState title="Espacio deportivo" description="Cargando el detalle…" />;
  }

  if (space.status === 'error') {
    return (
      <section>
        <ErrorState
          title="Espacio no encontrado"
          description={detailErrorMessage(space.message, space.httpStatus)}
        />
        <p>
          <Link to="/spaces">Volver al catálogo</Link>
        </p>
      </section>
    );
  }

  if (space.status !== 'success') {
    return (
      <ErrorState
        title="Espacio no encontrado"
        description="Este espacio no existe o ya no está disponible."
      />
    );
  }

  const item = space.data;

  return (
    <article className="space-detail">
      <p>
        <Link to="/spaces">← Catálogo</Link>
      </p>
      <h1>{item.name}</h1>
      <dl className="space-facts">
        <div>
          <dt>Tipo</dt>
          <dd>{item.type}</dd>
        </div>
        <div>
          <dt>Campus</dt>
          <dd>{item.campus}</dd>
        </div>
        <div>
          <dt>Capacidad</dt>
          <dd>{item.capacity} personas</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{item.isActive ? 'Activo' : 'Inactivo'}</dd>
        </div>
      </dl>
      <section>
        <h2>Reglas de uso</h2>
        <p>{item.usageRules}</p>
      </section>
      <p>
        <Link className="primary-link" to={`/spaces/${item.id}/availability`}>
          Ver disponibilidad
        </Link>
      </p>
    </article>
  );
}
