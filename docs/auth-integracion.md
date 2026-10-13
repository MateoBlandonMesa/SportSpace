# Integración de auth (para Carlos)

`feat/auth` no se mergea a `main`. Era un NestJS en la raíz; el repo oficial es el monorepo (`apps/api` + `apps/web`).

La lógica de Carlos se portó a **`feat/auth-integrate`** → `apps/api/src/auth/`.

## Qué reutilizar (ya copiado y adaptado)

| Tu archivo en `feat/auth` | Dónde quedó |
| --- | --- |
| `src/modules/auth/auth.service.ts` | `apps/api/src/auth/auth.service.ts` |
| `src/modules/auth/auth.controller.ts` | `apps/api/src/auth/auth.controller.ts` |
| `src/modules/auth/dto/*` | `apps/api/src/auth/dto/` (`name` extra: el `User` de main lo exige) |
| `src/modules/auth/guards/*` | `apps/api/src/auth/jwt-auth.guard.ts` y `roles.guard.ts` (mismo path que los stubs de Dilan) |
| `src/modules/auth/strategies/jwt.strategy.ts` | `apps/api/src/auth/jwt.strategy.ts` |
| `src/modules/auth/decorators/roles.decorator.ts` | Ya existía: `apps/api/src/auth/roles.decorator.ts` |

## Qué no hay que traer

- `package.json`, `src/main.ts`, `prisma/schema.prisma` de la raíz
- Prefijo `/api/v1` → se queda `/api`
- `DatabaseService` → se usa `PrismaService`
- Nest 12 / Prisma 5 → el repo usa Nest 10 / Prisma 6
- README de `sportspace-backend`

## Endpoints actuales

- `POST /api/auth/register`
- `POST /api/auth/login` (cookie `refreshToken` en `/api/auth`)
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/profile`

Siguientes cambios de auth: ramas desde `main` hacia `apps/api/src/auth`, no otro proyecto en la raíz.
