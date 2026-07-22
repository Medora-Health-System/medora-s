# Medora S – Agent Instructions

## Cursor Cloud specific instructions

### Overview

Medora S is a healthcare/ER management system — a monorepo with three packages:

| Package | Path | Description |
|---------|------|-------------|
| `@medora/api` | `apps/api` | NestJS 11 backend (port 3001) |
| `@medora/web` | `apps/web` | Next.js 15 frontend (port 3002 dev) |
| `@medora/shared` | `packages/shared` | Shared TypeScript types, Zod schemas |

PostgreSQL 16 is the only infrastructure dependency (via Docker Compose at `infra/docker/docker-compose.yml`).

### Package manager

Despite `pnpm-workspace.yaml` existing, use **npm** — the `pnpm-lock.yaml` is broken (does not contain real dependencies). The `package-lock.json` is the real lockfile and root `package.json` scripts use `npm run ... --workspaces`.

### Starting services

1. **PostgreSQL**: `sudo docker compose -f infra/docker/docker-compose.yml up -d`
   - Env file: copy `infra/docker/.env.example` → `infra/docker/.env` if missing
2. **Shared package build** (must run before API/web): `npm run build --workspace=@medora/shared`
3. **API env**: copy `apps/api/.env.example` → `apps/api/.env` if missing. **Delete** `apps/api/prisma/.env` if it exists (conflicts with `apps/api/.env`).
4. **Prisma**: `npm run prisma:generate --workspace=@medora/api && npm run prisma:migrate --workspace=@medora/api`
5. **Seed**: `npm run prisma:seed --workspace=@medora/api` (roles, facilities, admin user), then optionally `npm run prisma:seed-catalogs --workspace=@medora/api` and `npm run prisma:seed-pathways --workspace=@medora/api`
6. **Admin user**: `ADMIN_EMAIL=admin@medora.local ADMIN_PASSWORD='Admin123!' npm run create-admin --workspace=@medora/api`
7. **API server**: `npm run dev --workspace=@medora/api` (port 3001)
8. **Web server**: `PORT=3002 npm run dev --workspace=@medora/web` (port 3002)

### Running checks

- **Lint**: `npm run lint` — all three packages have placeholder lint scripts (not yet configured)
- **Tests**: `npm run test --workspace=@medora/shared` (vitest, passes), `npm run test --workspace=@medora/api` (jest — unit test passes, e2e tests fail due to pre-existing shared-package module resolution issue with Jest/ESM)
- **Build**: `npm run build --workspace=@medora/shared && npm run build --workspace=@medora/api && npm run build --workspace=@medora/web`

### Default credentials

- Email: `admin@medora.local` / Password: `Admin123!`

### Known pre-existing issues

- **Global guard ordering**: `app.module.ts` registers a global `APP_GUARD` `RolesGuard` (from `common/auth/roles.guard.ts`) that runs before the controller-level `AuthGuard("jwt")`. This causes all protected API endpoints with `@RequireRoles(...)` to return 403 "Authentication required" because `req.user` is null when the global guard checks it. Unprotected endpoints (`/health`, `/auth/login`, `/auth/me`) work fine.
- **Jest e2e tests**: `auth.e2e.spec.ts` and `rbac.e2e.spec.ts` fail because Jest's `moduleNameMapper` maps `@medora/shared` to the TypeScript source which uses `.js` extensions in ESM imports that Jest cannot resolve.
- **Track Board `apiFetch` double prefix**: `app/app/page.tsx` passes `/api/backend/trackboard?status=OPEN` to `apiFetch()` which already prepends `/api/backend`, causing a double-prefix URL.

### Docker in Cloud Agent VMs

Docker requires `fuse-overlayfs` storage driver and `iptables-legacy`. The update script handles Docker startup. If Docker daemon is not running, start with: `sudo dockerd &>/tmp/dockerd.log &`
