# Startup rules (Medora-S monorepo)

Avoid bad installs, stale Next.js output, wrong working directory, and Prisma surprises.

## Expected repository root

The **pnpm workspace root** is the directory that contains **all** of the following:

| Path | Role |
|------|------|
| `pnpm-workspace.yaml` | Defines `apps/*` and `packages/*` |
| `package.json` | Root name **`medora-s`**, `private: true` |
| `pnpm-lock.yaml` | Single lockfile for the whole monorepo (see below) |
| `apps/api/` | Nest API |
| `apps/web/` | Next.js app |
| `packages/shared/` | `@medora/shared` |

**All** `pnpm --filter ...`, `pnpm install`, and the scripts in `scripts/` are intended to be run from **this directory only** — not from `apps/api`, `apps/web`, or a parent folder that only contains a clone “next to” another lockfile.

## How to verify you are at the correct root

```bash
./scripts/check-workspace-root.sh
```

Manual checks:

```bash
pwd
test -f pnpm-workspace.yaml && test -f package.json && grep -q '"medora-s"' package.json && echo "OK: looks like Medora-S root"
```

From root, `pnpm -w exec pwd` or `pnpm list -r --depth -1` should list workspace packages.

## Multiple lockfiles warning

- **Expected**: one **`pnpm-lock.yaml`** at the **monorepo root**.
- **Problem**: running `pnpm install` or `npm install` inside `apps/web` or `apps/api` can create an extra `package-lock.json` / nested `node_modules` and cause **wrong dependency resolution** or “works on my machine” drift.
- **Fix**: remove accidental nested lockfiles / `node_modules` under `apps/*` only after confirming with the team; then from **root**: `pnpm install`.

## When to clean `apps/web/.next`

Remove the Next.js build cache when you see **stale UI**, **wrong routes**, **layout not updating**, or after:

- Pulling branch changes that touch `apps/web/app/` layout, middleware, or `next.config.*`
- Switching branches with large Next / React changes
- Unexplained hydration or chunk errors

```bash
rm -rf apps/web/.next
```

Or: `./scripts/dev-reset.sh` or `./scripts/start-medora-dev.sh --clean-next` (see script help).

## When to rebuild `@medora/shared`

Rebuild when you change **source** under `packages/shared/src` (schemas, exports, types):

```bash
pnpm --filter @medora/shared build
```

Re-run after `pnpm install` if `dist/` is missing or TypeScript consumers complain about outdated types.

**Watch mode** (optional): `pnpm --filter @medora/shared dev`

## Prisma: generate vs migrate vs seed

Run **from repo root** with the API filter; commands execute in `apps/api` context via the package scripts.

| Situation | Command |
|-----------|---------|
| First clone / `schema.prisma` changed / `@prisma/client` out of sync | `pnpm --filter @medora/api prisma:generate` |
| **Local dev**: apply migrations and update DB | `pnpm --filter @medora/api prisma:migrate` (runs `migrate dev` in this repo) |
| **Production / CI deploy**: apply existing migrations only | `pnpm --filter @medora/api exec prisma migrate deploy` (or the project’s deploy script if wrapped) |
| Load seed data (dev) | `pnpm --filter @medora/api prisma:seed` |

**Rule of thumb**

- **generate** — regenerates the Prisma Client; no schema migration applied by itself.
- **migrate dev** — creates/applies migrations in development (do not use blindly on production DBs).
- **migrate deploy** — applies already committed migrations in staging/production.
- **seed** — dev/demo data; not for production unless you have a controlled process.

## Related

- [STABILITY_WORKFLOW.md](./STABILITY_WORKFLOW.md)
- `scripts/check-workspace-root.sh`
- `scripts/start-medora-dev.sh`
