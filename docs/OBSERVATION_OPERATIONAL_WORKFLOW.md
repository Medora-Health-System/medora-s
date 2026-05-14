# Medora-S — Observation operational workflow (Phase 13B)

**Status:** Operational visibility + computed observation state only.  
**Depends on:** [OBSERVATION_POSITIONING.md](./OBSERVATION_POSITIONING.md) (Phase 13A terminology and compatibility rules).  
**Product readiness (Phase 13D):** [OBSERVATION_PRODUCT_READINESS.md](./OBSERVATION_PRODUCT_READINESS.md).

## 1. Audit summary — what already existed

| Area | Observation-capable behavior (before 13B) |
|------|---------------------------------------------|
| `EncounterType.INPATIENT` + `admittedAt` | Admission packet save sets `admittedAt`; encounter can be promoted from ER with handoff gates (`erHandoffV1`). |
| `EncounterWorkflowState` | Explicit pathway states (`ARRIVED` … `DISCHARGE_READY`, `DISPOSITION`, etc.) — **not** renamed in 13B. |
| Assignments | `physicianAssignedUserId`, `nurseAssignedUserId` + display relations on trackboard list. |
| Trackboard aggregates (10B) | Pending lab/imaging results, critical unacknowledged results, last ER nursing reassessment (`erNursingReassessmentV1` events). |
| ER LOS (`erLengthOfStay.ts`) | **Unchanged** — still anchored on `Encounter.createdAt` for ER tiles; observation uses a **separate** anchor (below). |
| Disposition / billing / chart export | **Not modified** in 13B — no new persisted disposition modes, no billing math, no export manifest schema changes. |

## 2. Operational lifecycle (conceptual)

1. Patient in **ER** may receive an admission packet and, after handoff rules, be promoted to **`INPATIENT`** (product language: observation / short stay).  
2. **Observation LOS** clock prefers **`admittedAt`** (first admission packet save), else **`createdAt`** as a defensive fallback.  
3. **Reassessment** visibility uses the same ER nursing reassessment event stream already aggregated for the trackboard (no new documentation automation).  
4. **Vitals age** for observation hints uses **`TriageVitalsReading.recordedAt`** (max per encounter) — facility-scoped SQL in the existing trackboard aggregate query.  
5. **Workflow** flags (`DISCHARGE_READY`, `DISPOSITION`, early `ARRIVED` / `TRIAGE`) drive compact badges on the observation board — display only.

## 3. Observation LOS philosophy

- **Additive:** `observationOps` JSON is attached only to **`INPATIENT`** rows returned by `GET /trackboard`; ER rows are unchanged.  
- **No negative durations:** LOS uses `Math.max(0, now - anchor)`.  
- **Timezone:** “Overnight” **UTC span** (`anchor` and `now` on different UTC calendar dates) is a **conservative operational hint**, not facility-local midnight (future: optional facility `timezone` if exposed safely to list endpoints).  
- **≥24h** is a separate **`extendedStay24h`** flag for prolonged short-stay visibility.

## 4. Reassessment philosophy

- **Operational only** — surfaces staleness vs. `OBSERVATION_REASSESSMENT_DUE_MS` (2h) and `OBSERVATION_REASSESSMENT_OVERDUE_MS` (4h) from `@medora/shared`.  
- Does **not** auto-create tasks, pages, or legal attestations.  
- When no reassessment event exists, thresholds are measured from the **observation LOS anchor** (admission clock).

## 5. Boarding definitions (INPATIENT board)

- **`boardingOperational`:** `workflowState` is `ARRIVED` or `TRIAGE` — early corridor in the shared workflow enum (not an inpatient floor census).  
- **ER “boarding” before promotion** remains in ER flows (`erHandoffV1`); not duplicated here.

## 6. Transfer / disposition holding rules

- **No auto-transfer, no auto-discharge.**  
- **`dispositionPhase`** is strictly `workflowState === DISPOSITION` — a **work-up phase** indicator, not a stored transfer order.  
- Persisted French disposition strings (e.g. `Admission / hospitalisation`) remain **unchanged** per Phase 13A compatibility.

## 7. Implementation map (Phase 13B)

| Layer | Responsibility |
|-------|----------------|
| `packages/shared/src/observationOperational.ts` | Pure `computeObservationOperationalSnapshot`, LOS anchor resolver, thresholds, unit tests. |
| `apps/api/src/trackboard/trackboard.service.ts` | Adds `lastTriageVitalsRecordedAt` to operational map; attaches `observationOps` for `INPATIENT` only. |
| `apps/web/.../HospitalizationBoardView.tsx` | Renders LOS + operational chips from API payload. |
| `apps/web/.../encounters/[id]/page.tsx` | Observation banner line (LOS + UTC overnight + ≥24h) using shared compute with **empty** trackboard ops (no vitals/reassessment counts on detail GET without extra calls). |

## 8. Billing / export / ROI impact

**None in 13B.** `observationOps` is omitted from chart exports and billing payloads by design (list endpoint only). Future phases may mirror **labels** into export headers without changing machine keys.

## 9. Deferred inpatient functionality (explicit non-goals)

- ICU, med-surg, enterprise bed / census engines, perioperative suites, auto-transfer/auto-discharge, MAR reconciliation expansion, multi-facility inpatient logistics — **out of scope** (see Phase 13A non-goals).

## 10. Migration

**None.** No Prisma schema changes in Phase 13B.

## 11. Verdict

**SAFE WITH CAUTION** — Safe because logic is additive, ER list payloads stay shape-compatible (new optional field only on `INPATIENT` rows), and billing/export/disposition persistence are untouched. Caution: UTC overnight is not the same as local “night under observation”; treat badge as an operational hint until facility timezone is wired in.
