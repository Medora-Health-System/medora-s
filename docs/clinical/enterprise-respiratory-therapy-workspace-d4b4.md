# MEDUI.D4B.4 — Enterprise Respiratory Therapy Workspace

**Date:** 2026-07-26  
**Branch:** `d4b4-enterprise-respiratory-therapy-workspace`  
**Certification id:** `MEDUI.ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE.D4B4`  
**Prerequisites:** D4B.1 + D4B.2 + D4B.3 certified on `origin/main`  
**Mode:** Capability-driven workspace shell + adapters; **no Prisma migration**; no independent RT signature engine; no MAR/nursing/order replacement

---

## 1. Purpose

Provide one care-setting-aware enterprise Respiratory Therapy workspace across Emergency, Observation, and Inpatient that **composes** existing EDOC.12 respiratory cards, oxygen-order display, MAR respiratory-response linkage, procedure work-queue filters, and D4B.3 technician SpO₂ projections; **consumes** D4B.1 for durable document identity; and **preserves** nursing assessment authorship (D4B.2) — without forking lifecycle, ownership, MAR, billing, census, or inventing ventilator-device / PFT / home-O₂ platforms.

---

## 2. Baseline

| Item | Value |
|------|-------|
| Branch | `d4b4-enterprise-respiratory-therapy-workspace` |
| Baseline after FF `origin/main` | `e5bb9e441` (Merge PR #55 D4B.3) |
| D4B.1 / D4B.2 / D4B.3 on HEAD | ✔ |
| Audit | `docs/clinical/enterprise-respiratory-therapy-workspace-d4b4-audit.md` |

---

## 3. Audit findings

No RT `RoleCode`, no RT profession group, no hospital board RT slot, no dedicated RT EncounterNote type. Strong reusable surfaces: EDOC.12, oxygen order params, MAR respiratory response, procedure catalog RT→RN proxy, D4B.1 `RESPIRATORY_THERAPY` discipline. Safe path: adapters + capability shell; RN proxy profile for MVP; honest deferrals for telemetry / ABG collection platform / trach engine / RoleCode.

---

## 4. Existing respiratory architectures

| Architecture | Role in D4B.4 |
|--------------|---------------|
| EDOC.12 respiratory cards | Primary clinical document source |
| Oxygen therapy order parameters | Active-order projection |
| MAR respiratory medication response | Treatment-response adapter (MAR authoritative) |
| Procedure catalog RESPIRATORY/RT | Order-linked workflow filter; RN proxy |
| D4B.2 nursing respiratory section | Parallel authorship — not overwritten |
| D4B.3 tech vitals/SpO₂ | Read-only measurement projection |
| D4B.1 foundation | Lifecycle / registry / adapters |
| Device monitor contracts | Deferred |

---

## 5. RT role and capability model

Profiles: `RESPIRATORY_THERAPIST` (reserved), `NURSE_WITH_RT_PERMISSIONS` (MVP RN proxy), `TECHNICIAN_MEASUREMENT_ONLY`, `SUPPORT_READ_ONLY`.

Capabilities include assessment, reassessment, oxygen, aerosol workflow, treatment response, airway, NIV, ventilator check (manual), bedside measurement, education/care-plan/handoff/discharge recommendation (limited), view orders / MAR / tech measurements.

**Prohibited:** provider diagnosis, prescribe, provider sign, nursing overwrite, order mutate, lab verify, duplicate MAR admin, ungoverned vent setting change.

**Invariant:** `assignmentEqualsAuthorization: false`.

---

## 6. Care-setting behavior

| Setting | Emphasis |
|---------|----------|
| **EMERGENCY** | Focused assessment, O₂, aerosol/response, airway, NIV/vent as applicable; limited education/discharge |
| **OBSERVATION** | Reassessment, O₂ titration within order, treatments, education, discharge recommendations |
| **INPATIENT** | Comprehensive RT sections including care-plan contribution, handoff, vent/airway clearance (deferred breadth) |

---

## 7. Workspace information architecture

Sections: Overview · Active Respiratory Orders · Assessment · Reassessment · Oxygen · Aerosol · Treatment Response · Airway · Artificial Airway (deferred) · Mechanical Ventilation · NIV · High-Flow (deferred) · Suctioning (deferred) · Airway Clearance (deferred) · Bedside Measurements · Blood Gas (deferred) · Specimens (deferred) · Education · Care-Plan · Handoff · Discharge Recommendations · Technician Measurements · Documentation History.

---

## 8. Respiratory document/activity registry

Selected live: `RT_INITIAL_ASSESSMENT`, `RT_REASSESSMENT`, `RT_TREATMENT_NOTE`, `RT_TREATMENT_RESPONSE`, `RT_OXYGEN_DEVICE_ASSESSMENT`, `RT_AIRWAY_ASSESSMENT`, `RT_VENTILATOR_CHECK`, `RT_NONINVASIVE_VENTILATION_CHECK`, `RT_BEDSIDE_MEASUREMENT`, `RT_EDUCATION_NOTE`, `RT_CARE_PLAN_UPDATE`, `RT_HANDOFF`, `RT_DISCHARGE_RECOMMENDATION`.

Deferred selected=false: artificial airway/trach engines, high-flow telemetry, suctioning event engine, airway-clearance engine, ABG/specimen collection platforms.

---

## 9. D4B.1 integration

Durable RT projections use D4B.1 adapters (`adaptRespiratoryEdocEntryToEnterpriseClinicalDocument`, recommendation virtual docs). Registry extended with `rt.*` types. **Not created:** independent RT signature/version/amendment engine. `usesD4b1Lifecycle: true`, `independentRespiratoryTherapyLifecycleEngine: false`.

---

## 10. D4B.2 integration

Nursing respiratory assessment remains nursing-authored. RT workspace sets `masqueradesAsNursingAssessment: false`. Shared concepts projected, not duplicated as a second nursing assessment. Nursing review does not rewrite RT workflow attribution overlays; RT does not overwrite nursing authors.

---

## 11. D4B.3 integration

Technician SpO₂/vitals visible via `technicianMeasurements` section. Performer preserved (`technicianMeasurementVisibleWithoutRtAuthorship`). Technicians do not gain RT assessment/vent/MAR privileges through D4B.4 (`TECHNICIAN_MEASUREMENT_ONLY`).

---

## 12. Respiratory assessment

Composed from EDOC.12 `resp_assessment` via hub. No unsafe normal defaults invented in D4B.4 shell. No diagnoses.

---

## 13. Respiratory reassessment

EDOC.12 distress/neb reassessment cards. Linked by existing EDOC identity; no clone-as-new-assessed engine in this phase.

---

## 14. Oxygen delivery

EDOC O₂ initiation/titration + oxygen order parameter projection. Recommendation ≠ order. No prescribing authority.

---

## 15. Respiratory medications and MAR

MAR remains authoritative. Workspace hosts MAR response slot / projection. `replacesMar: false`, `isDuplicateAdministrationRecord: false`.

---

## 16. Treatment response

Activity `RT_TREATMENT_RESPONSE` → MAR respiratory response pathway. Pre/post clinical detail remains in existing MAR/EDOC forms.

---

## 17. Airway

EDOC respiratory assessment / distress cards as airway assessment surface. No procedural intubation authorship rewrite.

---

## 18. Artificial airway and tracheostomy

**Deferred** dedicated engines; vent/airway EDOC cards remain available where present.

---

## 19. Suctioning and secretion management

**Deferred** event engine; procedure catalog suctioning remains order-linked outside new store.

---

## 20. Mechanical ventilation

EDOC `resp_ventilator` manual observation. Distinguishes ordered vs observed vs recommendation (`distinguishVentilatorSettingRoles`). No device integration layer. Manual-entry limitation surfaced in UI.

---

## 21. Noninvasive ventilation

EDOC CPAP/BiPAP card. Order-linked; not nursing-only device masquerade when RT section open.

---

## 22. High-flow therapy

**Deferred** dedicated check engine (HFNC may appear in O₂ device enums / orders).

---

## 23. Airway-clearance therapy

**Deferred** dedicated event engine.

---

## 24. Bedside respiratory measurements

EDOC peak-flow card. Not diagnostic PFT.

---

## 25. Blood gas collection

**Deferred** RT collection platform; ABG remains lab order/catalog.

---

## 26. Respiratory specimen collection

**Deferred** beyond existing specimen/order ops.

---

## 27. Respiratory care-plan contributions

Limited projection / document type `rt.care_plan_contribution`. Full interdisciplinary plan remains D4B.6.

---

## 28. Education

Limited activity + education topic reuse where present. No single mutable checkbox.

---

## 29. Handoff

Limited RT handoff document type / projection. Does not change encounter ownership.

---

## 30. Discharge recommendations

`rt.discharge_recommendation` virtual projection: recommendation ≠ order; does not authorize discharge; does not prescribe home O₂.

---

## 31. Order and device governance

`createsProviderOrders: false`. Active orders projection filters discontinued. Device observations are not auto-confirmed provider settings.

---

## 32. Authorship and performer attribution

Server-authoritative authors from EDOC/MAR. RN-proxy flagged in `_d4b4.rnProxyAuthorship`. Reassignment does not rewrite performer (`rtPerformerPreservedAfterReassignment`).

---

## 33. Authorization

Capability matrix + Nest RBAC remain authoritative. Assignment does not grant capability. No client-controlled performer identity in APIs (projection util only).

---

## 34. Auditability

Reuse existing EDOC / MAR / EncounterNote audit infrastructure. D4B.4 adds no PHI-heavy logger.

---

## 35. Duplicate-concept normalization

| Concept | Authoritative | Consumer |
|---------|---------------|----------|
| SpO2 | Vitals / D4B.3 | RT tech section |
| O2 ordered | Oxygen order params | Active orders |
| O2 documented | EDOC.12 | RT oxygen section |
| Neb admin | MAR | Treatment response link |
| Vent settings | Order + EDOC observation | Vent section |

No destructive consolidation.

---

## 36. API architecture

Thin Nest util `projectEnterpriseRespiratoryTherapyWorkspace` — projection only; no unrestricted JSON mutation endpoint in this phase.

---

## 37. Frontend architecture

`EnterpriseRespiratoryTherapyWorkspaceD4b4` shell + slots (MAR, orders, notes) + ClinicalDocumentationHub for EDOC sections. Hosted under ED / Observation / Inpatient nursing surfaces for RN-proxy. French via i18n.

---

## 38. Performance

Single summary builder for multi-section projection; no one-request-per-section design. MAR/census/D4B.2/D4B.3 unchanged. History bounded by caller-supplied arrays.

---

## 39. Security and privacy

Facility/encounter scoped hosts; no cross-facility util. No lab verification privilege. No medication-order privilege escalation. HIPAA not claimed from this phase alone.

---

## 40. Data-integrity safeguards

Nursing author preserved; MAR administrator immutable in projections; vent ordered≠observed; recommendation≠order; no destructive migration.

---

## 41. Compatibility

Legacy hidden RT cards not revived. EDOC.12 AVAILABLE set reused. EncounterNoteType unchanged (OTHER / EDOC path).

---

## 42. Documented deferrals

Ventilator-device integration · respiratory telemetry · automated vent import · device capnography/spirometry · PFT lab · advanced weaning protocols · autonomous RT order sets · RT staffing/assignment engine · RT mobile app · offline-first RT charting · home O₂ vendor · DME ordering · competency platform · QC platform · D4B.5 Rehab · D4B.6 full care plan · D4B.7–10 · Prisma RT RoleCode · EncounterNoteType RESPIRATORY · ABG/specimen/suction/trach/high-flow dedicated engines.

---

## 43. Test evidence

Shared Vitest D4B.4 suite · API Jest util spec · web shell host characterization · D4B.1 registry RT types · targeted regression commands recorded in certification.

---

## 44. Final recommendation

**CERTIFIED WITH DOCUMENTED DEFERRALS.** Next phase: **MEDUI.D4B.5 — Enterprise Rehabilitation Workspaces** (do not start in this phase).
