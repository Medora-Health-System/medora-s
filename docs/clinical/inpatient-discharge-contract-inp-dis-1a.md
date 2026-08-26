# INP.DIS.1A — Canonical Inpatient Discharge Contract

**Phase:** INP.DIS.1A  
**Status:** Foundation — no provider/nursing discharge UI yet

## Authoritative store

`Encounter.dischargeSummaryJson` remains the **single** enterprise discharge aggregate (shared with ED/clinic). No new discharge table.

### Namespaced inpatient sections (typed, optional, empty until later phases)

| Key | Phase | Purpose |
|---|---|---|
| `inpatientProviderDischarge` | INP.DIS.1B | Provider diagnoses, hospital course, **final disposition**, authorization |
| `inpatientMedRecon` | INP.DIS.1C | Discharge medication reconciliation snapshot |
| `inpatientPatientInstructions` | INP.DIS.1C | Patient instructions snapshot |
| `inpatientNursingDischarge` | INP.DIS.1D | Nursing discharge execution |

Legacy flat keys (`dischargeMode`, `dischargeDiagnosisSummary`, ER 19Y arrays, etc.) remain readable.

## Planning vs authorization (preserved)

| Source | Role | May authorize discharge? |
|---|---|---|
| D4B.7 care coordination | CM/SW/UR planning | **No** |
| D3E.7 `dischargePlanning` ops | Workflow / EDD / planned destination | **No** — `READY` ≠ medically discharged |
| `inpatientProviderDischarge.finalDisposition` | Provider (future 1B) | Clinical disposition only when documented + authorized |

**Planned destination** (`plannedDestination`, D3E.7 ops, D4B.7 episodes) must never silently become **final disposition**.

## D4A.3.3A synthesis (fallback only)

`synthesizeInpatientDischargeSummaryDraft()`:

- Used for **print-time projection** when no clinician-authored content exists
- Marked `isSynthesizedDraftFallback: true`, `plannedDestinationNotFinalDisposition: true`
- Does **not** claim provider authorship
- Must **not** overwrite meaningful clinician-authored JSON
- Receives persisted ops `destination` and `workflowState` when available

Print path (INP.DIS.1A): `resolveInpatientDischargeForDisplay()` merges ephemeral draft — **no PATCH on print**.

## Single reader

`readEffectiveInpatientDischargeSummary()` / `resolveInpatientDischargeForDisplay()` — consumed by Summary and Print in INP.DIS.1F.

## D4B.7 + D3E.7 convergence (read-only)

`InpatientWorkspacePanel` fetches clinical ops and passes `legacyOps` into D4B.7 for `projectLegacyDischargeOps()`. **Projection only** — does not mutate ops.

D4B.7 episode persistence remains **client-local** (documented deferral from D4B.7 certification).

## EDD field

Canonical persisted field: `admissionSummaryJson.inpatientClinicalOpsV1.dischargePlanning.anticipatedDischargeDate`.  
**Not** `expectedDischargeDate` (removed from inpatient summary projection).

## Lifecycle discharge audit (documented — not changed in 1A)

`InpatientLifecycleService.dischargeEncounter()`:

- Requires open encounter + disposition string
- Writes `inpatientLifecycleV1.discharge` meta
- Closes encounter via enterprise lifecycle
- Does **not** require `dischargeSummaryJson`, provider authorization, or readiness gates

**INP.DIS.1E** will add readiness/authorization convergence. This phase does not weaken closure.

## INP.DIS.1B recommended scope

1. Inpatient provider discharge documentation UI (adapt ER 19Y patterns, hospital-specific content)
2. Persist under `inpatientProviderDischarge` + flat rollup mirrors
3. Server-side authorship snapshots on save
4. `finalDisposition` distinct from planned destination
5. API PATCH validation — no synthesis overwrite of authored content
