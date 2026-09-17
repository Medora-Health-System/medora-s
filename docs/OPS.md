# Ops notes (DB)

## API production deployment (CRITICAL)

**Runtime startup must not run database migrations.** They are a separate release/deploy step so migration locks, failures, or long-running DDL do not block process startup, health checks, or rolling deploys.

| Item | Value |
|------|--------|
| **API `start` script** (`@medora/api`) | `node dist/main.js` only |
| **Apply migrations (staging/production)** | From repo root: `pnpm --filter @medora/api migrate:deploy` (runs `prisma migrate deploy` in `apps/api`) |
| **Railway API pre-deploy** | `apps/api/railway.json` runs `pnpm --filter @medora/api migrate:deploy` before the new deployment starts. |
| **Order of operations** | Run **`migrate:deploy` successfully first** in the release/pre-deploy stage, then start/restart the API process. Do not rely on the Node process to migrate on boot. |
| **Health check** | `GET /health/ready` for Railway readiness after the process is up. |

### Railway one-time configuration

The API Railway service must use `apps/api/railway.json` as its config-as-code file (or use `apps/api` as the service root so Railway discovers that file). This is the one-time deployment setting that makes the pre-deploy migration gate effective. Do not configure the web service to use this API config.

After a deployment that contains migrations, verify from a Railway shell:

```bash
cd /app/apps/api
pnpm prisma migrate status
```

Expected result: `Database schema is up to date!` / no pending migrations. If Railway reports pending migrations, stop the release investigation there; do not treat the API deployment as migration-current until the pre-deploy configuration path is corrected.

**Regression guard:** `apps/api/scripts/validate-railway-deploy-config.cjs` and the Verify workflow fail if the Railway pre-deploy command disappears, `migrate:deploy` stops mapping to `prisma migrate deploy`, the runtime start script becomes migration-coupled, or the readiness path drifts.

CI reference: `.github/workflows/verify.yml` validates the Railway deployment contract and also runs `prisma migrate deploy` as its own step before API tests.

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
