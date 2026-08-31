# Medora S – Agent Instructions

## Cursor Cloud specific instructions

### Overview

Medora S is a healthcare/ER management system — a monorepo with three packages:

| Package | Path | Description |
|---------|------|-------------|
| `@medora/api` | `apps/api` | NestJS 11 backend (port 3001) |
| `@medora/web` | `apps/web` | Next.js 15 frontend (port 3002 dev) |
| `@medora/shared` | `packages/shared` | Shared TypeScript types, Zod schemas |

PostgreSQL 16 is the only infrastructure dependency. Locally it can run via Docker Compose (`infra/docker/docker-compose.yml`), but Docker is **optional / not guaranteed** in Cloud Agent VMs — a **native** PostgreSQL 16 install is acceptable for a disposable agent database (see "Reproducible Cloud Agent environment" below).

### Package manager

Use **pnpm** — it is pinned by the root `package.json` `packageManager` field (currently `pnpm@10.32.1`) and is authoritative for this monorepo. Activate it with `corepack prepare "$(node -e "process.stdout.write(require('./package.json').packageManager)")" --activate`.

**Do not use `npm install` / `npm ci`**: the workspaces (`apps/api`, `apps/web`) declare `@medora/shared` as `"workspace:*"`, which npm cannot parse (`EUNSUPPORTEDPROTOCOL "workspace:"`). pnpm resolves the workspace protocol natively.

### Reproducible Cloud Agent environment

`.cursor/environment.json` reproduces this setup for future Cloud Agents:

- **install** (`.cursor/scripts/cloud-agent-install.sh`, one-time): ensure/start native PostgreSQL 16, ensure a disposable `medora` role + database, write local `.env` files (JWT secrets generated locally — never committed), `pnpm install`, build `@medora/shared`, `prisma generate`, `prisma migrate deploy`, core seed + bootstrap facilities, and create a dev admin. Idempotent and safe to re-run.
- **start** (`.cursor/scripts/cloud-agent-start.sh`, per-boot): only ensure the local PostgreSQL cluster is running. It does **not** re-install, build, migrate, or seed.
- **terminals**: API (`pnpm --filter @medora/api dev`, :3001) and Web (`PORT=3002 pnpm --filter @medora/web dev`, :3002).

### Starting services

For a fresh disposable agent, `bash .cursor/scripts/cloud-agent-install.sh` does all of the following. Manual equivalents:

1. **PostgreSQL 16**: native (`sudo pg_ctlcluster 16 main start`) or Docker Compose (`sudo docker compose -f infra/docker/docker-compose.yml up -d`, env file `infra/docker/.env.example` → `infra/docker/.env`). Ensure a disposable `medora` database exists.
2. **Shared package build** (must run before API/web): `pnpm --filter @medora/shared build`
3. **API env**: copy `apps/api/.env.example` → `apps/api/.env` if missing. **Delete** `apps/api/prisma/.env` if it exists (conflicts with `apps/api/.env`).
4. **Prisma**: `pnpm --filter @medora/api prisma:generate` as needed, then apply migrations — see the Prisma strategy note below.
5. **Seed**: `pnpm --filter @medora/api prisma:seed:core` (roles + geo) and `pnpm --filter @medora/api seed:bootstrap-facilities` (DR/HT facilities + departments). Optionally `prisma:seed-catalogs` / `prisma:seed-pathways`.
6. **Admin user** (dev-only, idempotent): `ADMIN_EMAIL=admin@medora.local ADMIN_PASSWORD='Admin123!' pnpm --filter @medora/api create-admin`
7. **API server**: `pnpm --filter @medora/api dev` (port 3001)
8. **Web server**: `PORT=3002 pnpm --filter @medora/web dev` (port 3002)

#### Prisma migration strategy — authoring vs. applying

- **Applying existing migrations to a fresh disposable DB** (Cloud Agent boot, CI, local reset): use **`pnpm --filter @medora/api migrate:deploy`** (`prisma migrate deploy`). It is non-interactive and only applies already-committed migrations.
- **Do NOT run `prisma migrate dev`** (`prisma:migrate`) in unattended Cloud Agent automation — it is interactive (prompts to name/author migrations) and will hang, and it may attempt to author new migrations. It is for local developer migration authoring only.
- **Never run `migrate deploy` against a production database as part of environment setup.** In Cloud Agent context it targets only the disposable local `medora` database.

### Running checks

- **Lint**: `pnpm -r lint` — all three packages have placeholder lint scripts (not yet configured)
- **Tests**: `pnpm --filter @medora/shared test` (vitest, passes), `pnpm --filter @medora/api test` (jest — unit test passes, e2e tests fail due to pre-existing shared-package module resolution issue with Jest/ESM)
- **Build**: `pnpm --filter @medora/shared build && pnpm --filter @medora/api build && pnpm --filter @medora/web build`

### Default credentials

- Email: `admin@medora.local` / Password: `Admin123!`

### Known pre-existing issues

- **Global guard ordering**: `app.module.ts` registers a global `APP_GUARD` `RolesGuard` (from `common/auth/roles.guard.ts`) that runs before the controller-level `AuthGuard("jwt")`. This causes all protected API endpoints with `@RequireRoles(...)` to return 403 "Authentication required" because `req.user` is null when the global guard checks it. Unprotected endpoints (`/health`, `/auth/login`, `/auth/me`) work fine.
- **Jest e2e tests**: `auth.e2e.spec.ts` and `rbac.e2e.spec.ts` fail because Jest's `moduleNameMapper` maps `@medora/shared` to the TypeScript source which uses `.js` extensions in ESM imports that Jest cannot resolve.
- **Track Board `apiFetch` double prefix**: `app/app/page.tsx` passes `/api/backend/trackboard?status=OPEN` to `apiFetch()` which already prepends `/api/backend`, causing a double-prefix URL.

### Docker in Cloud Agent VMs

Docker is **optional and not guaranteed** in Cloud Agent VMs (it may be entirely absent). Prefer a **native** PostgreSQL 16 install for the disposable agent database (this is what `.cursor/scripts/cloud-agent-install.sh` does). If you do need Docker and the daemon is not running, it requires the `fuse-overlayfs` storage driver and `iptables-legacy`, and can be started with: `sudo dockerd &>/tmp/dockerd.log &`
