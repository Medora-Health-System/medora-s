# MEDUI.D4B.3 — Enterprise Technician and Nursing-Assistant Workspace

**Date:** 2026-07-26  
**Branch:** `d4b3-enterprise-technician-nursing-assistant-workspace`  
**Certification id:** `MEDUI.ENTERPRISE_TECHNICIAN_NURSING_ASSISTANT_WORKSPACE.D4B3`  
**Prerequisites:** D4B.1 + D4B.2 certified on `origin/main`  
**Mode:** Capability-driven workspace shell + adapters; **no Prisma migration**; no independent tech signature engine; no nursing-assessment masquerade

---

## 1. Purpose

Provide one capability-aware enterprise technician and nursing-assistant workspace across Emergency, Observation, and Inpatient that **composes** existing vitals, tasks, notes, I&O, specimen, and ECG acquisition surfaces; **consumes** D4B.1 for durable documents; and **feeds** D4B.2 nursing views with technician-attributed observations — without forking lifecycle, ownership, MAR, billing, census, or inventing barcode/POCT/device/transport platforms.

---

## 2. Baseline

| Item | Value |
|------|-------|
| Branch | `d4b3-enterprise-technician-nursing-assistant-workspace` |
| Baseline after FF `origin/main` | `d2406f318` (Merge PR #54 D4B.2) |
| D4B.1 / D4B.2 on HEAD | ✔ |
| Audit | `docs/clinical/enterprise-technician-nursing-assistant-workspace-d4b3-audit.md` |

---

## 3. Audit findings

Technician/CNA capability is split across `PATIENT_CARE_TECH`, `LAB`, `RADIOLOGY`, profession `TECHNICIAN`, hospital floor tech UI (vitals/notes/summary), freestanding ER procedure allowlists, and JSON technician tasks. Class **L** defects: PCT omitted from technician-tasks RBAC; PCT default note type `OTHER`. Barcode/POCT device/transport dispatch/sitter flowsheets absent (**K**). Safe path: adapters + capability shell; honest deferrals.

---

## 4. Existing technician architectures

| Architecture | Role in D4B.3 |
|--------------|---------------|
| Hospital floor tech workspace | Primary host |
| ED technician tiles | Capability-compatible; shell not redesigned |
| Freestanding ER procedure allowlist | ECG/specimen/POCT acquisition authority (LAB/RAD) |
| `enterpriseTechnicianTasksV1` | Operational task adapter |
| Triage vitals readings | Live vitals engine |
| EncounterNote TECHNICIAN | Durable notes via D4B.1 |
| EDOC5 I&O | Nursing-owned contribution path |
| D4B.2 nursing workspace | Projection consumer — not rewritten |

---

## 5. Role and capability model

Profiles: `ED_TECHNICIAN`, `PATIENT_CARE_TECH`, `LAB_TECHNICIAN`, `RADIOLOGY_TECHNICIAN`, `SUPPORT_GENERIC`.

Capabilities include vitals, measurements, notes, tasks, specimen, ECG, POCT (deferred breadth), I&O contribution, mobility, ADL, safety rounds, repositioning, sitter (deferred), transport prep, exceptions, escalation notes.

**Prohibited:** nursing assessment authoring, ECG interpretation, lab result verification, MAR admin, provider documentation authoring.

**Invariant:** `assignmentEqualsAuthorization: false`. Job title alone does not grant capability.

---

## 6. Care-setting behavior

| Setting | Emphasis |
|---------|----------|
| **EMERGENCY** | Rapid tasks, vitals, specimen/ECG as ordered, transport prep, limited ADL |
| **OBSERVATION** | Scheduled vitals, I&O, mobility/ADL, repositioning, safety rounds, tasks |
| **INPATIENT** | Shift task queue, vitals, ADL, I&O, repositioning, longitudinal history |

Sections filtered by care setting + role capability.

---

## 7. Workspace information architecture

Sections: Overview · Assigned Tasks · Due/Overdue · Vital Signs · Measurements · POCT (deferred) · Specimen · ECG · Mobility · ADL · I&O · Safety Rounds · Repositioning · Sitter (deferred) · Transport · Room/Equipment (deferred ED) · Escalations · Completed Work · Documentation History.

One capability-driven workspace — not separate shells per job title.

---

## 8. Activity registry

Smallest coherent selected types: `TECH_VITALS_ACQUISITION`, `TECH_MEASUREMENT_ACQUISITION`, `TECH_SPECIMEN_COLLECTION`, `TECH_ECG_ACQUISITION`, `TECH_MOBILITY_ASSISTANCE`, `TECH_ADL_ASSISTANCE`, `TECH_INTAKE_OUTPUT_ENTRY`, `TECH_SAFETY_ROUND`, `TECH_REPOSITIONING`, `TECH_PATIENT_TRANSPORT`, `TECH_TASK_EXCEPTION`, `TECH_ESCALATION_NOTE`, `TECH_ENCOUNTER_NOTE`.

Deferred (not selected live): `TECH_POCT_PERFORMANCE` (device), `TECH_SITTER_OBSERVATION`, `TECH_HANDOFF`.

Each selected type declares kind (ops vs clinical vs ordered), care settings, D4B.1 use, nursing/provider visibility.

---

## 9. D4B.1 integration

Durable technician notes use D4B.1 contract via `adaptEncounterNoteToEnterpriseClinicalDocument` / observation projection helpers.

**Not created:** independent technician signature, version, or amendment engine.

`usesD4b1Lifecycle: true`, `independentTechnicianLifecycleEngine: false`.

---

## 10. D4B.2 integration

Technician vitals/task/I&O contributions remain attributed to technician. Nursing review/validation does not rewrite performer. Technician data cannot overwrite signed nursing assessment. Workspace explicitly sets `masqueradesAsNursingAssessment: false`. Nursing handoff/admission/reassessment **not** hosted as tech authoring surfaces.

---

## 11. Task ownership and assignment

Operational store: `admissionSummaryJson.enterpriseTechnicianTasksV1`. Distinguishes assignee, performer, RN validator, escalation/exception fields. Encounter ownership (D4A.4.x) untouched. Board assignment ≠ chart authorization. No new staffing/delegation platform.

---

## 12. Vital signs and measurements

**Authoritative:** shared vitals engine (`EmergencyQuickVitalsEditor`, vitals readings history). Activity `TECH_VITALS_ACQUISITION` / measurements via vitals + WEIGHT task. Device ingestion deferred.

---

## 13. Point-of-care testing

Allowlisted procedures (e.g. pregnancy test for freestanding ER LAB/RAD) remain. Device-integrated POCT **deferred**. Section marked `DEFERRED`.

---

## 14. Specimen collection

Order collection timestamps + procedure forms + `SPECIMEN_COLLECTION` tasks. Barcode patient/specimen verification **deferred**. Section is ops/link + task filter, not a new lab engine.

---

## 15. ECG acquisition

Procedure allowlist + Batch2 EKG forms + `EKG` tasks. **Acquisition only** — interpretation remains nursing/provider/EDOC. Device integration deferred.

---

## 16. Mobility and transfers

Operational via `AMBULATION` tasks. Nursing fall/mobility assessment remains D4B.2/EDOC14 — tech does not author mobility assessments.

---

## 17. Activities of daily living

Operational via `HYGIENE` / related tasks (Obs/IP). No parallel ADL clinical assessment store.

---

## 18. Intake and output

**Authoritative clinical entries:** EDOC5 (nursing-owned). Tech contributes via hub section + INTAKE/OUTPUT tasks. Authorship remains entry author.

---

## 19. Safety rounds

Operational via `ROUNDING` tasks. Not a substitute for nursing safety documentation.

---

## 20. Sitter observation

**Deferred** full behavioral flowsheets. Section mode `DEFERRED`.

---

## 21. Repositioning

Operational via `REPOSITIONING` tasks (Obs/IP). Pressure-injury clinical assessment remains nursing/EDOC.

---

## 22. Patient transport

`TRANSPORT_PREP` tasks + existing procedure id where present. Transport-dispatch platform **deferred**.

---

## 23. Operational room and equipment tasks

ED-visible deferred section. EVS platform **deferred**.

---

## 24. Exceptions and escalation

Task fields `UNABLE_TO_COMPLETE` / `ESCALATED` / `exceptionNote` / `escalationRequired`. Optional durable escalation via technician EncounterNote (D4B.1).

---

## 25. Handoff

Nursing handoff remains nurse-owned (D4B.2). Durable `TECH_HANDOFF` **deferred**. Do not masquerade nursing handoff as tech content.

---

## 26. Performer attribution

Server-authoritative performer on vitals/notes/tasks. Reassignment must not rewrite historical performer. Nursing/provider review does not replace technician performer. Users cannot complete/sign as another user.

---

## 27. Authorization

Nest `@RequireRoles` remains authoritative. Class L fix: `PATIENT_CARE_TECH` added to technician-tasks GET/PATCH. Facility/order/policy may narrow capabilities. Assignment never grants capability alone.

---

## 28. Auditability

Existing clinical events (e.g. `VITALS_RECORDED`, `TECHNICIAN_TASKS_PATCHED`) retained. D4B.1 documents carry authorship snapshots. No silent overwrite of historical performer.

---

## 29. Duplicate-concept normalization

| Concept | Authoritative |
|---------|---------------|
| Task state | Technician tasks V1 |
| Vitals readings | Vitals engine |
| Nursing assessment | D4B.2 / D4A.1 / ED reassessment |
| I&O clinical | EDOC5 |
| ECG interpretation | Provider/nursing/EDOC |
| Encounter ownership | D4A.4.x |

Operational task ≠ clinical document ≠ nursing assessment; performer ≠ encounter owner.

---

## 30. API architecture

Thin projection util `projectEnterpriseTechnicianNursingAssistantWorkspace` (Nest-facing). Existing technician-tasks endpoints (RBAC widened for PCT). No new chatty endpoints; no unrestricted mutation surface. Prefer compose existing reads.

---

## 31. Frontend architecture

`EnterpriseTechnicianNursingAssistantWorkspaceD4b3` capability-aware shell hosted by `HospitalTechnicianActiveWorkspaceView`, composing:

- vitals live engine slot
- `InpatientTechnicianTasksPanel`
- notes slot
- EDOC hub for I&O

French UI via i18n EN/FR message modules. Existing hospital tiles retained for compatibility.

---

## 32. Performance

Lightweight: local section state, reuse existing panels, no WebSockets, no deep nested fetches beyond existing task/vitals/notes loads.

---

## 33. Security and privacy

Facility-scoped ops APIs; role checks on tasks; prohibited capabilities enforced in shared matrix; no cross-facility redesign. Assignment does not bypass Nest RBAC.

---

## 34. Data-integrity safeguards

Append-safe notes; task optimistic versioning retained; performer preservation helpers; no destructive migration; no deletion of legacy task/observation data.

---

## 35. Compatibility

Hospital tech tiles VITALS/NOTES/SUMMARY remain. ED technician tiles unchanged. LAB/RAD queues unchanged. Freestanding ER allowlist unchanged. D4B.1/D4B.2 contracts untouched except consumption.

---

## 36. Documented deferrals

- Durable enterprise technician-assignment model beyond board slot  
- Advanced task-delegation engine  
- Device-integrated vitals / POCT / ECG  
- Barcode specimen / patient verification  
- Transport-dispatch platform  
- Environmental-services platform  
- Workforce scheduling  
- Technician mobile app  
- Offline-first acquisition  
- Full sitter behavioral flowsheets  
- Facility competency management  
- Durable TECH_HANDOFF document  
- D4B.4–D4B.10 discipline workspaces  

---

## 37. Test evidence

Shared vitest suite for registry/sections/performer/projections; API util jest spec; web smoke tests for host composition + PCT RBAC; encounterNote default type for PCT; builds/typecheck as executed in certification.

---

## 38. Final recommendation

**CERTIFIED WITH DOCUMENTED DEFERRALS** — ship coherent capability-aware shell + adapters for vitals, tasks, I&O, notes, specimen/ECG status guidance; narrow Class L RBAC/note-type fixes; defer barcode/POCT device/transport/sitter platforms.

**Next phase:** **MEDUI.D4B.4 — Enterprise Respiratory Therapy Workspace** (do not start in this phase).
