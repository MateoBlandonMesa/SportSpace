# Plan de equipo — Dilan, Carlos y Mateo

Tres personas, **una rama por tarea**, PRs hacia `main`. No se programa en `main`. Código, API y BD en inglés; docs y copy de UI en español.

Hoy: fase 2 (aún no hay `apps/`). Primero un esqueleto común; después trabajo en paralelo.

---

## 1. Dueños

| Persona | Capa | HU Must | Carpetas que toca |
| --- | --- | --- | --- |
| **Dilan** | Auth, usuarios, seguridad, Docker, CI | HU-01–HU-04, HU-20 | `apps/api/src/auth`, `apps/api/src/users`, `docker-compose.yml`, CI |
| **Carlos** | Espacios, disponibilidad, reservas, dashboard API | HU-05–HU-07, HU-09–HU-16, HU-19 | `apps/api/src/spaces`, `apps/api/src/availability`, `apps/api/src/reservations` |
| **Mateo** | Frontend y E2E; integra PRs en `main` | Pantallas de todas las HU Must | `apps/web/**`, tests Playwright |

**Should (si hay tiempo):** HU-08 filtros — Mateo (UI) + Carlos (query params).

Nadie edita las carpetas de otro en su rama. El esquema Prisma es de **todos**, pero solo se cambia en PRs cortos y acordados (ver §3).

---

## 2. Git

```
main          ← estable; solo entra por PR
feat/scaffold ← sesión 0 (los tres, mergea Mateo)
feat/auth
feat/roles
feat/spaces
feat/availability
feat/reservations
feat/occupancy
feat/web-shell
feat/web-auth
feat/web-spaces
feat/web-reservations
feat/web-admin
```

Reglas:

1. Rama desde `main` actualizado: `git checkout main && git pull && git checkout -b feat/nombre`.
2. Nombres en **inglés**: `feat/…`, `fix/…`.
3. Commits chicos; un PR = una HU o un corte vertical (API de un módulo, o pantallas de un flujo).
4. Antes del PR: `git fetch origin && git merge origin/main` (o rebase) y resolver conflictos en local.
5. Review: al menos **una** persona que no sea el autor. Mateo confirma el merge a `main`.
6. Tras merge, borrar la rama remota y abrir la siguiente desde `main` nuevo.
7. No fusionar rama de Dilan **dentro** de la de Carlos (salvo que `main` ya tenga auth). La integración es `main`.

---

## 3. Sesión 0 — `feat/scaffold` (juntos, 1 bloque)

Sin esto, las tres ramas pelean por `package.json` y Prisma.

Hacer **en una sola sesión**, rama `feat/scaffold`, merge a `main` el mismo día:

- `apps/api` (NestJS) y `apps/web` (Vite + React + TypeScript)
- `docker-compose.yml` (PostgreSQL)
- Prisma con **todo** el núcleo: `User`, `Space`, `AvailabilityRule`, `Reservation`, `AuditLog`
- `.env.example`
- Módulos Nest vacíos: `auth`, `users`, `spaces`, `availability`, `reservations`
- Rutas React vacías: login, register, spaces, availability, my-reservations, admin

**Contrato que deja Dilan en el scaffold (stubs):** `JwtAuthGuard` y `RolesGuard` exportados desde `AuthModule`, aunque todavía no validen de verdad. Carlos y Mateo no inventan otro auth.

---

## 4. Trabajo en paralelo (después del scaffold)

### Dilan — `feat/auth` y luego `feat/roles`

| Orden | Rama | Qué entrega | Listo cuando |
| --- | --- | --- | --- |
| 1 | `feat/auth` | Registro `@udea.edu.co`, login JWT, logout, seed de un `ADMIN` | Gherkin `autenticacion.feature` (HU-01–HU-03) |
| 2 | (mismo PR o `feat/auth-guards`) | Guards reales + roles en endpoints | HU-04: `STUDENT` recibe 403 en crear espacio |
| 3 | `feat/roles` | Listar usuarios y cambiar rol; no dejar el sistema sin `ADMIN` | HU-20 / `administracion.feature` |
| Continuo | Docker/CI | `docker compose up` documentado; lint en PR | RNF-12 |

**No toca:** pantallas React ni lógica de solapes.

### Carlos — `feat/spaces` → `feat/availability` → `feat/reservations` → `feat/occupancy`

| Orden | Rama | Qué entrega | Depende de |
| --- | --- | --- | --- |
| 1 | `feat/spaces` | CRUD espacios, solo `STAFF`/`ADMIN`; listado activos | Scaffold; guards de Dilan en `main` (o stub) |
| 2 | `feat/availability` | Reglas de horario, bloqueos, GET disponibilidad del día | `feat/spaces` en `main` |
| 3 | `feat/reservations` | Crear `PENDING`, mis reservas, cancelar, aprobar/rechazar, transiciones, exclusión SQL | Auth + spaces + availability en `main` |
| 4 | `feat/occupancy` | Dashboard semanal (API) | Reservas en `main` |

**No toca:** login ni componentes de `apps/web` (Mateo consume su OpenAPI).

Mientras Dilan termina auth, Carlos puede escribir servicios y tests de solape **sin HTTP**, y colgar los controllers cuando existan los guards.

### Mateo — `feat/web-*`

| Orden | Rama | Qué entrega | Depende de |
| --- | --- | --- | --- |
| 1 | `feat/web-shell` | Layout, router, cliente HTTP, estados vacío/carga/error (español) | Scaffold |
| 2 | `feat/web-auth` | Login y registro | API `feat/auth` en `main` (o mock temporal) |
| 3 | `feat/web-spaces` | Catálogo y detalle | API `feat/spaces` |
| 4 | `feat/web-reservations` | Calendario, solicitar, mis reservas, cancelar | API availability + reservations |
| 5 | `feat/web-admin` | Bandeja aprobar/rechazar, dashboard, gestión de roles | API occupancy + roles |

**No toca:** Prisma ni módulos Nest. Si el API aún no está, mockea el contrato (mismos nombres en inglés que la API).

También arma Playwright contra los `.feature` de `docs/gherkin/` en fase 5.

---

## 5. Orden de merge a `main`

```
feat/scaffold
    → feat/auth
        → feat/spaces          → feat/availability → feat/reservations → feat/occupancy
        → feat/roles
    → feat/web-shell → feat/web-auth → feat/web-spaces → feat/web-reservations → feat/web-admin
```

No abrir `feat/reservations` ni `feat/web-reservations` hasta que disponibilidad esté en `main`.  
No abrir `feat/roles` hasta que `feat/auth` esté en `main`.

---

## 6. Cómo no pisarse

| Archivo / zona | Quién |
| --- | --- |
| `prisma/schema.prisma` | Cambio acordado en PR propio (`fix/schema-…`); avisar en el chat del equipo |
| `apps/api/src/auth`, `users` | Dilan |
| `apps/api/src/spaces`, `availability`, `reservations` | Carlos |
| `apps/web` | Mateo |
| `docker-compose.yml`, `.github` | Dilan |
| `docs/**` | Quien cambie el requisito; el otro revisa |

Si dos PRs tocan el mismo archivo, el segundo espera a que el primero esté en `main` y actualiza su rama.

---

## 7. Ritmo sugerido (desde ahora)

| Bloque | Dilan | Carlos | Mateo |
| --- | --- | --- | --- |
| Sesión 0 | Scaffold + Docker | Scaffold + Prisma | Scaffold + web shell |
| Siguiente | `feat/auth` | Modelo + `feat/spaces` (con stub de guard) | `feat/web-shell` |
| Luego | Guards + seed admin | `feat/availability` | `feat/web-auth` |
| Luego | `feat/roles` (HU-20) | `feat/reservations` + exclusión | `feat/web-spaces` y calendario |
| Luego | CI, rate limit | `feat/occupancy` (HU-19) | `feat/web-reservations` + admin |
| Fase 5 | Tests API auth | Tests solape / carrera | E2E Gherkin |

---

## 8. Definición de “listo para unir”

Un PR se mergea si:

1. Compila y los tests de esa rama pasan.
2. Identificadores en inglés; textos de UI en español.
3. Cumple los escenarios Gherkin de las HU que cubre (aunque aún sean manuales).
4. No rompe `main` (auth sigue funcionando, etc.).
5. README / `docs/requisitos.md` actualizados si cambió alcance o contrato.
