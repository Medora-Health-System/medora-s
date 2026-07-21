# Incident — Trackboard Prisma 500 (2026-07-20)

**Incident ID:** `MEDORA.PROD.TRACKBOARD_PRISMA_500_2026_07_20`  
**Priority:** P0

## Proven root cause (code path)

**Classification:** `A. CODE_AHEAD_OF_DATABASE` (+ `E. TRACKBOARD_QUERY_REGRESSION`)

`TrackboardService.getActiveEncounters` used:

```ts
prisma.encounter.findMany({ where, include: { patient, … } })
```

Without a parent `select`, Prisma selects **all Encounter scalars**, including D3B `hospitalEpisodeId`. When migration `20261024120000_hospital_episode_foundation_d3b` is **not** applied, PostgreSQL rejects the query.

**Expected Prisma signal:** `P2022` (column does not exist) on `Encounter.hospitalEpisodeId` — confirm from production logs once sanitized logging is deployed.

**Why feature flag OFF failed:** flag gates HospitalEpisode writers/services only; it does not change Prisma SQL generation for broad Encounter loads.

## Immediate restoration

**Method:** Forward-compatibility hotfix — explicit Trackboard / archive `select` omitting D3B fields.

Production migration was **not** applied as part of this remediation. `db push` / reset were **not** used.

## Permanent hardening

- Explicit Trackboard select contract + tests
- `pnpm db:compatibility:check` + startup/`/health` schema guard
- Sanitized Prisma error logging (`code`, `meta`, missing object, route, deployment SHA, alert group key)
- CI pre-/post-D3B smoke (`trackboard:smoke:pre-post-d3b`)
- Expand-and-contract rollout policy: `docs/operations/prisma-expand-contract-rollout.md`

## D3B migration SQL review

**Recommendation:** `MIGRATION_SAFE_TO_APPROVE` (additive enums/table/nullable FK; RESTRICT/SET NULL; no backfill; no auto episode creation). Apply only after separate approval and expand-first process.
