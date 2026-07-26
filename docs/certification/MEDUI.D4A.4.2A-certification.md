# MEDUI.D4A.4.2A — Inpatient Census Duplicate Prevention Certification

**Decision: CERTIFIED WITH DOCUMENTED DATA REMEDIATION**

**Branch:** `d4a4-2a-inpatient-census-duplicate-prevention`
**Date:** 2026-07-26
**Certification ID:** `MEDUI.D4A.4.2A.INPATIENT_CENSUS_DUPLICATE_PREVENTION`

---

## 1. Duplicate identity confirmation

| Finding | Evidence |
|---|---|
| Identifier shown as `MS-2026-5D1E2DFD` | **MRN** format from `apps/api/src/utils/mrn.ts` (`MS-{year}-{hex}`), **not** encounter number |
| Board shows same patient twice with rooms `MS-1` and `3` | Two distinct OPEN `INPATIENT` encounter IDs for one `patientId` |
| Live DB | Local Postgres unreachable at audit time — root cause proven via code paths + characterization fixtures matching the screenshot pattern |
| Join fan-out? | **No.** `findOpenHospitalEncountersForCensus` is a flat `Encounter` findMany (no bed/placement join) |

**Canonical row key:** `encounterId` (encounter-authoritative). Patient ID / MRN / name are display only and must never be the sole dedupe key.

---

## 2. Census data-flow trace

```
Prisma Encounter (OPEN + type=INPATIENT)
  → SchemaCompatibleEncounterRepository.findOpenHospitalEncountersForCensus
  → HospitalCensusService.getHospitalCensus
  → buildHospitalCensusV1 (+ D4A.4.2A canonical projection)
  → GET /hospital-care/census
  → fetchHospitalCensus (web)
  → InpatientUnitBoardView / UnitBoardShell (key=encounterId)
  → filterCensusByUnitSelection (MS unit)
Parallel: FacilityBedBoardService → occupiedBeds metric
```

Also audited: placement receiving create (`internal-placement.service`), direct admission (`inpatient-operations.service`), legacy ED→IP type flip (`encounters.service`), unit registry, bed board composition, concurrent policy + admission correlation.

---

## 3. Classification

| Layer | Verdict |
|---|---|
| Backend durable data | **Primary** — dual OPEN INPATIENT charts |
| Backend census projection (pre-fix) | Faithful 1:1 map of every OPEN IP → inflated active count |
| Frontend | **Not** double-render of one encounterId; secondary defensive Map only |
| Mixed metrics | Active patients from census rows; occupied beds from bed board |

**Fix layer:** earliest wrong layer = **backend census projection** (canonical encounter set) + **create/flip prevention** for future dual OPEN IP. No CSS / name hide.

---

## 4. Encounter creation / dual-create / placement / transfer audit

| Path | Risk | Status |
|---|---|---|
| Direct / nurse / placement admission | `evaluateConcurrentEncounterCreate` + correlation REUSE/DENY | Already denies uncorrelated second IP |
| Placement ARRIVED receiving create | Correlation resolveReuse before create | DENY when open IP uncorrelated |
| Legacy D3C-OFF type flip (admission summary / confirm transfer) | Could promote ED→IP while another OPEN IP exists; keeps bare ED `roomLabel` | **Hardened** via `assertInpatientTypePromotionAllowed` |
| DB unique open-IP-per-patient | None (intentionally app-level) | No uniqueness constraint added |

---

## 5. Location audit (`MS-1` vs `3`)

| Stored `roomLabel` | Display | MS unit scope | Canonical bed |
|---|---|---|---|
| `MS-1` | MS-1 | Yes | `MS:1` |
| `3` on INPATIENT | `3` | Yes (default care unit MS) | `MS:3` |

Bare `"3"` is classic **ED residue** after type flip without room reassignment. Receiving/placement chart with governed `MS-1` is preferred by ranking.

---

## 6. Canonical census key

| Concept | Key |
|---|---|
| Census / board row | **`encounterId`** |
| Duplicate grouping (projection only) | `(facilityId, patientId, clinicalContext)` with evidence-ranked winner |
| Admission reuse | `admissionCorrelationId` / placement receiving id |
| Bed occupancy | Canonical bed key `MS:n` |

Never: patient name, MRN alone, or patient ID without encounter evidence ranking.

---

## 7. Metrics reconciliation

**Before:** `activePatients = inpatientPatients.length` (2) while `occupiedBeds` from bed board (1).

**After:** active inpatient / operational snapshot / unit `patientCount` derive from the **same canonical encounter set** produced by D4A.4.2A projection. Occupied beds remain bed-board authoritative. Screenshot pattern fixture: active=1, bedsOccupied=1.

---

## 8. Safe dedupe design

### Query / projection shape

**Before**

```
open IP encounters → map each to row → inpatientPatients[]
metrics = length(rows)
```

**After**

```
open IP encounters
  → collapse by encounterId (source fan-out)
  → build rows
  → per (facility, patientId, OBS|IP lane): keep highest-evidence encounter
  → inpatientPatients[] / metrics from retained set
  → diagnostics for suppressed encounterIds (no durable delete)
```

Frontend: `dedupeCensusRowsByEncounterId` only (secondary).

---

## 9. Future duplicate creation prevention

Proven gap closed: legacy ED→IP type promotion now runs `evaluateConcurrentEncounterCreate` against other OPEN encounters and throws `ConflictException` when a second uncorrelated OPEN INPATIENT would result.

No silent auto-close of existing charts. No DB uniqueness constraint (invariant not yet proven empty in all environments).

---

## 10. Existing data remediation

Template: [`docs/operations/inpatient-census-duplicate-remediation-d4a42a.md`](../operations/inpatient-census-duplicate-remediation-d4a42a.md)

Operators must manually review suppressed encounterIds from census diagnostics / SQL report. **No auto-delete.**

---

## 11. Characterization tests

File: `packages/shared/src/encounters/hospitalCensusDuplicatePreventionD4a42a.test.ts`

Covers: screenshot MS-1 vs `3`, multi-source same encounterId, legitimate multi-patient, closed history excluded, OBS∥IP lane separation, ranking preference, frontend encounter-only defensive dedupe, metric reconciliation.

---

## 12. Regressions / performance / audit-security

| Area | Notes |
|---|---|
| Performance | O(n) Map/group over census take≤1000 — no extra DB joins |
| Security / facility | Facility filter unchanged; JWT facility scope preserved |
| Audit | Projection does not write clinical entities; API logs `hospital_census_duplicate_prevention` |
| History | Suppressed rows remain queryable by encounterId in workspace |

---

## 13. Decision

**CERTIFIED WITH DOCUMENTED DATA REMEDIATION**

- Projection + create-path prevention certified for the reported defect class.
- Existing dual OPEN IP rows require operator remediation per template before environments are “clean.”
- MAR D4A.4.2 work remains paused until this certification; D4A.4.3 not started.
- No commit/push performed as requested.

### Delivered artifacts

| Artifact | Path |
|---|---|
| Pure projection | `packages/shared/src/encounters/hospitalCensusDuplicatePreventionD4a42a.ts` |
| Census integration | `packages/shared/src/encounters/hospitalCensusV1.ts` |
| Tests | `packages/shared/src/encounters/hospitalCensusDuplicatePreventionD4a42a.test.ts` |
| Type-flip guard | `apps/api/src/encounters/encounters.service.ts` |
| Census logging | `apps/api/src/encounters/hospital-census.service.ts` |
| Frontend secondary | `InpatientUnitBoardView.tsx`, `UnitBoardShell.tsx` |
| Remediation template | `docs/operations/inpatient-census-duplicate-remediation-d4a42a.md` |
