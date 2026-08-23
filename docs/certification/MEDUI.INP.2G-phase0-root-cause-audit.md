# MEDUI.INP.2G — Phase 0 Production Root-Cause Audit

**Branch:** `medui-inp2g-nursing-admission-care-plan-convergence`  
**Base:** `origin/main` @ `e0f9c1fc8`  
**Date:** 2026-08-21  
**Mode:** Audit before modify — no speculation.

---

## PART A — Nursing Admission gray / read-only

### Live fixture (non-PHI structural proof)

| Field | Value |
|-------|--------|
| OPEN INPATIENT encounters in local DB | **1** |
| Encounter.id | `9c1296eb-c7a6-403c-96a2-b81f16205e82` |
| facilityId | `4687866b-…` (HT — no UUID used in product code) |
| `admissionSummaryJson.medSurgNursingAdmissionV1` | present |
| `nurseSignature.signed` | **`true`** |

### Code path that disables controls

`InpatientWorkspacePanel.tsx`:

```ts
readOnly={!(roles.includes("RN") || roles.includes("ADMIN"))}
```

`InpatientAdmissionClinicalShell.tsx`:

```ts
const signed = Boolean(doc?.nurseSignature?.signed);
const writeBlocked = readOnly || signed;
```

Controls use `disabled={… writeBlocked}` / `readOnly={writeBlocked}`.

### Classification (this live OPEN encounter)

| Candidate | Proven? |
|-----------|---------|
| missing RN role | **Not required to explain gray** — signed alone forces `writeBlocked` |
| incorrect facility-role projection | Not observed for this fixture |
| `writersEnabled=false` | Would replace whole panel (banner), not gray fields |
| encounter lineage mismatch | Encounter is OPEN INPATIENT |
| **signed-document lock** | **YES — proven** (`nurseSignature.signed === true`) |
| feature flag | Nursing feature flags do not set `writeBlocked` |
| stale frontend state | N/A — server JSON already signed |

### Correct authority (unchanged)

- RN / ADMIN (unsigned) → editable  
- PROVIDER / PCT / others → read-only  
- Signed → section editors remain locked; RN amendments only (existing policy)  
- Do **not** reopen signed admission as unsigned draft  

### Access “recovery” implication

Production symptom on this OPEN IP chart is **expected post-sign lock**, not broken RBAC. Recovery = surface **SIGNED** state + amendment/correction UX clearly; keep section editors locked.

---

## PART C/D — Care Plan double presentation

### Existing SSoT

- UI: `EnterpriseInterdisciplinaryCarePlansD4b6`  
- API: `GET/POST /encounters/:id/care-plans` (+ nested mutations)  
- Prisma: `EncounterCarePlan*` (`20261106120000_inp2_enterprise_care_plan_authority`)  
- Shared: `enterpriseInterdisciplinaryCarePlansD4b6.ts`  
- Templates: Fall Risk, Aspiration, Acute Pain, Pneumonia, CHF, Impaired Mobility, Pressure Injury, Discharge Readiness  

### Duplicate surface (proven)

`InpatientWorkspacePanel` `case "carePlan"` mounts D4B.6 **and**, when `NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED=true` (local `.env.local`), also `InpatientClinicalOpsPanel mode="carePlan"`.

ClinicalOps writes **legacy** `admissionSummaryJson.inpatientClinicalOpsV1.carePlan` (client `itemId`) — parallel stub, not relational INP.2 authority.

Local env: **Care Plan flag ON** → stacked UI is live.

### Unmount decision

Safe to unmount ClinicalOps from Care Plan tab. Optionally project stub into D4B.6 `legacyD3eStub` read-only. Do not delete ClinicalOps for other modes.

---

## PART B/H — Summary gaps

`InpatientEncounterMedicalRecordSummaryView` fetches nursing admission but flattens to **one line**.  
Care Plan i18n key exists; **no Care Plan section / fetch**.  
Print Entire Chart uses live preview without first-class D4B.6 / full nursing admission structured projection.

---

## STOP gate before implementation

Root causes documented. Implementation proceeds: signed UX clarity (no unlock), Care Plan unstack + dense D4B.6 workspace, structured Summary + print projections, EN/FR, regressions.
