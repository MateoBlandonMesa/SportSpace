# SportSpace

Plataforma web para **consultar en tiempo real la disponibilidad** y **gestionar reservas** de los espacios deportivos de la Universidad de Antioquia.

Hoy la solicitud depende del escenario (Portafolio, correo, confirmación administrativa). SportSpace centraliza ese proceso: el usuario ve el espacio, el horario y el estado de su solicitud en un solo lugar; la administración revisa y confirma sin perder consistencia entre reservas.

---

## Objetivo general

Desarrollar una plataforma centralizada para la consulta en tiempo real de la disponibilidad y la gestión de reservas de los espacios deportivos de la Universidad de Antioquia, con el propósito de facilitar el proceso de solicitud.

### Objetivos específicos

1. Analizar el proceso actual de solicitud y reserva (actores, requisitos y restricciones).
2. Diseñar una arquitectura **modular, eficiente y segura**, con consistencia transaccional entre disponibilidad, reservas y usuarios.
3. Implementar consulta de disponibilidad y solicitud de reserva.
4. Evitar conflictos de horario sobre un mismo espacio (validación en aplicación **y** en base de datos).
5. Evaluar la solución con pruebas funcionales, de conflicto de reserva y de seguridad básica.

---

## Equipo

| Rol | Nombre | Correo |
| --- | --- | --- |
| Profesor | Ronal Davilmar Montoya Montoya | ronal.montoya@udea.edu.co |
| Estudiante | Dilan Holguin Mazo | dilan.holguin@udea.edu.co |
| Estudiante | Carlos Alberto Casas Arenas | carlos.casas1@udea.edu.co |
| Estudiante | Jesús Mateo Blandón Mesa | mateo.blandon@udea.edu.co |

Asignatura: Proyecto Integrador I (2508700) — Grupo 6 — Ingeniería de Sistemas, Universidad de Antioquia.

---

## Decisión de arquitectura (eficiente y segura)

El anteproyecto planteaba microservicios (disponibilidad, reservas, usuarios) con **una sola base de datos compartida**. Esa combinación es un anti-patrón: los servicios quedan acoplados al mismo esquema, las transacciones distribuidas se vuelven complejas y un equipo de tres personas gasta más tiempo en red, despliegue y fallos parciales que en el producto.

**En PI1 implementamos un monolito modular.** Conservamos los mismos límites de dominio y podemos extraer microservicios más adelante si el volumen lo exige. Ganamos:

- Transacciones ACID reales al confirmar o rechazar una reserva (objetivo 4).
- Menos latencia: una petición, un proceso, una transacción.
- Operación simple: un backend, una base de datos, Docker Compose.
- Superficie de ataque más pequeña y un solo punto para autenticación y auditoría.

### Vista lógica

```
                    ┌─────────────────────────────────────┐
  Navegador         │           Cliente web (SPA)         │
  HTTPS             │     React + TypeScript + Vite       │
                    └─────────────────┬───────────────────┘
                                      │ REST JSON + JWT
                    ┌─────────────────▼───────────────────┐
                    │         API SportSpace              │
                    │     NestJS (monolito modular)       │
                    │  AuthN/Z · validación · rate limit  │
                    │                                     │
                    │  ┌─────────┐ ┌──────────┐ ┌───────┐ │
                    │  │ Usuarios│ │Espacios /│ │Reservas│ │
                    │  │  y auth │ │disponib. │ │        │ │
                    │  └────┬────┘ └────┬─────┘ └───┬───┘ │
                    └───────┼───────────┼───────────┼─────┘
                            └───────────┼───────────┘
                                        ▼
                              PostgreSQL (único)
                     restricciones de exclusión + índices
```

Los tres módulos del anteproyecto se mantienen como **módulos NestJS** (no como procesos independientes):

| Módulo | Responsabilidad |
| --- | --- |
| **Usuarios** | Registro y login propios (correo `@udea.edu.co` + contraseña), roles y perfil. |
| **Espacios / disponibilidad** | Catálogo de escenarios, horarios, bloqueos y consulta en tiempo real. |
| **Reservas** | Solicitud, aprobación/rechazo, cancelación y detección de solapes. |

La base de datos compartida del anteproyecto **sí aplica** aquí: un esquema PostgreSQL con transacciones y restricciones de integridad. Eso es lo que garantiza que dos solicitudes no ocupen el mismo espacio y horario.

### Stack

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Frontend | React 18 + TypeScript + Vite | UI rápida, tipado, curva corta para el equipo. |
| Backend | NestJS + TypeScript | Módulos = dominios; mismo lenguaje que el front. |
| Persistencia | PostgreSQL 16 | `EXCLUDE USING gist` / rangos para impedir solapes. |
| Acceso a datos | Prisma | Migraciones versionadas, SQL parametrizado (sin inyección). |
| Auth | Login propio: correo + contraseña, JWT corto + refresh en cookie HttpOnly | No depende del tenant Microsoft UdeA ni de Gestión Informática. |
| Entorno local | Docker Compose | Postgres + API + front reproducibles. |
| Calidad | ESLint, Prettier, tests (Jest / Playwright) | Requisitos y regresiones medibles. |

### Modelo de datos (núcleo)

Entidades mínimas para cumplir el objetivo sin sobre-diseñar:

- **User** — `id`, correo institucional, nombre, rol (`STUDENT` \| `STAFF` \| `ADMIN`), hash de contraseña (Argon2id).
- **Space** — escenario (cancha, pista, coliseo, etc.), campus, capacidad, reglas de uso, activo/inactivo.
- **TimeSlot / AvailabilityRule** — horarios habilitados y bloqueos (mantenimiento, eventos institucionales).
- **Reservation** — espacio, solicitante, intervalo `[start, end)`, estado (`PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED`), motivo, timestamps.
- **AuditLog** — quién cambió qué reserva y cuándo (trazabilidad para administración).

Regla de conflicto (objetivo 4), no solo en código:

```sql
-- Dos reservas APPROVED o PENDING no pueden solaparse en el mismo espacio.
EXCLUDE USING gist (
  space_id WITH =,
  tsrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status IN ('PENDING', 'APPROVED'));
```

La aplicación valida primero (respuesta clara al usuario); la base de datos es la última línea de defensa ante condiciones de carrera.

### Autenticación (login propio)

La UdeA autentica servicios institucionales con Microsoft Entra ID (cuenta `@udea.edu.co` + 2FA). Una prueba con cuenta de estudiante en el portal Azure devolvió **401** (`subscriptionId` vacío): el usuario institucional **no puede registrar aplicaciones** en el tenant. El SSO Microsoft exigiría consentimiento de Gestión Informática y retrasaría el MVP.

**Decisión PI1:** SportSpace tiene **login propio**. Microsoft SSO queda como evolución, si Informática registra la app.

Cómo funciona:

1. Registro con correo **`@udea.edu.co`** (se rechaza Gmail u otro dominio) + contraseña.
2. Login con esos mismos datos; SportSpace emite JWT. Las contraseñas se guardan solo como hash Argon2id.
3. Roles (`STUDENT`, `STAFF`, `ADMIN`) viven en nuestra base de datos, no en Microsoft.
4. Un primer usuario `ADMIN` se crea por semilla de desarrollo (no hay “olvidé mi contraseña institucional”).

Esto desbloquea la semana 7 sin tickets a Informática. El correo UdeA identifica a la comunidad; no sustituye el 2FA de Outlook/Teams.

### Seguridad (desde el diseño)

- HTTPS en todo ambiente no local; cabeceras con Helmet; CORS solo al origen del front.
- Contraseñas con Argon2id; JWT de acceso corto (≈15 min); refresh en cookie `HttpOnly`, `Secure`, `SameSite=Strict`.
- Registro limitado a `@udea.edu.co`.
- Autorización por roles: estudiante solicita y consulta las suyas; staff/admin aprueba, rechaza y gestiona espacios.
- Validación de DTOs (class-validator) y límites de tamaño/rango de fechas.
- Rate limiting en login (anti fuerza bruta) y en creación de reservas.
- Secretos solo en variables de entorno (nunca en Git). `.env.example` sin valores reales.
- Principio de menor privilegio: usuario de BD distinto de `postgres`, solo permisos del esquema de la app.
- Registro de auditoría en cambios de estado de reserva.
- Dependencias con `npm audit` en CI.

### Eficiencia (sin microservicios prematuros)

- Índices en `space_id`, `starts_at`, `user_id` y estado de reserva.
- Consulta de disponibilidad = una query por espacio y rango de fechas (no N+1).
- Catálogo de espacios cacheable en memoria (cambia poco); las reservas no se cachean como fuente de verdad.
- Paginación en listados de reservas.
- Pool de conexiones PostgreSQL; un solo hop de red por operación de reserva.

---

## Plan de trabajo (16 semanas)

Metodología: **cascada con retroalimentación** al cierre de cada fase. Si una revisión cambia un requisito, se ajusta el diseño o el código **antes** de cerrar la fase siguiente.

División inicial del equipo (ajustable):

| Persona | Enfoque principal | Apoyo |
| --- | --- | --- |
| Integrante A | Backend: auth, usuarios, seguridad | Docker, CI |
| Integrante B | Backend: espacios, disponibilidad, conflictos | Modelo de datos |
| Integrante C | Frontend: consulta, solicitud, panel admin | Pruebas E2E |

### Fase 1 — Análisis y requisitos (semanas 1–4)

**Meta:** entender el proceso UdeA y congelar un MVP.

- Mapear actores: estudiante / comunidad universitaria, administración de escenarios, sistema.
- Documentar el flujo actual (Portafolio, solicitud previa, confirmación por correo) y el flujo objetivo en SportSpace.
- Redactar requisitos funcionales y no funcionales (tiempo real de consulta, no doble reserva, roles, auditoría).
- Casos de uso del MVP: login, ver espacios, ver disponibilidad, solicitar, aprobar/rechazar, cancelar, ver mis reservas.
- Fuera de alcance PI1 (explícito): pagos, app nativa, integración real con Portafolio/Sede Electrónica, IoT de canchas.

**Entregable:** este README actualizado + lista de requisitos / casos de uso en `docs/requisitos.md`.

### Fase 2 — Diseño y preparación técnica (semanas 5–6) ← fase actual

**Meta:** arquitectura, datos, contratos de API y entorno listo para programar.

- Modelo ER y migraciones Prisma del núcleo.
- Contratos REST (OpenAPI): autenticación, espacios, disponibilidad, reservas.
- Mockups de: catálogo, calendario de disponibilidad, formulario de solicitud, bandeja de administración.
- Docker Compose (PostgreSQL + API + front).
- Decisiones de seguridad (JWT, roles, restricciones SQL).
- Convención de ramas: `main` estable; `feat/…`, `fix/…`; PRs pequeños.

**Entregable:** diagrama de arquitectura (arriba), esquema de BD, mockups, repositorio con estructura de carpetas y `.env.example`.

### Fase 3 — Núcleo funcional (semanas 7–10)

**Meta:** se puede consultar disponibilidad con datos reales (semilla).

| Semana | Backend | Frontend |
| --- | --- | --- |
| 7 | Scaffold NestJS + Prisma + login propio (registro `@udea.edu.co`, JWT, roles) | Scaffold Vite, rutas, pantallas login/registro |
| 8 | CRUD de espacios (solo admin/staff) | Listado y detalle de espacios |
| 9 | Motor de disponibilidad (reglas + reservas existentes) | Calendario / franjas libres-ocupadas |
| 10 | Semillas de escenarios tipo UdeA + autenticación en el front | Consulta filtrada por fecha, campus y tipo |

**Criterio de salida:** un usuario autenticado ve, para un espacio y una fecha, qué franjas están libres u ocupadas.

### Fase 4 — Reservas y validaciones (semanas 11–13)

**Meta:** ciclo completo de solicitud sin conflictos de horario.

| Semana | Trabajo |
| --- | --- |
| 11 | Crear reserva `PENDING`; listar “mis reservas”; cancelar si aún no inicia |
| 12 | Panel staff/admin: aprobar / rechazar con motivo; transición de estados |
| 13 | Restricción SQL de solape, prueba de condición de carrera (dos POST simultáneos), mensajes de error claros |

**Criterio de salida:** dos solicitudes al mismo espacio y horario no quedan ambas `APPROVED` (ni ambas `PENDING` si la política del MVP las bloquea al crear).

### Fase 5 — Pruebas, correcciones y pulido (semanas 14–15)

- Pruebas unitarias de dominio (solape, transiciones de estado, autorización).
- Pruebas de API (casos de uso del MVP).
- Prueba E2E del flujo estudiante + flujo administrador.
- Revisión de seguridad: secretos, headers, rate limit, roles en cada endpoint.
- Ajustes de UI (estados vacíos, carga, errores) y rendimiento de la consulta de disponibilidad.

**Criterio de salida:** checklist de requisitos con evidencia (capturas o reportes de test).

### Fase 6 — Informe y sustentación (semana 16)

- Artículo en formato IEEE: problema, arquitectura (y por qué no microservicios en PI1), implementación, pruebas, conclusiones.
- Presentación oral y demostración en vivo del flujo de reserva + rechazo de conflicto.

---

## Alcance del MVP (PI1)

Incluido:

- Autenticación propia (registro/login `@udea.edu.co`) y roles.
- Catálogo de espacios deportivos.
- Consulta de disponibilidad por espacio y fecha.
- Solicitud, aprobación, rechazo y cancelación de reservas.
- Prevención de solapes.
- Auditoría mínima de cambios de estado.

No incluido en PI1:

- Integración con Microsoft Entra ID / login institucional UdeA (requiere Gestión Informática).
- Integración con Portafolio, Sede Electrónica o correo masivo de producción.
- Pagos o cobros.
- Aplicación móvil nativa.
- Microservicios desplegados por separado.

Esos ítems quedan como trabajo futuro (PI2 o evolución), cuando haya volumen y un contrato institucional real.

---

## Estructura prevista del repositorio

```
SportSpace/
├── apps/
│   ├── api/          # NestJS — módulos users, spaces, reservations
│   └── web/          # React + Vite
├── docs/             # requisitos, mockups, evidencias de pruebas
├── docker-compose.yml
├── .env.example
└── README.md
```

Esta estructura se creará al iniciar la fase 2 de implementación. Hasta entonces el repositorio documenta objetivo, arquitectura y plan.

---

## Cómo se medirá el éxito

1. Un usuario consulta disponibilidad de un escenario y obtiene franjas coherentes con las reservas existentes.
2. Una solicitud se crea, se ve en “mis reservas” y cambia de estado por acción del administrador.
3. Un conflicto de horario se rechaza de forma determinista (aplicación + restricción en PostgreSQL).
4. Un estudiante no puede aprobar reservas ni editar espacios.
5. Las pruebas del MVP quedan documentadas para la evaluación del curso.

---

## Referencias (anteproyecto)

1. Picón Acosta, sistema de horarios e implementos deportivos, UIS, 2011.
2. Aglio Sánchez, prototipo web de alquiler de instalaciones, Universidad de Jaén, 2016.
3. Aplicación web de gestión de instalaciones deportivas, Universidad Politécnica de Madrid.
4. Daza et al., “Courtyard Reserva”, IJRSI, 2026.
5. Sa'adah et al., sistema de reserva de sport center con dashboard, 2025.
6. Universidad de Antioquia, [Espacios deportivos](https://www.udea.edu.co/).
