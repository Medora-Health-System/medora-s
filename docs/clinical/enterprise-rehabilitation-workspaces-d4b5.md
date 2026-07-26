# MEDUI.D4B.5 — Enterprise Rehabilitation Workspaces

**Date:** 2026-07-26  
**Branch:** `d4b5-enterprise-rehabilitation-workspaces`  
**Certification id:** `MEDUI.ENTERPRISE_REHABILITATION_WORKSPACES.D4B5`  
**Prerequisites:** D4B.1 + D4B.2 + D4B.3 + D4B.4 certified on `origin/main`  
**Mode:** Shared shell + **three distinct discipline modes** (PT / OT / SLP); adapters; **no Prisma migration**; no independent rehab lifecycle; no generic THERAPY collapse

---

## 1. Purpose

Provide distinct enterprise rehabilitation workspaces for Physical Therapy, Occupational Therapy, and Speech-Language Pathology across Emergency, Observation, and Inpatient that **compose** nursing fall/mobility/swallow projections (D4B.2 / EDOC), technician mobility/ADL tasks (D4B.3), related CARE orders, and optional RT overlap awareness (D4B.4); **consume** D4B.1 for durable document identity; and **preserve** nursing/tech/RT authorship — without forking lifecycle, ownership, diet-order authority, DME procurement, discharge authorization, billing, scheduling, or inventing proprietary scale engines.

---

## 2. Baseline

| Item | Value |
|------|-------|
| Branch | `d4b5-enterprise-rehabilitation-workspaces` |
| Baseline HEAD | `6bd2b7305` (Merge PR #56 D4B.4) |
| D4B.1–4 on HEAD | ✔ |
| Audit | `docs/clinical/enterprise-rehabilitation-workspaces-d4b5-audit.md` |

---

## 3. Audit findings

No PT/OT/SLP RoleCode, profession, EncounterNoteType, consult order codes, or prior therapy workspace. Strong reusable overlaps: nursing fall/mobility, stroke swallow screen, tech ADL/mobility assist, NPO/swallowing CARE, D4B.1 discipline designations. Safe path: capability shell with three modes; RN-with-rehab-permissions proxy; registry `pt.*` / `ot.*` / `slp.*`; honest deferrals for DME, IDDSI diet-order engine, instrumental swallow, proprietary scales, RoleCode, full care plan (D4B.6).

---

## 4. Existing rehabilitation architectures

| Architecture | Role in D4B.5 |
|--------------|---------------|
| D4B.1 PT/OT/SLP disciplines | Designation + registry extension |
| Nursing fall/mobility / Morse | Read-only projection (do not fork) |
| Stroke swallow screen | Screening projection ≠ SLP eval |
| D4B.3 tech mobility/ADL | Read-only task projection |
| CARE NPO / ambulation / swallowing | Related-order projection |
| Ops pendingPt/Ot / REHAB destination | Display awareness only |
| D4B.4 RT workspace | Peer pattern; overlap section only |
| Taxonomy / rehab nav | Unchanged global shell |

---

## 5. Discipline separation

Shared shell OK. **Must remain distinct:** capability rules, registries, sections, measurements, goals, validation, terminology, order deps, rendering, recommendations. **Forbidden:** one generic THERAPY note, role, or assessment.

Modes: `PHYSICAL_THERAPY` | `OCCUPATIONAL_THERAPY` | `SPEECH_LANGUAGE_PATHOLOGY`.

---

## 6. PT role and capability model

Profiles: `PHYSICAL_THERAPIST` (reserved), `NURSE_WITH_REHAB_PERMISSIONS` (MVP proxy), `REHAB_ASSISTANT_LIMITED`, `SUPPORT_READ_ONLY`.

PT capabilities: evaluation, treatment, mobility/gait, goals, education, equipment recommendation, handoff, discharge recommendation (+ shared views).

Assistants do **not** inherit full evaluator authority. `assignmentGrantsCapability: false`.

---

## 7. OT role and capability model

Profiles: `OCCUPATIONAL_THERAPIST` (reserved), shared nurse proxy / assistant / read-only.

OT capabilities: evaluation, treatment, ADL/IADL, goals, education, equipment recommendation, handoff, discharge recommendation (+ shared views). Tech ADL assist ≠ OT evaluation.

---

## 8. SLP role and capability model

Profiles: `SPEECH_LANGUAGE_PATHOLOGIST` (reserved), shared nurse proxy / assistant / read-only.

SLP capabilities: communication evaluation, swallowing evaluation, treatment, diet recommendation, goals, education, handoff, discharge recommendation (+ shared views including nursing swallow screen).

---

## 9. Shared prohibited capabilities

Provider diagnosis · prescribe · provider sign · nursing overwrite · tech overwrite · RT overwrite · provider order mutate · diet-order finalize · discharge authorize · DME procurement · lab verify · official imaging interpret.

---

## 10. Care-setting behavior

| Setting | Emphasis |
|---------|----------|
| **EMERGENCY** | Focused eval/treatment; swallow/diet rec for SLP; limited goals/education/discharge |
| **OBSERVATION** | Reassessment/treatment, goals, education, equipment/diet rec, discharge recommendations |
| **INPATIENT** | Full discipline sections including ADL (OT), goals, handoff, discharge contributions |

---

## 11. Workspace information architecture

Shared: Overview · Related Care Orders · Evaluation · Treatment · Goals · Education · Nursing Mobility/Fall · Tech Mobility/ADL · RT Overlap · Handoff · Discharge Recommendations · Documentation History.

PT-only: Mobility and gait · Equipment recommendation.  
OT-only: ADL/IADL · Equipment recommendation · Nursing swallow (visibility).  
SLP-only: Communication · Swallowing/aspiration · Diet recommendation · Nursing swallow screen.

---

## 12. Rehabilitation document registry

Live `pt.*`: evaluation, treatment_note, progress_note, goals, education, equipment_recommendation, handoff, discharge_recommendation.  
Live `ot.*`: evaluation, treatment_note, adl_assessment, goals, education, equipment_recommendation, handoff, discharge_recommendation.  
Live `slp.*`: communication_evaluation, swallowing_evaluation, treatment_note, diet_recommendation, goals, education, handoff, discharge_recommendation.

Deferred activities (`selectedInD4b5: false`): instrumental swallow, proprietary PT/OT scale engines.

---

## 13. Structured contracts

MVP structured payloads for PT eval/treatment surfaces, OT eval/ADL, SLP communication/swallowing/diet recommendation, discipline-distinct goals, equipment recommendations — all stamped with recommendation≠authority flags. No proprietary scale licensing inventing.

---

## 14. D4B.1 integration

All durable rehab projections use D4B.1 contract + registry. Virtual reference docs via `adaptRehabVirtualDocument`. **Not created:** independent rehab signature/version/amendment engine. `usesD4b1Lifecycle: true`, `independentRehabLifecycleEngine: false`, `collapsesPtOtSlp: false`.

---

## 15. D4B.2 integration

Nursing fall/mobility/swallow remain nursing-authored. Projected via `nursingMobilityFall` / `nursingSwallowScreen`. `masqueradesAsNursingAssessment: false`.

---

## 16. D4B.3 integration

Tech mobility/ADL projected via `techMobilityAdl`. Performer preserved. `isNotOtEvaluation: true`. `overwritesTechTasks: false`.

---

## 17. D4B.4 integration

RT overlap section is awareness-only. `overwritesRt: false`. No RT lifecycle/MAR takeover.

---

## 18. Order and referral governance

Distinguish provider order, consult, referral, protocol eval, therapist recommendation, plan, session, discharge recommendation. Therapist docs do not create provider orders (`createsProviderOrders: false`). Dedicated `consult_pt|ot|slp` catalog codes remain deferred; related CARE projected only.

---

## 19. Swallowing, aspiration, and diet governance

Nursing swallow screen = screening ≠ SLP evaluation (`screeningIsNotSlpEvaluation`). SLP diet recommendation ≠ provider diet order (`dietRecommendationIsNotDietOrder`, `finalizesDietOrders: false`). No IDDSI diet-order mutation engine in this phase.

---

## 20. Goals and outcomes

Governed goals adapters per discipline (`pt.goals` / `ot.goals` / `slp.goals`). Contribution to care plan only; **not** full interdisciplinary care plan (D4B.6).

---

## 21. Treatment plans

Treatment note adapters exist; full longitudinal therapy plan engine deferred with care plan (D4B.6). Order-dependent treatment activities require order presence for eligibility.

---

## 22. Education

Discipline-distinct education document types. No single mutable checkbox replacing teaching documentation.

---

## 23. Equipment recommendations

PT/OT equipment recommendation types: `equipmentRecommendationIsNotProcurement`. No DME billing/procurement.

---

## 24. Handoff

Discipline handoff types. Does not change encounter ownership or board assignment.

---

## 25. Discharge contributions

`*.discharge_recommendation` virtual docs: recommendation ≠ order; `doesNotAuthorizeDischarge`; `authorizesDischarge: false`.

---

## 26. Authorship and performer attribution

Server-authoritative identity via Nest util `rejectClientControlledRehabIdentity`. Reassignment does not rewrite performers (`rehabPerformerPreservedAfterReassignment`). Nursing/tech performers preserved under rehab review.

---

## 27. Authorization

Capability matrix + Nest RBAC. Assignment ≠ authorization. Assistants do not auto-inherit evaluator authority. No Prisma RoleCode invented.

---

## 28. Auditability

Reuse existing EDOC / EncounterNote / CARE audit. D4B.5 adds no PHI-heavy logger.

---

## 29. Duplicate-concept normalization

| Concept | Authoritative | Consumer |
|---------|---------------|----------|
| Fall / Morse / gait nursing | EDOC.14 / D4B.2 | Nursing projection |
| Functional mobility baseline | D4A.25 | Nursing projection |
| Tech ADL assist | D4B.3 tasks | Tech projection |
| Swallow screen | EDOC.4 | Nursing swallow projection |
| Diet order | Provider CARE / future diet engine | Not mutated by SLP |
| RT airway/O₂ | D4B.4 | RT overlap awareness |

No destructive consolidation.

---

## 30. API architecture

Thin Nest util `projectEnterpriseRehabilitationWorkspace` + identity reject helper. Projection only; no unrestricted mutation endpoint.

---

## 31. Frontend architecture

`EnterpriseRehabilitationWorkspacesD4b5` shell with discipline-mode tabs + section nav + D4B.1 status primitives. Hosted under ED / Observation / Inpatient nursing surfaces. French via i18n (`enterpriseRehabilitationWorkspacesD4b5`).

---

## 32. Performance

Single bounded summary builder per discipline mode; no per-section fetch; does not refetch nursing/MAR/RT/census unnecessarily; history bounded by caller arrays.

---

## 33. Security and privacy

Facility/encounter scoped hosts; reject client-controlled author/performer; no diet-order / discharge / DME privilege escalation; HIPAA not claimed from this phase alone.

---

## 34. Data-integrity safeguards

Nursing/tech/RT authors preserved; recommendation≠order; diet rec≠diet order; equipment≠procurement; discharge rec≠authorization; no destructive migration.

---

## 35. Compatibility

EncounterNoteType unchanged. RoleCode unchanged. Additive D4B.1 registry only. Global shell / ownership / MAR / POE unchanged.

---

## 36. Documented deferrals

Prisma PT/OT/SLP RoleCode · EncounterNoteType therapy · dedicated consult_pt/ot/slp order catalog · IDDSI / texture diet-order engine · instrumental swallow platform · proprietary scale engines · DME procurement/billing · therapy scheduling/staffing · board therapy assignment slots · full interdisciplinary care plan (D4B.6) · Case Management / Social Work / UR / Nutrition / Pharmacy / Provider / Surgery workspaces · offline-first rehab charting.

---

## 37. Test evidence

Shared Vitest D4B.5 suite · API Jest util spec · web shell host characterization · D4B.1 registry PT/OT/SLP types · targeted regression recorded in certification.

---

## 38. Production-readiness limitations

- No dedicated PT/OT/SLP RoleCode — RN proxy only.  
- Structured contracts are MVP reference payloads, not full live form engines for every activity.  
- No dedicated therapy consult order codes yet.  
- Instrumental swallow / proprietary scales / DME / diet-order authority deferred.

---

## 39. Release prerequisites

1. Human review of audit + architecture + certification.  
2. Confirm French UI on ED/Obs/IP hosts for all three discipline modes.  
3. Optional later: RoleCode + consult catalog (migrations — out of D4B.5).  
4. Do **not** start D4B.6 until D4B.5 is accepted.

---

## 40. Enterprise domain audit (certification requirement)

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|--------------------|--------|----------|---------------------|
| Functional / mobility baseline | D4A.25 / EDOC.14 | ✔ | Project only | ✔ |
| Fall risk | EDOC.14 / D4B.2 | ✔ | Project only | ✔ |
| Patient belongings / devices | EDOC9 | ✔ awareness | No DME fork | ✔ |
| Clinical documentation draft/sign | D4B.1 | ✔ | Registry types | ✔ |
| Clinical timeline / audit | Existing EDOC/audit | ✔ | — | ✔ |
| Swallow screen | EDOC.4 | ✔ | Screen≠eval | ✔ |
| Care plan | inpatientCarePlan stub | Contribution only | Full = D4B.6 | ✔ |

---

## 41. Final architecture decision

**CERTIFIED WITH DOCUMENTED DEFERRALS.** Next phase: **MEDUI.D4B.6 — Enterprise Interdisciplinary Care Plans** (do not start in this phase).
