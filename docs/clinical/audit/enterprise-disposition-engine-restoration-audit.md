# Enterprise disposition engine restoration audit

## Verdict

The disposition engine already exists and remains the authority. No new enum, encounter status, table, migration, or seed is required. The restoration is a wiring fix: the admission writer persists `Encounter.admissionSummaryJson`, while the ED board's badge reader previously recognized a non-observation admission only when the legacy `dischargeSummaryJson.dischargeMode` was also written. The governed UI deliberately stopped writing that duplicate in `5030b6d409a6fc31011e820928b3a9354d407bca`, leaving signed admissions invisible. Observation happened to remain visible through a fallback. The governed admission POST was introduced by `ae586c3d` and hardened by `32b3cfa3`/`17e0f080`.

## Current authoritative flow

| Step | File / function | Input | Output / persisted field | Authority owner |
|---|---|---|---|---|
| Provider selection | `EmergencyDispositionPanel.tsx` / `applyOutcomeFromUi` | canonical `ErDispositionOutcomeUi` | selected pathway board | authenticated provider UI |
| Form state | `EmergencyDispositionPanel.tsx` / `saveDecision` | pathway forms | governed request bodies | UI draft only |
| API payload | same / `apiFetch` | admission packet or disposition documents | `POST /encounters/:id/admission/decision`; `PATCH /encounters/:id` | API boundary |
| Validation | `patient.ts` / `encounterAdmissionDecisionDtoSchema` | JSON | typed admission command or coded 400 | shared schema |
| Mutation | `EncountersService.recordAdmissionDecision` / `update` | validated command, facility and actor | optimistic facility-scoped update | API service |
| Persistence | Prisma `Encounter` | merged documents | `admissionSummaryJson`, `dischargeSummaryJson`, `nursingAssessment.erDispositionV1`; audit/clinical events | Encounter legal record |
| State machine | `projectEdDispositionState` | persisted encounter snapshot | path, board, decision/readiness/departure/close projection | shared engine |
| ED lifecycle | `resolveEdEncounterLifecycleState` | same snapshot plus readiness | lifecycle projection | shared engine |
| Main ED board | `erDispositionBadgeFromEncounterJson` | trackboard persisted JSON | localized HOME/ADMISSION/OBSERVATION/TRANSFER/AMA/LWBS/ELOPEMENT/DECEASED badge | read projection |
| Hospital routing | admission service + internal placement/correlation authority | signed ADMISSION and LOC | placement/hospital episode correlation; no ED close | hospital transition engine |
| Summary / chart | emergency summary and clinical-record adapters | encounter JSON/events | read-only legal/chart projection | clinical record projection |

## Root causes

1. **Board regression:** `5030b6d` correctly removed an admission write to `dischargeSummaryJson`, but `erTrackboardDispositionBadge` still required that legacy mode for ordinary admission. This change restores the reader to `resolveEdDispositionPath` and reads canonical `admissionPacketV1.levelOfCareCode` (or requested encounter type) to distinguish observation.
2. **Admission 400 diagnosis:** admission signing is intentionally rejected for incomplete packets by the server (`ADMISSION_PRIMARY_DIAGNOSIS_REQUIRED`, service, level of care, condition, plan, and physician requirements). Pre-schema errors were returned only as `Invalid payload`, and the global filter logged neither route nor canonical code. The endpoint is `POST /encounters/:id/admission/decision`. Schema failures now return `ADMISSION_DECISION_INVALID_PAYLOAD`; all client-error logs include requestId, route, operation, and canonical code without payload or PHI. Repository-only audit cannot assert which specific validation Railway observed because production was not accessed and the historical log omitted it.

## Path and record audit

HOME, TRANSFER, AMA, LWBS, ELOPEMENT, and DECEASED persist their canonical discharge mode plus pathway-specific documentation. ADMISSION persists the governed admission summary/packet and decision attribution. OBSERVATION is ADMISSION with canonical observation level of care, not a second disposition. `resolveEdDispositionPath` is the common reader. The state machine preserves draft/sign/revision, readiness, physical departure, and closure as separate facts; a decision never closes an encounter. Summary, export, encounter clinical-record adapter, timeline, and patient chart read the encounter persistence rather than owning a copy.

Hospital placement remains feature-gated and uses the existing admission correlation and duplicate-prevention authorities. The ED encounter retains patient identity and stays open until departure/readiness/close requirements are independently met.

## History and residual risk

The available grafted history begins with `5030b6d`; no earlier verifiable last-known-good board commit exists in this checkout. `ae586c3` is the minimum admission writer recovery, `32b3cfa` added packet validation, and `17e0f08` added concurrency/idempotency. The board regression and generic 400 observability are related to that evolution but are distinct defects. Exact production payload failure remains unknowable without the omitted canonical code; future occurrences are now diagnosable safely.
