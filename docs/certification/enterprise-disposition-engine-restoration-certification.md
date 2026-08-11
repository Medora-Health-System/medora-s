# Enterprise disposition engine restoration certification

## Certified invariants

- Persisted encounter JSON, not React state or translated text, drives the board.
- HOME, ADMISSION, OBSERVATION, TRANSFER, AMA, LWBS, ELOPEMENT, and DECEASED resolve through the existing engine.
- OBSERVATION is ADMISSION plus authoritative observation level of care.
- Decision, readiness, physical departure, and closure remain independent.
- Signed admission uses provider/admin authorization, facility-scoped lookup/update, attribution, optimistic versioning, and idempotency.
- Existing correction metadata (`revision`, `previousPath`, `revisionReason`) is preserved.
- Summary and patient chart remain projections; no summary persistence was added.
- Hospital placement/correlation and duplicate prevention were not replaced.
- EN/FR labels use existing catalogs; canonical persisted values are unchanged.

## Final validation results

Certification verdict: **PASS**.

| Validation | Result |
|---|---|
| `npm run test --workspace=@medora/api -- --runInBand src/encounters/encounters.service.admission-decision.spec.ts` | Exit 0; 1/1 suite passed; 8/8 tests passed; 0 failed; no unexpected canonical admission validation failures. Expected rejection cases for missing primary diagnosis, missing condition status, stale version, and RN-only authority passed. |
| `npm run build --workspace=@medora/api` | Exit 0; shared TypeScript prebuild passed; Prisma Client 6.19.2 generated; NestJS compilation passed. |
| `npm run build --workspace=@medora/web` | Exit 0; shared prebuild passed; Next.js 15.5.13 compiled; lint/type validation passed; 173/173 static pages generated; route/bundle output completed. |
| `npm run test --workspace=@medora/shared -- --run src/encounters/edDispositionStateMachine.test.ts src/encounters/edEncounterLifecycle.test.ts` | Exit 0; 2/2 files passed; 24/24 tests passed; 0 failed. |
| `npm run test --workspace=@medora/web -- --run src/features/emergency/edDisposition19Z.test.ts` | Exit 0; 1/1 file passed; 25/25 tests passed; 0 failed. |
| `git diff --check` | Exit 0; no whitespace errors. |
| `git status --short --branch` | Clean branch `codex/restore-enterprise-disposition-engine` before this certification-only documentation update. |

Test total: **57 passed, 0 failed** across four test files and four completed suites. All required production builds and repository checks completed successfully.

Prisma schema changed: **NO**. Local migration required: **NO**. Production migration required: **NO**. Seed required: **NO**.

## Residual risks

No production system or data was accessed, so the exact historical Railway request body cannot be reconstructed. Safe canonical logging closes that diagnostic gap for subsequent failures. Feature-gated hospital placement behavior still depends on the target environment's existing configuration; no deployment, production migration, seed, or merge was performed during certification.
