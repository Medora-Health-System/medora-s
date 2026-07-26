# MEDUI.D4B.3 — Enterprise Technician and Nursing-Assistant Workspace Audit

**Date:** 2026-07-26  
**Branch:** `d4b3-enterprise-technician-nursing-assistant-workspace`  
**HEAD (baseline after FF origin/main):** `d2406f318` (Merge PR #54 D4B.2)  
**Mode:** Audit first — **no implementation until this inventory is materially complete**  
**Prerequisites:** `docs/certification/MEDUI.D4B.1-certification.md` + `docs/certification/MEDUI.D4B.2-certification.md` on HEAD

---

## 1. Baseline verification

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4b3-enterprise-technician-nursing-assistant-workspace` |
| `git status --short` (audit start) | clean (after FF) |
| `git fetch origin` | ok |
| `merge-base --is-ancestor origin/main HEAD` | **0** (after FF-only merge of `origin/main`) |
| D4B.1 certification on HEAD | ✔ |
| D4B.2 certification on HEAD | ✔ |
| D4B.1 / D4B.2 architecture + audit docs | ✔ |
| D4B.1 / D4B.2 shared exports | ✔ `enterpriseClinicalDocumentFoundationD4b1`, `enterpriseNursingClinicalWorkspaceD4b2` |
| Unrelated local work | None |

**Note:** Branch was at D4B.2 tip before merge commit; clean FF-only merge brought PR #54. No cherry-pick / rebase / auto-merge of other work.

---

## 2. Audit methodology

1. Repository-wide search for technician / PCT / CNA / aide / LAB / RAD / vitals / specimen / ECG / I&O / mobility / ADL / sitter / transport / task / handoff / POCT / barcode terms.
2. Inspection of hospital floor tech workspace, freestanding ER tech procedure governance, inpatient technician tasks JSON, ED/Obs/IP nursing hosts.
3. D4B.1 registry + authorship for `TECHNICIAN` discipline; D4B.2 nursing sections that must not be masqueraded.
4. RBAC gaps (`technician-tasks`, note-type defaults).
5. Classification **A–L** per D4B.3 prompt §5.
6. Stop-condition review (prompt §40) before coding.

---

## 3. Classification legend (D4B.3)

| Class | Meaning |
|-------|---------|
| **A** | Reusable technician workflow |
| **B** | Reusable with adapter |
| **C** | Nursing-owned workflow with technician contribution |
| **D** | Provider-ordered acquisition workflow |
| **E** | Operational task only |
| **F** | Historical performer attribution |
| **G** | Authorization or role control |
| **H** | Legacy compatibility |
| **I** | Duplicate task or observation source |
| **J** | Unsafe scope expansion |
| **K** | Deferred discipline work |
| **L** | Defect requiring D4B.3 correction |

---

## 4. Existing technician architectures (summary)

| Architecture | Persistence | Lifecycle today | Verdict |
|--------------|-------------|-----------------|---------|
| **Hospital floor tech workspace** | Shared vitals readings + EncounterNote | Operational UI (VITALS/NOTES/SUMMARY) | **A** + **B** compose |
| **ED technician tiles** | Triage/vitals/notes (profession TECHNICIAN) | Workspace permissions | **A** + **G** |
| **Freestanding ER procedure allowlist** | Procedure documentation + orders | LAB/RAD only; not PCT | **D** + **G** |
| **Enterprise technician tasks V1** | `admissionSummaryJson.enterpriseTechnicianTasksV1` | ASSIGNED→…→VALIDATED (RN) | **E** + **L** (PCT RBAC) |
| **Hospital board TECHNICIAN slot** | Assignment engine D4A.3.0-H1 | Assignment ≠ chart auth | **G** |
| **EDOC I&O / cardiac cards** | `EncounterClinicalDocumentationEntry` | Create≈signed | **C** / **B** |
| **D4B.2 nursing workspace** | Projections over admission/reassessment/handoff/EDOC | Nursing discipline | **C** — visibility only |
| **Device monitor contracts** | Contracts only | None | **K** |
| **Barcode / POCT device / transport platform** | Absent | — | **K** |

**Safe D4B.3 strategy:** one capability-driven workspace shell that **composes** existing vitals/notes/tasks/I&O/specimen/ECG surfaces via adapters, projects durable docs through **D4B.1**, feeds nursing visibility through **D4B.2 projections without rewriting tech authorship**, and **does not** invent barcode/POCT/device/transport platforms or a second signature engine.

---

## 5. Complete inventory

### 5.1 Roles and profession grouping

| Field | Value |
|-------|--------|
| **Files** | `apps/api/prisma/schema.prisma` (`RoleCode`), `packages/shared/src/constants/roles.ts`, `professionResolver.ts`, `adminUserAssignment.ts`, `seed-core-roles.ts` |
| **Role codes** | `PATIENT_CARE_TECH` (hospital PCT/CNA/unit tech); `LAB`; `RADIOLOGY`. **No** dedicated `CNA` / `aide` / `PCA` / `NURSING_ASSISTANT` RoleCode |
| **Profession** | `TECHNICIAN` ← `LAB` \| `RADIOLOGY` \| `PATIENT_CARE_TECH` |
| **Board slot** | `TECHNICIAN` workflow ↔ `PATIENT_CARE_TECH` only (LAB/RAD excluded from hospital care-tech slot) |
| **Class** | **G** |
| **Action** | Capability matrix by role + facility policy; do not invent new RoleCodes in D4B.3 |

### 5.2 Hospital floor technician workspace (MEDUI.HOSP.TECH.1)

| Field | Value |
|-------|--------|
| **Files** | `HospitalTechnicianActiveWorkspaceView.tsx`, `hospitalTechnicianTiles.ts`, `hospitalTechnicianSections.ts`, `hospitalTechnicianWorkspace.ts`, `HospitalTechnicianSectionNav.tsx`; route `/app/hospitalisation/active/[id]` |
| **Workflow** | Floor tech: vitals entry + summary + notes + visit summary |
| **Care setting** | INPATIENT / OBSERVATION floor departments |
| **Intended role** | Profession TECHNICIAN on floor departments (typically PATIENT_CARE_TECH) |
| **Persistence** | Triage vitals readings / vitals history; EncounterNote |
| **Authorization** | `resolveWorkspacePermissions` → VITALS/NOTES/SUMMARY; `canDocumentVitals` |
| **Performer** | Server-side vitals / note author |
| **Class** | **A** |
| **Action** | **WRAP** as D4B.3 host; extend section IA capability-aware |

### 5.3 ED technician workspace tiles

| Field | Value |
|-------|--------|
| **Files** | `workspaceAuthorization.ts` (`TECHNICIAN_EMERGENCY_TILES`), `EmergencyActiveWorkspaceView.tsx`, `edWorkspaceEdTechnicianRole1A.test.ts` |
| **Workflow** | ED tech: TRIAGE/ORDERS/RESULTS/NOTES/DISPOSITION/SUMMARY + vitals |
| **Class** | **A** + **G** |
| **Action** | Link/compose where capability allows; do not redesign ED shell |

### 5.4 Freestanding ER technician procedure governance

| Field | Value |
|-------|--------|
| **Files** | `freestandingErTechnicianAccess.ts`, `freestandingErTechnicianProcedureGovernance.ts` |
| **Allowlist** | `ekg_ecg`, `ekg_rhythm_strip`, `blood_draw_specimen_collection`, `blood_culture_collection`, `urine_collection`, `pregnancy_test` |
| **Intended role** | LAB / RADIOLOGY (not PATIENT_CARE_TECH) |
| **Order dependency** | Provider-ordered procedures |
| **Class** | **D** + **G** |
| **Action** | **REUSE** as ECG/specimen/POCT acquisition authority where already configured |

### 5.5 Vital signs engines

| Field | Value |
|-------|--------|
| **Files** | `EmergencyQuickVitalsEditor.tsx`, `VitalSummaryPanel.tsx`, `TriageVitalsReadingService`, vitals history API, `vitalsMeasurementContext.ts` |
| **Persistence** | `TriageVitalsReading` (+ encounter vitals JSON); clinical events `VITALS_RECORDED` |
| **Performer** | `recordedBy` on readings |
| **Nursing visibility** | Shared timeline; D4B.2 does not own vitals store |
| **Class** | **A** + **B** (D4B.1 projection of durable note if needed) + **F** |
| **Action** | **REUSE** live editor; activity `TECH_VITALS_ACQUISITION` |

### 5.6 Technician tasks V1

| Field | Value |
|-------|--------|
| **Files** | `inpatientRapidConvergenceD4a27c.ts` (`TECHNICIAN_TASK_TYPES`, `EnterpriseTechnicianTasksDocV1`), `InpatientTechnicianTasksPanel.tsx`, `inpatient-operations.controller.ts` GET/PATCH `technician-tasks`, `inpatient-operations.service.ts` |
| **Types** | VITAL_SIGNS, WEIGHT, GLUCOSE, INTAKE, OUTPUT, MEAL_INTAKE, HYGIENE, AMBULATION, REPOSITIONING, SPECIMEN_COLLECTION, EKG, TRANSPORT_PREP, ROUNDING, DEVICE_OBSERVATION, OTHER |
| **Persistence** | `admissionSummaryJson.enterpriseTechnicianTasksV1` |
| **Lifecycle** | Operational statuses incl. RN `VALIDATED` |
| **Authorization defect** | `@RequireRoles(PROVIDER, RN, ADMIN, LAB, RADIOLOGY)` — **omits PATIENT_CARE_TECH** |
| **Class** | **E** + **L** |
| **Action** | Narrow RBAC fix + workspace **Assigned Tasks** adapter; no full task-engine redesign |

### 5.7 Specimen collection

| Field | Value |
|-------|--------|
| **Files** | `orders.service.ts` (`documentedCollectedAt`), `DepartmentOrderDetail.tsx`, procedure Batch2 forms, chart cert laboratory evaluator |
| **Barcode** | **Absent** |
| **Class** | **D** + **E** (task type) + **K** (barcode) |
| **Action** | Section projects order/task status; defer barcode platform |

### 5.8 ECG acquisition

| Field | Value |
|-------|--------|
| **Files** | Procedure allowlist + `ProcedureDocumentBatch2Forms` EKG case; EDOC.15 cardiac cards; task type `EKG` |
| **Interpretation** | Nursing/provider/EDOC — **not** tech |
| **Class** | **D** + **C** (EDOC clinical cards) + **K** (device integration) |
| **Action** | Acquisition/status section only; never ECG interpretation |

### 5.9 Intake / Output

| Field | Value |
|-------|--------|
| **Files** | EDOC.5 payloads, `ClinicalDocumentationIntakeOutputForm.tsx`, D4B.2 `intakeOutput` section, task types INTAKE/OUTPUT/MEAL_INTAKE |
| **Class** | **C** (nursing-owned EDOC) + **E** (tasks) |
| **Action** | Tech may contribute via hub/task; authorship remains entry author; do not present as nursing assessment |

### 5.10 Mobility / ADL / repositioning / hygiene

| Field | Value |
|-------|--------|
| **Files** | Task types AMBULATION, HYGIENE, REPOSITIONING; nursing EDOC14 fall/mobility (nurse-owned) |
| **Class** | **E** + **C** (nursing mobility assessment) |
| **Action** | Task completion in tech workspace; no tech “mobility assessment” document masquerading as nursing |

### 5.11 Safety rounds / sitter / observation

| Field | Value |
|-------|--------|
| **Files** | Task type ROUNDING; behavioral health EDOC (nurse/provider); no full sitter flowsheet |
| **Class** | **E** + **K** (full sitter) |
| **Action** | Safety-rounds via tasks; sitter section **DEFERRED** |

### 5.12 Transport / room / environmental

| Field | Value |
|-------|--------|
| **Files** | Procedure `patient_transport`; task `TRANSPORT_PREP`; no EVS/dispatch platform |
| **Class** | **E** + **K** |
| **Action** | Transport prep via tasks; defer dispatch/EVS platforms |

### 5.13 Handoff

| Field | Value |
|-------|--------|
| **Files** | `InpatientNursingHandoffPanel`, `EmergencyErNursingHandoffPanel`, D4B.2 handoff projection — **nursing-owned** |
| **Tech handoff doc** | Not present as durable type |
| **Class** | **C** (nursing) + **K** (tech operational handoff doc) |
| **Action** | Do **not** mount nursing handoff as tech authoring; optional read-only nursing visibility note; defer TECH_HANDOFF durable |

### 5.14 Encounter notes (technician)

| Field | Value |
|-------|--------|
| **Files** | `encounterNote.ts`, D4B.1 `encounter_note.technician`, `EmergencyErNotesPanel` |
| **Defect** | `defaultEncounterNoteTypeForRole` maps LAB/RAD/PHARMACY → TECHNICIAN but **PATIENT_CARE_TECH → OTHER** |
| **Class** | **A** + **B** + **L** |
| **Action** | Map PCT → TECHNICIAN; project via D4B.1 adapter |

### 5.15 D4B.1 foundation

| Field | Value |
|-------|--------|
| **Files** | `enterpriseClinicalDocumentFoundationD4b1.ts` barrel, adapters, authorship, registry, lifecycle |
| **Tech support** | Discipline `TECHNICIAN`; `encounter_note.technician`; EDOC allows TECHNICIAN among disciplines |
| **Class** | **A** / **B** |
| **Action** | All durable tech docs use D4B.1; **no** independent tech signature/version engine |

### 5.16 D4B.2 nursing workspace

| Field | Value |
|-------|--------|
| **Files** | `enterpriseNursingClinicalWorkspaceD4b2.ts`, `EnterpriseNursingClinicalWorkspaceD4b2.tsx`, nursing util |
| **Must not duplicate** | Admission, systems, reassessment, pain/fall/skin judgments, care plan, nursing handoff |
| **Class** | **C** |
| **Action** | Controlled projections only; nurse review does not rewrite tech performer |

### 5.17 Device / POCT / barcode gaps

| Capability | Status | Class |
|------------|--------|-------|
| Device vitals ingestion | Contracts only (`device-monitor.contracts.ts`) | **K** |
| POCT device integration | Catalog/procedure labels only | **K** |
| Barcode specimen / patient ID | Absent | **K** |
| ECG device integration | Absent | **K** |
| Transport dispatch | Absent | **K** |
| EVS platform | Absent | **K** |
| Dedicated CNA RoleCode | Absent (use PATIENT_CARE_TECH) | **H** / policy |

---

## 6. Duplicate-concept / ownership matrix

| Concept | Authoritative | Competing | Duplicate prevented |
|---------|---------------|-----------|---------------------|
| Operational task state | `enterpriseTechnicianTasksV1` | Future generic task engines | ✔ no second task store in D4B.3 |
| Vital signs readings | Triage vitals readings engine | Task type VITAL_SIGNS (ops queue) | ✔ task ≠ reading; both kept |
| Nursing assessment | D4B.2 / D4A.1 / ED reassessment | Tech notes / tasks | ✔ tech cannot author nursing assessment |
| I&O clinical entries | EDOC5 | Task INTAKE/OUTPUT | ✔ task completion ≠ EDOC unless entry created |
| ECG clinical interpretation | EDOC / provider | Tech acquisition procedure | ✔ acquisition only |
| Encounter ownership | Enterprise ownership (D4A.4.x) | Task assignee / performer | ✔ assignment ≠ ownership |
| Performer history | Reading/note/task performer fields | Current board assignment | ✔ reassignment must not rewrite history |

---

## 7. Care-setting evidence matrix (actual)

| Capability | ED | Observation | Inpatient | Audit note |
|------------|----|-------------|-----------|------------|
| Task queue | Partial (JSON when hosted) | Yes (IP ops) | Yes | PCT RBAC defect |
| Vital signs | Yes | Yes | Yes | Shared editor |
| Measurements | Via vitals | Via vitals | Via vitals + WEIGHT task | |
| Specimen | LAB/RAD procedures + orders | Orders + tasks | Orders + tasks | No barcode |
| ECG acquisition | Freestanding allowlist + procedures | As ordered | As ordered / EKG task | No interpretation |
| POCT | pregnancy_test allowlist | As authorized | As authorized | Device POCT deferred |
| Mobility / ADL | Limited | Tasks | Tasks | No tech assessment doc |
| I&O | Limited hub | EDOC5 + tasks | EDOC5 + tasks | Nursing-owned cards |
| Safety rounds | ROUNDING task | Yes | Yes | |
| Repositioning | As needed | Tasks | Tasks | |
| Sitter | Policy/EDOC BH | Deferred full | Deferred full | **K** |
| Transport | Prep task / procedure | Prep | Prep | No dispatch platform |
| Room/equipment | ED ops limited | Limited | Limited | EVS deferred |
| Historical activity | Notes + vitals + tasks | Same | Same | D4B.1 note projection |

---

## 8. Capability matrix (certified intent)

| Capability id | ED tech (LAB/RAD/ED TECHNICIAN) | PATIENT_CARE_TECH (floor) | Notes |
|---------------|----------------------------------|---------------------------|-------|
| `vitals_acquisition` | ✔ | ✔ | Existing `canDocumentVitals` |
| `technician_notes` | ✔ | ✔ (after note-type fix) | EncounterNote TECHNICIAN |
| `technician_tasks` | ✔ (LAB/RAD already) | ✔ after RBAC L-fix | JSON tasks |
| `specimen_collection` | ✔ when procedure/order allows | Task/order status; not freestanding allowlist | Order-dependent |
| `ecg_acquisition` | ✔ when allowlisted | EKG task / as ordered | No interpretation |
| `poct_performance` | pregnancy_test when allowlisted | Deferred device POCT | **K** breadth |
| `intake_output_entry` | Limited | Contribute via EDOC/task | Nursing-owned store |
| `mobility_adl_reposition` | Limited | Via tasks | Ops only |
| `safety_rounds` | Via tasks | Via tasks | Ops only |
| `sitter_observation` | Deferred | Deferred | **K** |
| `patient_transport` | Prep | Prep | No dispatch |
| `nursing_assessment_author` | ✖ | ✖ | Hard stop |
| `ecg_interpretation` | ✖ | ✖ | Hard stop |
| `lab_result_verify` | ✖ | ✖ | Hard stop |
| `mar_admin` | ✖ | ✖ | Untouched |

**Invariant:** job title / board assignment alone does not grant capability; Nest RBAC + order/policy remain authoritative. `assignmentEqualsAuthorization: false`.

---

## 9. Activity registry (smallest coherent)

| Activity id | Kind | Care settings | D4B.1? | Nursing visibility | Selected? |
|-------------|------|---------------|--------|--------------------|-----------|
| `TECH_VITALS_ACQUISITION` | clinical observation + ops | ED/Obs/IP | Optional note; readings primary | ✔ timeline | **Yes** |
| `TECH_MEASUREMENT_ACQUISITION` | observation (weight/height via vitals/tasks) | ED/Obs/IP | Via vitals/note | ✔ | **Yes** (merged UX) |
| `TECH_SPECIMEN_COLLECTION` | provider-ordered + ops task | ED/Obs/IP | Procedure/order status | ✔ status | **Yes** (adapter) |
| `TECH_POCT_PERFORMANCE` | ordered/allowlisted | As authorized | Procedure | Limited | **Partial** / defer device |
| `TECH_ECG_ACQUISITION` | ordered acquisition | ED/Obs/IP as ordered | Procedure/task | ✔ status | **Yes** (adapter) |
| `TECH_MOBILITY_ASSISTANCE` | ops task | Obs/IP (+ED limited) | No (task) | ✔ completion | **Yes** (task) |
| `TECH_ADL_ASSISTANCE` | ops task | Obs/IP | No (task) | ✔ | **Yes** (task) |
| `TECH_INTAKE_OUTPUT_ENTRY` | nursing-owned EDOC + task | Obs/IP (+ED limited) | EDOC via D4B.1 | ✔ | **Yes** |
| `TECH_SAFETY_ROUND` | ops task | ED/Obs/IP | No (task) | ✔ | **Yes** (task) |
| `TECH_REPOSITIONING` | ops task | Obs/IP | No (task) | ✔ | **Yes** (task) |
| `TECH_SITTER_OBSERVATION` | deferred | — | — | — | **Defer** |
| `TECH_PATIENT_TRANSPORT` | ops task / procedure prep | ED/Obs/IP | No platform | ✔ prep | **Yes** (task) |
| `TECH_TASK_EXCEPTION` | ops exception fields | All with tasks | Optional note | ✔ | **Yes** (existing task fields) |
| `TECH_ESCALATION_NOTE` | ops + optional note | All with tasks | EncounterNote | ✔ | **Yes** (narrow) |
| `TECH_HANDOFF` | deferred durable | — | — | — | **Defer** |

---

## 10. Workspace IA (proposed)

Capability- and care-setting-filtered sections:

Overview · Assigned Tasks · Due/Overdue · Vital Signs · Measurements · Specimen · ECG · I&O · Mobility · ADL · Safety Rounds · Repositioning · Transport · Escalations · Completed Work · Documentation History  

**Deferred sections (visible as deferred or hidden):** POCT device, Sitter, Room/Equipment platform, Tech handoff document.

Do not create separate shells per job title unless evidence requires (audit: one profession TECHNICIAN + capability filters is sufficient).

---

## 11. ENTERPRISE DOMAIN AUDIT (constitution)

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Patient demographics | `Patient` | ✔ | — | ✔ |
| Medical/surgical/social/allergies/home meds | Longitudinal profile | ✔ read | — | ✔ no tech fork |
| Pain / fall / skin / wound | EDOC + nursing | ✔ contribute only where allowed | — | ✔ no tech assessment engine |
| I&O | EDOC5 | ✔ | Tech workspace section | ✔ |
| Devices | EDOC17 | ✔ observation task only | — | ✔ |
| Belongings / advance directives / code status | Existing | ✔ | — | ✔ |
| Care team / timeline / audit | Existing + clinical events | ✔ | Tech activity projection | ✔ |
| Draft / signature framework | D4B.1 | ✔ | Tech notes via D4B.1 | ✔ no second engine |
| MAR / orders / billing / census / ownership | Existing | Link only | — | ✔ untouched |

---

## 12. Class L defects (must correct narrowly)

| Defect | Location | Fix in D4B.3 |
|--------|----------|--------------|
| PCT cannot call technician-tasks API | `inpatient-operations.controller.ts` | Add `RoleCode.PATIENT_CARE_TECH` to GET/PATCH |
| PCT default note type OTHER | `encounterNote.ts` `defaultEncounterNoteTypeForRole` | Map `PATIENT_CARE_TECH` → `TECHNICIAN` |

---

## 13. Stop-condition review (§40)

| Condition | Result |
|-----------|--------|
| D4B.2 certification missing | **No** — present |
| Unrelated work present | **No** — clean tree at baseline |
| Tech can alter nursing docs unsigned | **No** evidence of tech write into nursing assessment stores |
| Client-controlled performer identity | Vitals/notes/tasks use server identity patterns — preserve |
| Assignment grants unauthorized capability | Board assignment ≠ chart auth already documented — keep |
| ECG interpretation / lab verify to tech | **Not** assigned — keep prohibited |
| Destructive migration required | **No** |
| Ownership / MAR redesign required | **No** |

**Proceed to implementation.**

---

## 14. Recommended implementation actions

1. Publish audit (this file).  
2. Shared capability matrix + activity registry + section IA + D4B.1 adapters for tech notes/tasks projections.  
3. Capability-driven UI shell composing existing vitals / tasks / I&O / notes hosts.  
4. Narrow Class L RBAC + note-type fixes.  
5. D4B.2 integration notes: tech observations remain attributed to tech.  
6. Tests + i18n EN/FR + architecture + certification.  
7. Defer barcode/POCT device/transport dispatch/sitter flowsheets/tech handoff durable/D4B.4+.
