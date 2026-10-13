import { useState } from 'react';
import { apiPatch } from '../api/http';
import type { ManagedUser, Role } from '../api/types';
import { ErrorState } from '../components/FeedbackState';
import { useApiResource } from '../hooks/useApiResource';
import { ROLE_LABEL, toRoleErrorMessage } from '../users/messages';

const ROLES: Role[] = ['STUDENT', 'STAFF', 'ADMIN'];

export function AdminRolesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Role>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const users = useApiResource<ManagedUser[]>('/users', refreshKey);

  const list = users.status === 'success' ? users.data : [];
  const adminCount = list.filter((item) => item.role === 'ADMIN').length;

  async function saveRole(user: ManagedUser) {
    const nextRole = drafts[user.id] ?? user.role;
    if (nextRole === user.role) {
      return;
    }
    setError('');
    setSuccess('');
    setSavingId(user.id);
    try {
      await apiPatch(`/users/${user.id}`, { role: nextRole });
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[user.id];
        return copy;
      });
      setRefreshKey((value) => value + 1);
      setSuccess(`${user.name} ahora es ${ROLE_LABEL[nextRole].toLowerCase()}.`);
    } catch (cause) {
      setError(toRoleErrorMessage(cause));
    } finally {
      setSavingId(null);
    }
  }

  if (users.status === 'loading') {
    return (
      <p className="muted" role="status">
        Cargando usuarios…
      </p>
    );
  }

  if (users.status === 'error') {
    const description =
      users.httpStatus === 403 ? 'Solo un administrador puede gestionar roles.' : users.message;
    return <ErrorState title="Roles" description={description} />;
  }

  if (users.status === 'empty') {
    return (
      <section>
        <h2>Roles</h2>
        <p className="muted">Aún no hay usuarios registrados.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Roles</h2>
      <p className="muted">Cambia el rol de un usuario. No se puede dejar el sistema sin un administrador.</p>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="success-text" role="status">
          {success}
        </p>
      ) : null}
      <ul className="reservation-list">
        {list.map((item) => {
          const selected = drafts[item.id] ?? item.role;
          const lastAdmin = item.role === 'ADMIN' && adminCount <= 1;
          const dirty = selected !== item.role;
          return (
            <li key={item.id} className="reservation-card">
              <div>
                <strong>{item.name}</strong>
                <p className="muted">{item.email}</p>
              </div>
              <div className="reservation-card__actions">
                <label>
                  Rol
                  <select
                    name={`role-${item.id}`}
                    value={selected}
                    disabled={lastAdmin || savingId === item.id}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [item.id]: event.target.value as Role }))
                    }
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </label>
                {lastAdmin ? <p className="muted">Último administrador</p> : null}
                <button
                  type="button"
                  className="primary-button"
                  disabled={!dirty || lastAdmin || savingId === item.id}
                  onClick={() => void saveRole(item)}
                >
                  {savingId === item.id ? 'Guardando…' : 'Guardar rol'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
