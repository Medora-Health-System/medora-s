# MEDORA.RD.P0.1 Evidence Report — Immutable Provider Documentation Versions

## Scope guard

- This report covers only **MEDORA.RD.P0.1** evidence hardening.
- No architecture, schema, UI, snapshot-content, or P0.2 scope is introduced by this update.

## Evidence matrix update

| ID | Status | Evidence |
| --- | --- | --- |
| IMM-10 | PASS — **true concurrency** | `apps/api/src/encounters/provider-documentation-versions.e2e.spec.ts` → `IMM-10 true concurrency: two concurrent sign attempts yield one success, one canonical conflict, no duplicates, no orphan history` |

## Clarification

- `apps/api/src/encounters/encounters.service.provider-documentation-versions.spec.ts` keeps a deterministic simulated stale-write assertion as **IMM-10a** (forced conflict path), while IMM-10 PASS claims rely on the executed true-concurrency e2e test above.
