# MEDUI.D4B.6 — Enterprise Interdisciplinary Care Plans

**Date:** 2026-07-26  
**Branch:** `d4b6-enterprise-interdisciplinary-care-plans`  
**Certification id:** `MEDUI.ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS.D4B6`  
**Prerequisites:** D4B.1 + D4B.2 + D4B.3 + D4B.4 + D4B.5 certified on `origin/main`  
**Mode:** ONE enterprise interdisciplinary care-plan domain; curated ACTIVE template catalog; D4B.1 lifecycle reuse; adapters; **no Prisma migration**; no independent signature engine; Obs + IP full activation; ED limited projection

---

## 1. Purpose

Provide a single enterprise interdisciplinary care-plan foundation so clinicians can **Add Care Plan → browse/search → preview → optional patient-specific customize → activate → progress → review → revise → complete/discontinue**, composing nursing (D4B.2 / EDOC.19), technician (D4B.3), respiratory (D4B.4), and rehabilitation (D4B.5) contributions **without overwrite**, while preserving hard authority boundaries: plan ≠ diagnosis ≠ problem-list mutation ≠ provider order ≠ MAR ≠ diet ≠ O2/vent ≠ discharge authorization ≠ DME ≠ precaution activation.

---

## 2. Baseline

| Item | Value |
|------|-------|
| Branch | `d4b6-enterprise-interdisciplinary-care-plans` |
| Baseline HEAD | `e3b516ba0` (Merge PR #57 D4B.5) |
| D4B.1–5 on HEAD | ✔ |
| Audit | `docs/clinical/enterprise-interdisciplinary-care-plans-d4b6-audit.md` |

---

## 3. Audit findings

No prior D4B.6 module in tree. Existing surfaces: D3E inpatient care-plan stub, EDOC.19 nursing initiation/update, D4B.2 nursing `carePlan` section, D4B.4 `rt.care_plan_contribution`, D4B.5 goals with `isNotFullInterdisciplinaryCarePlan`, Observation placeholder, Inpatient D3E ops panel. Safe path: one IDCP domain on D4B.1; curated ACTIVE catalog; compose projections; defer CM/SW/UR/Pharmacy/Nutrition/huge NANDA/auto-activation.

---

## 4. Existing care-plan architectures

| Architecture | Role in D4B.6 |
|--------------|---------------|
| D4B.1 lifecycle / registry / authorship | **Reuse** — no independent care-plan signature engine |
| EDOC.19 / D4B.2 nursing care plan | Project nursing contributions |
| D4B.3 tech tasks | Project progress; preserve performer |
| D4B.4 RT contribution | Project; O2/vent remain RT/order authority |
| D4B.5 PT/OT/SLP goals | Project; keep disciplines distinct |
| D3E `inpatientCarePlanV1` | Legacy stub projection under IP |
| Diagnosis / POE / MAR / diet / discharge | Hard separation |

---

## 5. Conceptual model

| Concept | Meaning |
|---------|---------|
| **Template** | Governed reusable definition (immutable on activation) |
| **Patient plan** | Encounter-scoped activated copy with patient-specific edits |
| **Focus** | Care focus statement (not a diagnosis code) |
| **Goal** | Desired patient-oriented goal |
| **Outcome** | Expected measurable outcome |
| **Intervention** | Recommended action (**≠ provider order**) |
| **Monitoring** | Reassessment / watch items (**≠ order**) |
| **Education** | Teaching plan component |
| **Safety** | Precaution recommendation (**≠ restraint/isolation activation**) |

---

## 6. Invariants

1. Template activation **copies**; source template never mutates.  
2. No auto-activation from diagnosis/risk alone.  
3. Care plan is **not** a diagnosis and does **not** mutate problem list.  
4. Interventions/monitoring are **recommendations**, not POE/MAR writes.  
5. Diet / O2 / vent / DME / home-health remain outside plan authority.  
6. Discharge readiness ≠ discharge authorization.  
7. Safety recommendation ≠ restraint/isolation activation.  
8. Nursing / RT / rehab / tech authorship must not be overwritten.  
9. Assignment ≠ authorization.  
10. Uses D4B.1 document lifecycle — no independent signature/amendment engine.  
11. ONE interdisciplinary care-plan domain — do not fork.  
12. ED limited; Obs + IP full activation workflows.

---

## 7. Template governance

Statuses: `DRAFT` | `REVIEW` | `APPROVED` | `ACTIVE` | `RETIRED`.  
Bedside activates **ACTIVE** only. Code-governed catalog is acceptable when versioned, auditable, localized, and testable (this phase).

---

## 8. Implemented prebuilt template catalog

| Template ID | Title | Components |
|-------------|-------|------------|
| `fall_risk` | Fall risk | Focus, goal, outcome, intervention, monitoring, education, safety |
| `aspiration_risk` | Aspiration risk | Focus, goal, outcome, intervention, monitoring, education, safety |
| `acute_pain` | Acute pain | Focus, goal, outcome, intervention, monitoring, education |
| `pneumonia` | Pneumonia | Focus, goal, outcome, intervention, monitoring, education |
| `chf` | Heart failure (CHF) | Focus, goal, outcome, intervention, monitoring, education |
| `impaired_mobility` | Impaired mobility | Focus, goal, outcome, intervention, monitoring, education |
| `pressure_injury_risk` | Pressure injury risk | Focus, goal, outcome, intervention, monitoring, education, safety |
| `discharge_readiness` | Discharge readiness (partial) | Focus, goal, outcome, intervention, monitoring, education |

All version `D4B.6.1`, governance `ACTIVE`, `sourceImmutableOnActivation: true`, `autoActivateFromDiagnosisAlone: false`.

---

## 9. Deferred templates

COPD exacerbation full · sepsis pathway full · diabetes endocrine full · stroke pathway full · behavioral health full · hundreds of shallow NANDA mappings · CM/SW/UR specialty templates · pharmacy MTM · nutrition care process · pediatric specialty packs.

---

## 10. Activation workflow

Browse/search ACTIVE templates → preview components → optional patient-specific customize on the **copy** → activate (Obs/IP; nurse author profile) → reject if ED / inactive / duplicate active / auto-from-diagnosis / capability denied → emit `care_plan.activation` virtual document adapter.

---

## 11. Duplicate prevention

Same `sourceTemplateId` cannot have a second plan in `DRAFT_CUSTOMIZATION` | `ACTIVE` | `IN_PROGRESS` | `IN_REVIEW` | `REVISED` on the encounter.

---

## 12. Patient plan lifecycle

`DRAFT_CUSTOMIZATION` → `ACTIVE` → `IN_PROGRESS` → `IN_REVIEW` → `REVISED` → `COMPLETED` | `DISCONTINUED` | `ENTERED_IN_ERROR`.  
Durable legal identity for activation/progress/review/revision/completion/discontinuation/EIE uses **D4B.1** document types/adapters.

---

## 13. Capabilities

Browse, preview, customize, activate, progress, review, revise, complete, discontinue, enter-in-error, nursing/RT/rehab contribute, intervention/monitoring/education/safety documentation, view contributions, view legacy D3E.  
`assignmentGrantsCapability: false`; `activatesOrders: false`; `mutatesProblemList: false`.

---

## 14. Role profiles

`NURSE_CARE_PLAN_AUTHOR` (MVP primary activator) · `RESPIRATORY_CONTRIBUTOR` · `REHAB_CONTRIBUTOR` · `TECHNICIAN_PROGRESS_LIMITED` · `PROVIDER_REVIEW_ONLY` · `SUPPORT_READ_ONLY`.  
No new Prisma RoleCodes in D4B.6.

---

## 15. Discipline contributions

| Discipline | Integration |
|------------|-------------|
| Nursing | Project EDOC.19 / D4B.2; never overwrite |
| RT | Project `rt.care_plan_contribution`; never alter O2/vent via plan |
| PT/OT/SLP | Project goals; keep distinct; recommendations ≠ orders |
| Tech | Project task progress; preserve performer |

---

## 16. Goals and outcomes

Template and patient-specific goals/outcomes tracked as components with PENDING / IN_PROGRESS / MET / NOT_MET / DISCONTINUED — not problem-list rows.

---

## 17. Interventions and monitoring

Always `isRecommendationNotOrder: true`. May project related orders when present; never create/mutate POE or MAR.

---

## 18. Education

Education components on patient plan; discipline education notes remain discipline-owned contributions.

---

## 19. Safety precautions

Safety components document recommendations only (`safetyDoesNotAuthorizePrecaution` / `doesNotAuthorizeRestraintsOrIsolation`).

---

## 20. Progress and review

Progress updates components; review transitions to `IN_REVIEW`; revise → `REVISED`; complete / discontinue / enter-in-error as terminal (except revise path before terminal).

---

## 21. Custom components

Patient-specific custom components allowed on the activated copy only; never written back to catalog.

---

## 22. Completion and discontinuation

`COMPLETE` and `DISCONTINUE` events; EIE marks `enteredInError` without physical delete.

---

## 23. Care-setting matrix

| Setting | Catalog / activate | Progress / review | Projection |
|---------|--------------------|-------------------|------------|
| EMERGENCY | ✖ (limited) | ✖ | ✔ overview, active awareness, contributions |
| OBSERVATION | ✔ | ✔ | ✔ |
| INPATIENT | ✔ | ✔ | ✔ + legacy D3E |

---

## 24. Workspace IA

| Host | Placement |
|------|-----------|
| Inpatient | `carePlan` section — primary D4B.6 shell (+ optional D3E stub when flag on) |
| Observation | `carePlan` section — focused activation workspace |
| Emergency | Limited projection under nursing stack (not note composer) |

---

## 25. Document registry (`care_plan.*`)

`care_plan.activation` · `progress_evaluation` · `review` · `revision` · `completion` · `discontinuation` · `entered_in_error`  
All `REFERENCE_VIRTUAL`, templateVersion `D4B.6`, amendmentAllowed false, supportsDraftEdit false (adapters; Nest RBAC remains authoritative).

---

## 26. API contracts

Thin Nest projection util: `projectEnterpriseInterdisciplinaryCarePlans` + `rejectClientControlledCarePlanIdentity`. Not controller-wired in this phase (mirrors D4B.4/5). Client cannot stamp author/performer/signer.

---

## 27. Frontend contracts

`EnterpriseInterdisciplinaryCarePlansD4b6` builds summary client-side from `@medora/shared`; EN/FR i18n via `t()`; MedoraCard shell tokens; bedside-simple section nav.

---

## 28. D4B.1 integration

Reuses contract version, authorship snapshots, lifecycle states for virtual docs, registry eligibility helpers, `assignmentEqualsAuthorization: false`.

---

## 29. D4B.2 nursing integration

Projects nursing contributions; nursing assessment/care-plan cards remain nursing-authored; no redesign of nursing workspace.

---

## 30. D4B.3 technician integration

Projects tech progress; performer preserved; tech ≠ care-plan author for clinical judgment components.

---

## 31. D4B.4 respiratory integration

Projects RT contributions; does not overwrite RT docs; does not alter oxygen/ventilator via plan.

---

## 32. D4B.5 rehabilitation integration

Projects PT/OT/SLP goal contributions; disciplines remain distinct; equipment/diet/discharge rehab recs remain recommendations.

---

## 33. Provider / pharmacy / nutrition / CM / SW boundary

No Provider / Pharmacy / Nutrition / CM / SW / UR workspaces in D4B.6. Provider may review-only. CM/SW/UR/discharge planning → **D4B.7**.

---

## 34. Diagnosis and problem-list separation

`isNotDiagnosisEngine` / `doesNotMutateProblemList` hard true; helpers distinguish plan focus from diagnosis codes.

---

## 35. Provider-order separation

`createsProviderOrders: false`; intervention helper `interventionIsNotOrder`.

---

## 36. Discharge-authority separation

`authorizesDischarge: false`; discharge readiness template is partial checklist / education only.

---

## 37. Authorship and performer attribution

Server-authoritative identity rejection util; nursing/RT/rehab/tech preservation helpers; progress updates do not silently rewrite other-discipline authors when `preserveOtherAuthor`.

---

## 38. Authorization

Capability matrices by profile; Nest RBAC remains authoritative for writes; assignment ≠ authorization.

---

## 39. Performance

One bounded summary projection; curated catalog (8 ACTIVE); no chatty multi-endpoint design; no real-time streaming.

---

## 40. Security and privacy

Facility-scoped encounter/patient inputs; reject client identity spoofing; no cross-facility chart exposure introduced.

---

## 41. Data integrity

No destructive Prisma migration; template immutability on activation; EIE without physical delete; duplicate active-plan prevention.

---

## 42. Compatibility mechanisms

Legacy D3E stub projection; EDOC.19 / RT / rehab contribution projections; additive registry only.

---

## 43. Schema and migrations

| Item | Result |
|------|--------|
| Prisma schema | **None** |
| Migrations | **None** |
| Strategy | Adapters + capability shell + D4B.1 registry |

---

## 44. Tests

Shared characterization (catalog, activation, lifecycle, boundaries, registry). API util projection + identity rejection. Web host presence tests. D4B.1–5 modules remain regression targets.

---

## 45. Documented deferrals

CM/SW/UR/Pharmacy/Nutrition/Provider workspaces · Prisma CarePlan tables · RoleCodes · NANDA engine · auto-suggest from problem list · huge template libraries · full COPD/sepsis/diabetes/stroke/behavioral pathways · offline sync · billing · DME procurement · diet-order finalize · restraint/isolation engines · HTTP controller wiring for projection util.

---

## 46. Production limitations

Activation UX is client-side characterization against shared rules until Nest persistence endpoints are added; virtual documents are adapters; D3E stub remains non-authoritative; discharge readiness does not drive discharge.

---

## 47. Release prerequisites

Shared/API/web builds green for D4B.6 filters · human review of authority banners · confirm no Prisma migration · French UI via i18n · D4B.1–5 certifications remain intact.

---

## 48. Certification decision posture

Prefer **CERTIFIED WITH DOCUMENTED DEFERRALS**.

---

## 49. Next phase

**MEDUI.D4B.7 — Enterprise Case Management, Social Work, Utilization Review, and Discharge Planning**

---

## 50. Final architecture decision

Ship one enterprise interdisciplinary care-plan domain on D4B.1 with curated ACTIVE starters, Obs/IP activation, ED limited projection, hard authority boundaries, and explicit deferrals — without forking documentation engines or expanding into D4B.7 scope.

---

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|--------------------|--------|----------|---------------------|
| Clinical document lifecycle | D4B.1 | ✔ | ✔ (`care_plan.*`) | ✔ |
| Nursing care plan | EDOC.19 / D4B.2 | ✔ | Projection | ✔ |
| Technician tasks | D4B.3 | ✔ | Projection | ✔ |
| RT contribution | D4B.4 | ✔ | Projection | ✔ |
| Rehab goals | D4B.5 | ✔ | Projection | ✔ |
| D3E care-plan stub | inpatientCarePlanV1 | ✔ | Legacy projection | ✔ |
| Interdisciplinary plan engine | **New once** | — | Created | ✔ |
| Diagnosis / problem list | Provider | ✔ (unchanged) | — | ✔ |
| Orders / MAR / diet / O2 | Existing engines | ✔ (unchanged) | — | ✔ |
| Discharge authorization | Discharge / D4B.7 | — | Deferred | ✔ |
