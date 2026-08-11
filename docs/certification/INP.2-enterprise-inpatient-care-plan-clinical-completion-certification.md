# INP.2 certification

**Status: NOT CERTIFIED.** Persistence/API/workspace activation are implemented, but the migration deployment, full regression matrix, Overview/Summary/chart/export adapters, and production-ready RT/rehab role mapping remain release blockers.

## Persistence and migration

Migration `20261106120000_inp2_enterprise_care_plan_authority` is additive: four canonical enums, five tables, required indexes, restrictive legal-record foreign keys, and meaningful clinical-event enum values. It does not alter or remove `admissionSummaryJson`.

## Certified invariants

- One patient-specific enterprise aggregate; no unit/discipline forks and no JSON write store.
- Server-derived facility, patient, encounter, actor, role, and timestamps.
- Immutable activation template snapshot and append-only progress/review/transition history.
- Optimistic concurrency on every mutation.
- INPATIENT-only activation; Emergency and Observation mutation denied.
- Canonical locale-neutral persisted codes; historical EN/FR localization keys are snapshotted; authored text is not translated.
- No care-plan API authority over orders, MAR, medications, diagnoses, problem list, results, precautions, discharge, or encounter closure.

## Release requirement

Production migration is required. Seed is not required. Deployment, migration, and merge are explicitly outside this implementation run.
