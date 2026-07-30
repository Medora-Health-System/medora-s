# MEDUI.D4C.7K Certification (amended)

**Feature:** Enterprise Encounter Lifecycle Authority, Closure, Reopen, and Timeline  
**Status:** Implemented pending review (uncommitted; do not commit/push/merge in this session)  
**Amendment:** certification corrections (platform-admin route access, required lifecycle dependency, migration timestamp, `dischargedAt` ownership, reopen field semantics, UI rollout wording)

## Certification checklist

| Requirement | Status |
|---|---|
| One enterprise lifecycle authority | ✔ `EnterpriseEncounterLifecycleService` owns status, `closedAt`, `closedByUserId`, reopen fields, lifecycle version, timeline row |
| Enterprise close routes through the authority | ✔ `EncountersService.close` → `applyCloseTransition` (no legacy close path) |
| Lifecycle dependency required | ✔ Required constructor injection; no `@Optional()`, no conditional execution, no fallback |
| D4C.7J preserved (advisory + ack + idempotency) | ✔ Extended, not replaced |
| CLOSE: Provider, RN, Facility ADMIN, platform admin | ✔ Shared `CLOSE_ENCOUNTER` + route roles |
| REOPEN: Facility ADMIN + platform admin only | ✔ `REOPEN_ENCOUNTER` |
| Platform admin reaches close / reopen / lifecycle-timeline | ✔ `AllowPlatformPrincipalWithFacilityContext` + `resolvePlatformPrincipalAccess` (explicit active facility context required) |
| Platform action recorded in audit | ✔ `platformPrincipal`, `crossFacilitySupportAction`, `facilityContextId`, `supportPolicyOverride` |
| `closedAt` separated from `dischargedAt` | ✔ Generic close never writes `dischargedAt`; discharge workflows own it |
| Reopen clears operational closure fields | ✔ `closedAt` / `closedByUserId` set to `null`; history stays in the timeline |
| Reopen immutable transition | ✔ `ENCOUNTER_REOPENED` timeline row + `ENCOUNTER_REOPEN` audit |
| Signed documentation preserved | ✔ No unlock call; flags false |
| Billing preserved | ✔ No billing reopen; warning when finalized |
| Prescriptions preserved | ✔ Explicit false flag |
| Room/bed not auto-restored | ✔ `roomLabel` stays null |
| Inpatient lifecycle unified | ✔ `dischargeEncounter` → `applyCloseTransition` with explicit `forceDischargedAt` |
| Lifecycle timeline implemented | ✔ `EncounterLifecycleTransition` + `GET /encounters/:id/lifecycle-timeline` |
| Migration | ✔ Additive `20260730130000_enterprise_encounter_lifecycle_reopen_d4c7k` (not future-dated; unique prefix) |
| Seed | ✔ None (code-defined permissions) |

## Enterprise domain audit

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Encounter close authority | `EncountersService.close` (D4C.7J advisory) | ✔ | ✔ | ✔ |
| Encounter status transition map | `common/workflow/encounter.transitions.ts` | ✔ | ✔ (`CLOSED → OPEN`) | ✔ |
| Clinical audit trail | `AuditService` | ✔ | ✔ (`ENCOUNTER_REOPEN`) | ✔ |
| Clinical timeline | `EncounterLifecycleTransition` (new enterprise table, single owner) | — | ✔ | ✔ |
| Inpatient discharge | `InpatientLifecycleService.dischargeEncounter` | ✔ | ✔ | ✔ |
| Platform principal resolution | `auth/platform-principal.ts` | ✔ | ✔ (`resolvePlatformPrincipalAccess`) | ✔ |

## Close / discharge ownership

**`EnterpriseEncounterLifecycleService` owns:** encounter status transition, `closedAt`, `closedByUserId`,
`reopenedAt`, `reopenedByUserId`, `reopenReason`, `reopenReasonCode`, `reopenCount`, lifecycle version
increment, the immutable `EncounterLifecycleTransition` event, and the close/reopen audit context.

**Discharge workflows own:** `dischargedAt`, discharge disposition, discharge summary, and
discharge-specific clinical effects. Generic close never writes `dischargedAt` — not for ambulatory,
not for EMERGENCY, not for INPATIENT. ED / observation / inpatient / ambulatory discharge workflows set
it through their explicit discharge path (`discharge` payload, `dischargeStatus`, or
`forceDischargedAt` from `InpatientLifecycleService`).

## UI rollout status by care setting

| Layer | Status |
|---|---|
| Enterprise lifecycle engine (close, reopen, timeline) | Complete — all care settings, no per-setting deferral |
| Reopen API (`POST /encounters/:id/reopen`) | Complete |
| Lifecycle timeline API (`GET /encounters/:id/lifecycle-timeline`) | Complete |
| Shared UI component (`EnterpriseReopenEncounterAction`) | Complete |
| Clinic Care (ambulatory) closed-encounter adapter | Complete and tested |
| ED / Hospital / Observation / Inpatient closed-encounter surface adapters | **Deferred to D4C.7K.5A** |

Backend lifecycle authority is **not** deferred by care setting: ED, hospital, observation and inpatient
encounters can already be reopened through the enterprise API and appear in the lifecycle timeline. Only
their closed-encounter list affordances are pending.

## Known deferrals

1. ED / Hospital / Observation / Inpatient closed-encounter surface adapters → **D4C.7K.5A** (shared component ready).
2. Dental live reopen worklist surfaces remain thin until dental encounter queues exist.
3. Automatic MFA step-up for reopen deferred.
4. No historical `closedAt` backfill from `dischargedAt` (intentionally left null for legacy rows).
5. Migration prefix reflects the July 2026 implementation period, so it sorts before the repository's
   pre-existing October-2026-dated migrations. Verified dependency-safe: every table and enum it touches
   (`Encounter`, `Facility`, `Patient`, `User`, `AuditAction`) is created by earlier migrations, and no
   later migration depends on it.

## Tests

| Area | Spec |
|---|---|
| Shared lifecycle policy, `dischargedAt` policy, platform context | `packages/shared/src/auth/enterpriseEncounterLifecycleAuthorityD4c7k.test.ts` |
| D4C.7J advisory behavior unchanged | `packages/shared/src/auth/enterpriseEncounterClosureAdvisoryOverrideD4c7j.test.ts`, `apps/api/src/encounters/encounters.service.close-advisory-d4c7j.spec.ts` |
| Platform-admin route access, facility context, cross-facility denial, facility scoping | `apps/api/src/common/guards/roles.guard.platform-principal-d4c7k.spec.ts` |
| Reopen semantics, timeline preservation, multiple cycles, projections | `apps/api/src/encounters/enterprise-encounter-lifecycle.service.spec.ts` |
| Required dependency, no legacy fallback, `dischargedAt` ownership | `apps/api/src/encounters/encounters.service.close-advisory-d4c7j.spec.ts` |
| Migration ordering, wiring, no optional injection | `apps/api/src/encounters/enterprise-encounter-lifecycle-d4c7k-integrity.spec.ts` |
| Inpatient discharge unification | `apps/api/src/encounters/inpatient-lifecycle.service.spec.ts` |
| Web reopen affordance + reopened-encounter classification | `apps/web/src/features/clinic-care/clinicCareEnterpriseEncounterLifecycleAuthorityD4c7k.test.ts` |

## Certification recommendation

Ready for review and commit. Backend lifecycle authority, reopen API, timeline, audit, and the Clinic Care
UI adapter are complete; the remaining ED/Hospital/Observation/Inpatient surface adapters are recorded as
D4C.7K.5A.
