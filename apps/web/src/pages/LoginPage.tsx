import { Link } from 'react-router-dom';
import { PlaceholderPage } from './PlaceholderPage';

export function LoginPage() {
  return (
    <section className="auth-page">
      <PlaceholderPage title="Iniciar sesión" nextBranch="feat/web-auth" />
      <p>
        ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
      </p>
    </section>
  );
}
