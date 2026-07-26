# MEDUI.D4B.7 — Enterprise Case Management, Social Work, Utilization Review, and Discharge Planning Certification

**Date:** 2026-07-26  
**Phase:** MEDUI.D4B.7  
**Decision:** **CERTIFIED WITH DOCUMENTED DEFERRALS**

---

## 1. Branch / HEAD / baseline

| Item | Value |
|------|-------|
| Branch | `d4b7-enterprise-case-management-discharge-planning` |
| Baseline HEAD | `c1da2bd3c` (Merge PR #58 D4B.6) |
| Working tree | Uncommitted D4B.7 implementation + docs (no commit per phase rules) |
| `merge-base --is-ancestor origin/main HEAD` | **0** (at baseline) |
| Ahead/behind `origin/main...HEAD` | **0 0** (at baseline) |
| D4B.1–6 certifications on HEAD / origin/main | ✔ |

---

## 2. Audit methodology

1. Repository-wide CM / SW / UR / discharge / LOS / barrier / readmission / payer search.  
2. Inspection of D4B.1–6, inpatient discharge ops, ED disposition, observation pathways, consult catalogs.  
3. Classification A–Z (D4B.7 legend).  
4. Stop-condition review before coding.  

Audit artifact: `docs/clinical/enterprise-case-management-social-work-utilization-review-discharge-planning-d4b7-audit.md`.

---

## 3. Files reviewed (representative)

- D4B.1–6 foundation + certifications + shell/projection patterns  
- `enterpriseClinicalDocumentRegistryD4b1.ts` / lifecycle / authorship  
- `inpatientClinicalOpsV1.ts` + discharge hosts  
- D4B.4/5 discharge recommendations  
- D4B.6 care-plan readiness  
- ED disposition / nursing discharge readiness  
- Observation disposition pathways  

---

## 4. Files changed (this phase)

### Docs
- `docs/clinical/enterprise-case-management-social-work-utilization-review-discharge-planning-d4b7-audit.md` (new)
- `docs/clinical/enterprise-case-management-social-work-utilization-review-discharge-planning-d4b7.md` (new)
- `docs/certification/MEDUI.D4B.7-certification.md` (this file)

### Shared
- `packages/shared/src/clinicalDocumentation/enterpriseCaseManagementDischargePlanningD4b7.ts`
- `packages/shared/src/clinicalDocumentation/enterpriseCaseManagementDischargePlanningD4b7.test.ts`
- `packages/shared/src/clinicalDocumentation/enterpriseClinicalDocumentRegistryD4b1.ts` (additive `cm.*` / `sw.*` / `ur.*` / `care_coord.*`)
- `packages/shared/src/index.ts` (export)

### API
- `apps/api/src/encounters/enterprise-case-management-discharge-planning.util.ts`
- `apps/api/src/encounters/enterprise-case-management-discharge-planning.util.spec.ts`

### Web
- `apps/web/src/features/clinical-documentation/EnterpriseCaseManagementDischargePlanningD4b7.tsx`
- `apps/web/src/features/clinical-documentation/enterpriseCaseManagementDischargePlanningD4b7.test.ts`
- `apps/web/src/features/inpatient-workspace/InpatientWorkspacePanel.tsx` (dischargePlanning host)
- `apps/web/src/features/observation-workspace/ObservationWorkspacePanel.tsx` (disposition host)
- `apps/web/src/features/emergency/EmergencyActiveWorkspaceView.tsx` (limited ED projection)
- `apps/web/src/i18n/messages/enterpriseCaseManagementDischargePlanningD4b7.en.ts`
- `apps/web/src/i18n/messages/enterpriseCaseManagementDischargePlanningD4b7.fr.ts`
- `apps/web/src/i18n/messages/en.ts` / `fr.ts` (wire-up)
- `apps/web/src/i18n/messages/enterpriseClinicalDocumentD4b1.en.ts` / `.fr.ts` (document type labels)

---

## 5. Schema and migrations

| Item | Result |
|------|--------|
| Prisma schema changes | **None** |
| Migrations | **None** |
| Strategy | Adapters + capability shell + D4B.1 registry extensions |

---

## 6. Capability / role matrix

Certified profiles: case manager, social worker, utilization reviewer, nurse coordination-limited, provider review-only, support read-only.  
**Distinct CM / SW / UR capability profiles** (not collapsed).  
**Prohibited:** discharge authorize, final disposition mutate, order create/mutate, MAR alter, diagnosis/problem-list mutate, admission-status mutate, proprietary InterQual/MCG, predictive AI readmission, rewrite D4B.6 care plans, independent signature engine, claims submit, full SW narrative on dashboards.  
`assignmentEqualsAuthorization: false`.

---

## 7. Document registry

Selected types: `cm.initial_assessment`, `cm.progress_note`, `cm.discharge_planning_note`, `sw.psychosocial_assessment`, `sw.progress_note`, `sw.barrier_note`, `ur.admission_review`, `ur.continued_stay_review`, `ur.medical_necessity_documentation`, `care_coord.transition_plan`, `care_coord.readiness_projection`.  
Certification id: `MEDUI.ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING.D4B7`.

---

## 8. Curated taxonomies

- Barriers: 12 MVP codes  
- Destinations: 11 MVP codes  
- Readmission risk factors: 6 transparent rules  
- UR criteria sources: facility policy / clinical documentation / placeholder library (not InterQual/MCG)

---

## 9. Care-setting matrix

| Setting | Result |
|---------|--------|
| EMERGENCY | Limited projection (overview / readiness / discipline projections) |
| OBSERVATION | Full coordination dashboard |
| INPATIENT | Full dashboard + legacy discharge-ops projection |

---

## 10. Authority boundaries certified

Planning ≠ discharge auth ≠ final disposition ≠ provider order ≠ MAR ≠ diagnosis ≠ problem list ≠ admission-status mutation. Assignment ≠ authorization. No proprietary InterQual/MCG. No predictive AI. No D4B.6 rewrite. Sensitive SW minimized on dashboards.

---

## 11. D4B.1–6 integration

Adapters/projections only; no redesign of D4B.1–6, MAR, POE, ownership, census, or global shell. Care plans projected only. Nursing/RT/rehab/tech authorship preserved.

---

## 12. Tests executed

| Suite | Filter / scope | Result |
|-------|----------------|--------|
| `@medora/shared` | `enterpriseCaseManagementDischargePlanningD4b7` | **8/8 passed** |
| `@medora/shared` | D4B.1 + D4B.6 regression | **33/33 passed** |
| `@medora/shared` | D4B.2–5 regression | **47/47 passed** |
| `@medora/api` | `enterprise-case-management-discharge-planning` | **3/3 passed** |
| `@medora/api` | D4B.6 util regression | **3/3 passed** |
| `@medora/web` | `enterpriseCaseManagementDischargePlanningD4b7` | **2/2 passed** |
| `@medora/web` | D4B.6 shell regression | **2/2 passed** |
| Builds | shared / api / web | **all passed** |
| Lint | shared / api / web | Placeholder only (`lint not configured yet`) |

---

## 13. Documented deferrals

- Proprietary InterQual / MCG criteria content  
- Predictive / ML readmission models  
- Billing / claims / CDI engines  
- Final discharge authorization engine  
- Pharmacy / Nutrition clinical workspaces  
- Provider H&P / progress / MDM / discharge summary (**D4B.8**)  
- Prisma durable CM/SW/UR episode tables  
- New Prisma RoleCodes / EncounterNoteTypes  
- Full placement-network / external facility directory  
- Always-on Nest REST controllers beyond thin projection util  

---

## 14. Production limitations

- Episode/barrier/destination workflows are adapter + client shell (not yet durable DB-backed).  
- Payer authorization is tracking projection only — not eligibility or claims.  
- LOS view does not compute facility-specific expected LOS.  
- ED remains awareness-only.  
- Sensitive SW minimization is dashboard-policy based; full access control matrices deferred.

---

## 15. Release prerequisites

- Human review of authority banners (French product UI)  
- Confirm Nest callers stamp server identity when wiring persistence later  
- Do not enable proprietary criteria packs without a new certification phase  
- Keep D4B.6 care-plan engine authoritative for plans  

---

## 16. Final decision

**CERTIFIED WITH DOCUMENTED DEFERRALS**

D4B.7 may be closed for this phase scope.  
**Exact recommended next phase:** **MEDUI.D4B.8 — Enterprise Provider Clinical Workspace**
