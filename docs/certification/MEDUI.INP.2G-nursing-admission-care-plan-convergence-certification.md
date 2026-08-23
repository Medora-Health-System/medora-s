# MEDUI.INP.2G — Nursing Admission Access Recovery + Care Plan Convergence

**Branch:** `medui-inp2g-nursing-admission-care-plan-convergence`  
**Base:** `origin/main` @ `e0f9c1fc8`  
**Worktree:** `.worktrees/inp2g`  
**Date:** 2026-08-21  
**STOP:** no commit / push / PR / merge / deploy

---

## Phase 0 — Exact Nursing Admission gray root cause

**Live OPEN INPATIENT count:** 1 (`9c1296eb-…`)  
**`medSurgNursingAdmissionV1.nurseSignature.signed`:** **`true`**

**Mechanism:**

```ts
readOnly = !(roles.includes("RN") || roles.includes("ADMIN"))
signed = Boolean(doc?.nurseSignature?.signed)
writeBlocked = readOnly || signed
```

**Classification for the only live OPEN IP chart:** **signed-document lock** (not missing RN role, not `writersEnabled`, not feature flag).

**Correct authority preserved:** Signed admission is **not** reopened as unsigned draft. Amendments remain the RN path. PROVIDER/others stay read-only when unsigned.

**Access recovery shipped:** Distinguish **SIGNED** vs **ROLE_READ_ONLY** banners; surface amendments at top when signed.

Full audit: `docs/certification/MEDUI.INP.2G-phase0-root-cause-audit.md`

---

## Care Plan

| Item | Result |
|------|--------|
| Existing engine | `EnterpriseInterdisciplinaryCarePlansD4b6` + `EncounterCarePlanService` / Prisma |
| Duplicate presentation | ClinicalOps `mode="carePlan"` stacked under D4B.6 when flag ON |
| Fix | **Unmounted** ClinicalOps from Care Plan tab — **one surface** |
| Dense workspace | Header + Add Care Plan + filters + active-plan table (problem/goal/interventions/owner/status/actions) |
| Templates | Existing D4B.6 catalog preserved; Add → template catalog → POST activate |
| Schema migration | **None required** — reuse `EncounterCarePlan*` |

---

## Summary / Print

| Item | Result |
|------|--------|
| Nursing Admission Summary | Structured projection (`projectNursingAdmissionMedicalRecord`) — documented fields only |
| Care Plan Summary | Fetches `/encounters/:id/care-plans`; read-only cards |
| Print Entire Chart | `supplementalPrintSections` inject Nursing Admission + Care Plan HTML |
| No duplicate Summary store | ✔ |

---

## EN / FR

`inpatientNursingAdmissionInp2g` keys mirrored EN/FR (signed lock, record labels, care-plan workspace). Clinical free text unchanged.

---

## Cross-facility

No facility UUID branching. Generalized role/encounter authority.

---

## Tests / builds

| Gate | Result |
|------|--------|
| INP.2G shared + web convergence tests | **PASS** |
| INP.2B.2D / rapid / chrome suites | **PASS** |
| D4B.6 host test (ED workspace string) | **FAIL pre-existing** — `EmergencyActiveWorkspaceView` no longer embeds D4B.6 string (out of scope) |
| RES.2A / 2A.1 | **PASS** |
| shared build | **PASS** |
| API Nest build | **PASS** |
| web tsc | **PASS** |
| Next production build | **PASS** |
| Prisma validate | **PASS** |
| Migration | **none** |
| Seed | unchanged |
| git diff --check | **PASS** |

---

## Live UAT stop-gates

| Gate | Status |
|------|--------|
| RN editable on **unsigned** OPEN admission | **NOT RUN** — only live OPEN IP admission is **signed** |
| Signed lock + amendments UX | Code + banners **PASS**; interactive amend not exercised |
| Care Plan single surface | Code **PASS** |
| Template activate / goal / intervention / progress live | **NOT RUN** (auth MFA barrier + no unsigned IP fixture) |
| Summary / print structured sections | Code **PASS** |
| Second facility context | Not live-proven |

---

## Remaining risks

1. Full interactive RN/Provider UAT still required on an **unsigned** non-PHI inpatient admission.  
2. D4B.6 ED host characterization test is stale vs current Emergency workspace.  
3. Dense Care Plan table Complete action uses existing transition API; goal/intervention/progress editors remain via existing endpoints (not a new parallel engine).  
4. ClinicalOps carePlan stub data still exists in JSON for historical charts — not shown on Care Plan tab (intentional).

---

## CERTIFICATION STATUS

### **NOT CERTIFIED**

Code + Phase 0 root cause + Summary/Care Plan convergence are in place. **Blocking:** Phase L live UAT on an OPEN unsigned Nursing Admission with RN facility authority (editable save/reload) and live Care Plan template activation / progress cycle.

**STOP** — no commit / push / PR / merge / deploy.
