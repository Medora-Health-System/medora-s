# Prisma expand-and-contract rollout (Medora-S)

**Incident reference:** `MEDORA.PROD.TRACKBOARD_PRISMA_500_2026_07_20`

## Policy

Feature flags govern **behavior**, not schema existence.

Never deploy a Prisma client that **selects** a column/table before the database has received its additive migration.

`prisma db push`, `prisma migrate reset`, and unreviewed production migrations are **prohibited** for emergency remediation.

## DATABASE-EXPANDING RELEASE sequence

1. **Additive migration** — create tables/enums/nullable columns only; no destructive rewrites; no mandatory backfill; no automatic feature activation.
2. **Migration verification** — confirm `_prisma_migrations`, columns/tables/indexes, DB health, read-only smoke queries.
3. **Compatible application deployment** — code may read optional fields; writers remain OFF; null/absence handled; existing workflows unchanged.
4. **Controlled feature enablement** — staging / allowlist first; monitor errors.
5. **Later contract phase** — remove legacy paths only after evidence (e.g. D3C).

## Urgent application rollback

- Prefer rolling back **application** code that is not DB-compatible.
- Additive tables/nullable columns may remain.
- Do not automatically roll back destructive database changes.
- Do not delete migration files from Git to “fix” production.

## Why a feature flag did not protect Trackboard

Prisma `findMany({ include })` without a parent `select` emits SQL for **all scalar columns** on the generated client model — including `Encounter.hospitalEpisodeId` — even when `hospitalEpisodeFoundationEnabled` is OFF.

**Mitigation:** Trackboard uses an explicit reviewed `select` that omits D3B fields (`TRACKBOARD_ACTIVE_ENCOUNTER_SELECT`).

## Release checks

| Check | Command |
|-------|---------|
| Schema validate | `pnpm --filter @medora/api exec prisma validate` |
| Generate client | `pnpm --filter @medora/api exec prisma generate` |
| Compatibility | `pnpm db:compatibility:check` |
| Trackboard unit/contract | `pnpm trackboard:validate:critical` |
| Pre- + post-D3B smoke | `pnpm trackboard:smoke:pre-post-d3b` (requires `DATABASE_URL`) |

Startup / `/health` (when `NODE_ENV=production` or `MEDORA_SCHEMA_COMPAT_GUARD=true`):

- Missing **required** Trackboard columns → fail closed (process / 503).
- D3B optional objects missing + feature OFF → allow start **only** if runtime queries do not select those objects.
- Feature ON + D3B missing → fail closed.

## D3B migration review note

Migration folder: `apps/api/prisma/migrations/20261024120000_hospital_episode_foundation_d3b`

See clinical certification doc and the incident remediation report for `MIGRATION_SAFE_TO_APPROVE` / correction recommendations. Do not apply until separately approved.
