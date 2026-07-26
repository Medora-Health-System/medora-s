# MEDUI.D4B.6 — Enterprise Interdisciplinary Care Plans Certification

**Date:** 2026-07-26  
**Phase:** MEDUI.D4B.6  
**Decision:** **CERTIFIED WITH DOCUMENTED DEFERRALS**

---

## 1. Branch / HEAD / baseline

| Item | Value |
|------|-------|
| Branch | `d4b6-enterprise-interdisciplinary-care-plans` |
| Baseline HEAD | `e3b516ba0` (Merge PR #57 D4B.5) |
| Working tree | Uncommitted D4B.6 implementation + docs (no commit per phase rules) |
| `merge-base --is-ancestor origin/main HEAD` | **0** (at baseline) |
| Ahead/behind `origin/main...HEAD` | **0 0** (at baseline) |
| D4B.1–5 certifications on HEAD / origin/main | ✔ |

---

## 2. Audit methodology

1. Repository-wide care-plan / interdisciplinary / nursing diagnosis / intervention search.  
2. Inspection of D3E stub, EDOC.19, D4B.2–5 contribution surfaces, Obs/IP hosts, D4B.1 registry/lifecycle.  
3. Classification A–V (D4B.6 legend).  
4. Stop-condition review before coding.  

Audit artifact: `docs/clinical/enterprise-interdisciplinary-care-plans-d4b6-audit.md`.

---

## 3. Files reviewed (representative)

- D4B.1–5 foundation + certifications + RT/rehab peer patterns  
- `enterpriseClinicalDocumentRegistryD4b1.ts` / lifecycle / authorship  
- `inpatientCarePlanV1.ts` + `InpatientClinicalOpsPanel` carePlan mode  
- EDOC.19 nursing admission/care-plan payloads  
- D4B.4 `rt.care_plan_contribution`  
- D4B.5 rehab goals (`isNotFullInterdisciplinaryCarePlan`)  
- Observation / Inpatient / Emergency workspace hosts  

---

## 4. Files changed (this phase)

### Docs
- `docs/clinical/enterprise-interdisciplinary-care-plans-d4b6-audit.md` (new)
- `docs/clinical/enterprise-interdisciplinary-care-plans-d4b6.md` (new)
- `docs/certification/MEDUI.D4B.6-certification.md` (this file)

### Shared
- `packages/shared/src/clinicalDocumentation/enterpriseInterdisciplinaryCarePlansD4b6.ts`
- `packages/shared/src/clinicalDocumentation/enterpriseInterdisciplinaryCarePlansD4b6.test.ts`
- `packages/shared/src/clinicalDocumentation/enterpriseClinicalDocumentRegistryD4b1.ts` (additive `care_plan.*`)
- `packages/shared/src/index.ts` (export)

### API
- `apps/api/src/encounters/enterprise-interdisciplinary-care-plans.util.ts`
- `apps/api/src/encounters/enterprise-interdisciplinary-care-plans.util.spec.ts`

### Web
- `apps/web/src/features/clinical-documentation/EnterpriseInterdisciplinaryCarePlansD4b6.tsx`
- `apps/web/src/features/clinical-documentation/enterpriseInterdisciplinaryCarePlansD4b6.test.ts`
- `apps/web/src/features/inpatient-workspace/InpatientWorkspacePanel.tsx` (carePlan host)
- `apps/web/src/features/observation-workspace/ObservationWorkspacePanel.tsx` (carePlan host)
- `apps/web/src/features/emergency/EmergencyActiveWorkspaceView.tsx` (limited ED projection)
- `apps/web/src/i18n/messages/enterpriseInterdisciplinaryCarePlansD4b6.en.ts`
- `apps/web/src/i18n/messages/enterpriseInterdisciplinaryCarePlansD4b6.fr.ts`
- `apps/web/src/i18n/messages/en.ts` / `fr.ts` (wire-up)
- `apps/web/src/i18n/messages/enterpriseClinicalDocumentD4b1.en.ts` / `.fr.ts` (care-plan document type labels)

---

## 5. Schema and migrations

| Item | Result |
|------|--------|
| Prisma schema changes | **None** |
| Migrations | **None** |
| Strategy | Adapters + capability shell + D4B.1 registry extensions |

---

## 6. Capability / role matrix

Certified profiles: nurse care-plan author (MVP activator), RT contributor, rehab contributor, technician progress-limited, provider review-only, support read-only.  
**Prohibited:** diagnosis, problem-list mutate, prescribe, administer-via-plan, order create/mutate, MAR alter, diet finalize, O2/vent alter, restraint/isolation authorize, discharge authorize, DME/HH order, nursing/tech/RT/rehab overwrite, independent signature engine, auto-activate from diagnosis, template mutate on activation.  
`assignmentEqualsAuthorization: false`.

---

## 7. Care-plan registry

Selected `care_plan.*` types: activation, progress_evaluation, review, revision, completion, discontinuation, entered_in_error.  
Certification id: `MEDUI.ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS.D4B6`.

---

## 8. Implemented template catalog

Eight ACTIVE curated starters: fall_risk, aspiration_risk, acute_pain, pneumonia, chf, impaired_mobility, pressure_injury_risk, discharge_readiness (partial).  
Deferred: COPD/sepsis/diabetes/stroke/behavioral full pathways + huge catalogs (documented).

---

## 9. Care-setting matrix

| Setting | Result |
|---------|--------|
| EMERGENCY | Limited projection (overview / active awareness / contributions) |
| OBSERVATION | Full activation + progress/review |
| INPATIENT | Full activation + progress/review + legacy D3E projection |

---

## 10. Authority boundaries certified

Plan ≠ diagnosis ≠ problem-list mutation ≠ provider order ≠ MAR ≠ diet ≠ O2/vent ≠ discharge auth ≠ DME ≠ precaution activation. Template source immutable on activation. No auto-activation from diagnosis alone.

---

## 11. D4B.1–5 integration

Adapters/projections only; no redesign of D4B.1–5, MAR, POE, ownership, census, or global shell. PT/OT/SLP remain distinct. Equipment/diet/discharge rehab recs remain recommendations.

---

## 12. Tests executed

| Suite | Filter / scope | Result |
|-------|----------------|--------|
| `@medora/shared` | `enterpriseInterdisciplinaryCarePlansD4b6` | **11/11 passed** |
| `@medora/shared` | D4B.1 + D4B.4 + D4B.5 regression | **49/49 passed** |
| `@medora/api` | `enterprise-interdisciplinary-care-plans` | **3/3 passed** |
| `@medora/api` | D4B.4 + D4B.5 util regression | **4/4 passed** |
| `@medora/web` | `enterpriseInterdisciplinaryCarePlansD4b6` | **2/2 passed** |
| Builds | shared / api / web | **all passed** |
| Lint | shared / api / web | Placeholder only (`lint not configured yet`) |

---

## 13. Documented deferrals

- CM / SW / UR / Pharmacy / Nutrition / Provider workspaces (D4B.7+)  
- Prisma durable CarePlan tables  
- New RoleCodes / EncounterNoteTypes  
- NANDA engine / auto-suggest from problem list  
- Huge shallow template libraries  
- Full COPD / sepsis / diabetes / stroke / behavioral pathways  
- HTTP controller wiring for projection util  
- Offline sync / billing / DME procurement / diet-order finalize / restraint engines  

---

## 14. Production limitations

Client-side activation characterization against shared rules until Nest persistence endpoints land; virtual `REFERENCE_VIRTUAL` adapters; D3E stub non-authoritative; discharge readiness does not authorize discharge.

---

## 15. Release prerequisites

- Shared/API/web D4B.6 tests + builds green (or gaps documented)  
- Human review of French UI + authority banners  
- Confirm no Prisma migration  
- D4B.1–5 certifications remain intact  

---

## 16. Final decision

**CERTIFIED WITH DOCUMENTED DEFERRALS**

Exact next phase: **MEDUI.D4B.7 — Enterprise Case Management, Social Work, Utilization Review, and Discharge Planning**  
Do not start D4B.7 until D4B.6 is human-reviewed and closed.
