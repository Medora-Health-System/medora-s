# Encounter query contracts

Incident: `MEDORA.P0.ENCOUNTER_SHARED_QUERY_HARDENING`

## Problem

Prisma generates SQL for **every scalar** on `Encounter` when a query uses:

- bare `findFirst` / `findMany` / `update` / `create` without `select`
- `include` on `Encounter` without a parent `select`

If the generated client includes `hospitalEpisodeId` (post-D3B schema.prisma) but the deployed database has **not** applied D3B, those queries fail with **P2022** even when the Hospital Episode feature flag is **OFF**. Feature flags do not change Prisma SQL generation.

## Rule

Core Encounter loading must use an **explicit reviewed select**. D3B/D3C fields and relations are **optional enrichment** only when:

1. the schema objects exist, **and**
2. the runtime feature requires them.

## Named contracts

Defined in `apps/api/src/encounters/encounter-query-contracts.ts`:

| Contract | Use |
|---|---|
| `ENCOUNTER_CORE_SELECT` | Scalar clinic fields (no D3) |
| `ENCOUNTER_ACCESS_SELECT` | Gates / concurrency |
| `ENCOUNTER_DETAIL_SELECT` | `GET /encounters/:id` |
| `ENCOUNTER_DISPOSITION_SELECT` | Disposition readiness |
| `ENCOUNTER_TRIAGE_SELECT` | Triage GET/PUT gate |
| `ENCOUNTER_MEDICATION_SELECT` | Medication administrations |
| `ENCOUNTER_DOCUMENTATION_SELECT` | Alias of detail |
| `ENCOUNTER_NESTED_CORE_SELECT` | Nested `encounter` on Order / etc. |
| `ENCOUNTER_LIST_SELECT` | Patient encounter lists |
| `ENCOUNTER_OPEN_EXISTENCE_SELECT` | Open-encounter existence |

Trackboard uses `TRACKBOARD_ACTIVE_ENCOUNTER_SELECT` in `trackboard-encounter-select.ts` (same rule; separate projection).

Shared loaders: `apps/api/src/encounters/encounter-loader.ts`.

## Compatibility guard

`apps/api/src/prisma/schema-compatibility.ts` validates:

- required Encounter columns for Trackboard + `ENCOUNTER_CORE_SELECT`
- feature flags vs D3B/D3C schema presence
- **runtime query contracts** via `assertAllEncounterQueryContractsExcludeD3()`

Verdict `UNSAFE_RUNTIME_QUERY_CONTRACT` fails health/startup when contracts leak D3 fields.

## Static CI

```bash
pnpm encounter:validate:static
```

Fails on `encounter: true`, `encounter: { include`, missing `select` on `prisma.encounter.*`, and non-allowlisted `hospitalEpisode*` references.

## Smoke

```bash
pnpm encounter:smoke:schema
# optional disposable DB:
pnpm encounter:smoke:pre-post-d3b
```
