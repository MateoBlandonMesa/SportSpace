import { Link } from 'react-router-dom';
import { EmptyState } from '../components/FeedbackState';

export function NotFoundPage() {
  return (
    <section className="auth-page">
      <EmptyState
        title="Página no encontrada"
        description="La ruta no existe o ya no está disponible."
      />
      <p>
        <Link to="/spaces">Volver a espacios</Link>
      </p>
    </section>
  );
}
