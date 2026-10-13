import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { isInstitutionalEmail, isValidPassword, toAuthErrorMessage } from '../auth/messages';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!isInstitutionalEmail(trimmedEmail)) {
      setError('Solo se admiten correos institucionales @udea.edu.co.');
      return;
    }
    if (!isValidPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, con letras y números.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await register(trimmedName, trimmedEmail, password);
      navigate('/spaces', { replace: true });
    } catch (cause) {
      setError(toAuthErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <header className="auth-header">
        <strong>SportSpace</strong>
      </header>
      <div className="auth-card">
        <h1>Crear cuenta</h1>
        <p className="muted">El registro está limitado a correos @udea.edu.co. El rol inicial es estudiante.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            Correo institucional
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creando cuenta…' : 'Registrarme'}
          </button>
        </form>
        <p>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </section>
  );
}
