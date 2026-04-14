# Ops notes (DB)

## API production deployment (CRITICAL)

**Runtime startup must not run database migrations.** They are a separate release/deploy step so migration locks, failures, or long-running DDL do not block process startup, health checks, or rolling deploys.

| Item | Value |
|------|--------|
| **API `start` script** (`@medora/api`) | `node dist/main.js` only |
| **Apply migrations (staging/production)** | From repo root: `pnpm --filter @medora/api migrate:deploy` (runs `prisma migrate deploy` in `apps/api`) |
| **Order of operations** | Run **`migrate:deploy` successfully first** (or in a dedicated release job), then start/restart the API process. Do not rely on the Node process to migrate on boot. |
| **Health check** | `GET /health` — use for load balancer readiness after the process is up; it does not verify migration state. |

**Regression guard:** If a host (PaaS, Docker, systemd) is configured with a custom start command, it must **not** prepend `prisma migrate deploy` to `node dist/main.js` unless you intentionally accept coupled startup (not recommended).

CI reference: `.github/workflows/verify.yml` runs `prisma migrate deploy` as its **own step** before API e2e tests — same separation pattern.

## Facility creation (platform owner)

Only **`atranchant@medora.local`** is the platform principal: `POST /admin/facilities`, listing inactive facilities, and facility language/activation toggles are enforced server-side by that fixed email (see `apps/api/src/auth/platform-principal.ts`). `/auth/me` exposes `canCreateFacilities: true` only for that account.

The seed creates that user with the same demo password as other seed accounts (`Admin123!`) and sets `User.canCreateFacilities = true` only for that row. A **partial unique index** on `User` ensures at most one row has `canCreateFacilities = true`.

Do **not** grant platform powers by flipping `canCreateFacilities` for other emails; it will not work (authorization is email-based). For a new environment, run migrations and seed, or create `atranchant@medora.local` with the correct password and role assignments, then rely on the migration/unique index for the flag.

Re-login or refresh the session so `/api/auth/me` reflects changes.

## Prisma Migration Rules (CRITICAL)

- All migrations must have a unique timestamp prefix (YYYYMMDDHHMMSS)
- Timestamps must be strictly increasing
- Migration order defines execution — Prisma does not resolve dependencies
- Never commit multiple migrations with identical timestamps
- If a migration depends on another, ensure its timestamp is later
- Always verify with `prisma migrate reset` before pushing
