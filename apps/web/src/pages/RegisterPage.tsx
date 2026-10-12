import { Link } from 'react-router-dom';
import { PlaceholderPage } from './PlaceholderPage';

export function RegisterPage() {
  return (
    <section className="auth-page">
      <PlaceholderPage title="Registro" nextBranch="feat/web-auth" />
      <p>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </section>
  );
}
