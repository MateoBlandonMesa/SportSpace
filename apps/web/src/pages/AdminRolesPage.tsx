import type { ManagedUser } from '../api/types';
import { ErrorState } from '../components/FeedbackState';
import { useApiResource } from '../hooks/useApiResource';

const ROLE_LABEL = {
  STUDENT: 'Estudiante',
  STAFF: 'Staff',
  ADMIN: 'Administrador',
} as const;

export function AdminRolesPage() {
  const users = useApiResource<ManagedUser[]>('/users');

  if (users.status === 'loading') {
    return (
      <p className="muted" role="status">
        Cargando usuarios…
      </p>
    );
  }

  if (users.status === 'error') {
    const description =
      users.httpStatus === 403
        ? 'Solo un administrador puede gestionar roles.'
        : users.message;
    return <ErrorState title="Roles" description={description} />;
  }

  if (users.status === 'empty') {
    return (
      <section>
        <h2>Roles</h2>
        <p className="muted">
          Todavía no se pueden listar ni cambiar roles desde la aplicación. Cuando el API de usuarios esté listo, aquí
          podrás promover a staff o administrador.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Roles</h2>
      <p className="muted">Promueve usuarios del prototipo. No se puede dejar el sistema sin un administrador.</p>
      <ul className="reservation-list">
        {users.data.map((item) => (
          <li key={item.id} className="reservation-card">
            <div>
              <strong>{item.name}</strong>
              <p className="muted">{item.email}</p>
            </div>
            <span className="status-badge">{ROLE_LABEL[item.role]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
