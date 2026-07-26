# MEDUI.D4B.4 — Enterprise Respiratory Therapy Workspace Audit

**Date:** 2026-07-26  
**Branch:** `d4b4-enterprise-respiratory-therapy-workspace`  
**HEAD (baseline after FF origin/main):** `e5bb9e441` (Merge PR #55 D4B.3)  
**Mode:** Audit first — **no implementation until this inventory is materially complete**  
**Prerequisites:** `docs/certification/MEDUI.D4B.1|2|3-certification.md` on HEAD

---

## 1. Baseline verification

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4b4-enterprise-respiratory-therapy-workspace` |
| `git status --short` (audit start) | clean (after FF) |
| `git fetch origin` | ok |
| `merge-base --is-ancestor origin/main HEAD` | **0** (after FF-only merge of `origin/main`) |
| D4B.1 / D4B.2 / D4B.3 certifications on HEAD | ✔ |
| D4B.1–3 architecture docs | ✔ |
| Shared exports D4B.1–3 | ✔ `enterpriseClinicalDocument*D4b1`, `enterpriseNursingClinicalWorkspaceD4b2`, `enterpriseTechnicianNursingAssistantWorkspaceD4b3` |
| Unrelated local work | None |

**Note:** Branch was behind `origin/main` by PR #55 (D4B.3). Clean FF-only merge brought D4B.3. No cherry-pick / rebase / auto-merge of other work.

---

## 2. Audit methodology

1. Repository-wide search for respiratory / RT / oxygen / airway / ventilator / nebulizer / ABG / peak flow / suction / trach / BiPAP / CPAP / HFNC / SpO2 terms.
2. Inspection of EDOC.12 respiratory cards, oxygen order parameters, MAR respiratory response, procedure catalog RT→RN proxy, D4B.1–3 modules.
3. RoleCode / professionResolver / hospital board assignment review (RT absent / excluded).
4. Classification **A–L** per D4B.4 prompt §5.
5. Stop-condition review (prompt §46) before coding.

---

## 3. Classification legend (D4B.4)

| Class | Meaning |
|-------|---------|
| **A** | Reusable Respiratory Therapy workflow |
| **B** | Reusable with D4B.1 adapter |
| **C** | Nursing-owned respiratory assessment |
| **D** | Technician-obtained measurement |
| **E** | Provider-ordered treatment or device workflow |
| **F** | MAR-governed medication administration |
| **G** | Historical performer attribution |
| **H** | Operational display only |
| **I** | Legacy compatibility |
| **J** | Duplicate respiratory concept |
| **K** | Deferred device or platform integration |
| **L** | Defect requiring D4B.4 correction |

---

## 4. Existing respiratory architectures (summary)

| Architecture | Persistence | Lifecycle today | Verdict |
|--------------|-------------|-----------------|---------|
| **EDOC.12 respiratory cards** | `EncounterClinicalDocumentationEntry` | Create≈signed hub docs | **A** + **C** (RN primary) + **B** |
| **Oxygen therapy orders** | Procedure notes `[O2_PARAMS:…]` | Provider order | **E** |
| **MAR respiratory medication response** | MAR admin notes codec | MAR-authoritative | **F** |
| **Procedure catalog RESPIRATORY/RT** | Orders + execution profile | RT→RN proxy | **E** + **G** |
| **D4B.2 nursing respiratory section** | Nursing workspace → EDOC | Nursing discipline | **C** |
| **D4B.3 tech SpO2 / vitals** | `Triage` / `TriageVitalsReading` | Tech performer | **D** |
| **D4B.1 RESPIRATORY_THERAPY discipline** | Contract enum only | No RT doc types yet | **B** + **K** |
| **ED respiratory order sets** | Catalog | Provider | **E** |
| **Device monitor SPO2 contracts** | Contracts only | None | **K** |
| **Ventilator EDOC card** | Manual observation | Not telemetry | **A** + **K** |
| **Hospital board RT slot** | Explicitly excluded | — | **K** |
| **Dedicated RT RoleCode / workspace** | Absent | — | **K** / soft **L** (proxy attribution) |

**Safe D4B.4 strategy:** one capability-driven RT workspace shell that **composes** EDOC.12, oxygen order display, MAR respiratory-response projection, procedure work-queue filters, and D4B.3 SpO2 visibility via adapters; durable docs through **D4B.1**; nursing concepts remain **D4B.2**; **no** independent RT signature engine, **no** duplicate MAR, **no** vent device platform, **no** Prisma RoleCode/note-type migration unless proven necessary.

---

## 5. Complete inventory

### 5.1 Roles and profession grouping

| Field | Value |
|-------|--------|
| **Files** | `apps/api/prisma/schema.prisma` (`RoleCode`), `packages/shared/src/constants/roles.ts`, `professionResolver.ts` |
| **Role codes** | No `RT` / `RESPIRATORY` / therapist RoleCode |
| **Profession** | No RT group; catalog `RT` maps to **RN proxy** (`enterpriseProcedureExecutionProfile.ts`) |
| **Board** | `RESPIRATORY` in `HOSPITAL_BOARD_EXCLUDED_ASSIGNMENT_ROLES` |
| **Class** | **G** + **K** |
| **Action** | Capability matrix by profile (RT intent / RN-with-RT-permissions / measurement-only); **do not** invent RoleCode in D4B.4 |

### 5.2 EDOC.12 respiratory documentation

| Field | Value |
|-------|--------|
| **Files** | `respiratoryDocumentationPayloads.ts`, `ClinicalDocumentationRespiratoryForm.tsx`, registry/catalog, API clinical-documentation specs |
| **Cards** | `resp_assessment`, `oxygen_therapy_initiation`, `oxygen_titration`, `nebulizer_reassessment`, `resp_cpap_bipap`, `respiratory_distress_reassessment`, `resp_ventilator`, `resp_peak_flow` |
| **primaryRole** | Mostly RN; CPAP/BiPAP + vent tagged RT intent |
| **Class** | **A** + **C** + **B** |
| **Action** | **WRAP** as RT assessment / O₂ / NIV / vent observation / peak-flow adapters; do not fork EDOC.12 |

### 5.3 Oxygen therapy orders

| Field | Value |
|-------|--------|
| **Files** | `oxygenTherapyOrderParameters.ts`, `OxygenTherapyOrderForm.tsx`, work-queue display |
| **Params** | Device, flow, FiO₂, frequency, SpO₂ target, `rtInvolvement` |
| **Class** | **E** |
| **Action** | Project active O₂ orders + RT involvement flags; recommendation ≠ order |

### 5.4 MAR respiratory medication response

| Field | Value |
|-------|--------|
| **Files** | `respiratoryMedicationResponse*.ts`, MAR panels, `POST …/respiratory-response` |
| **Authority** | MAR administration remains source of dose |
| **Class** | **F** |
| **Action** | Project / link treatment-response docs; **never** duplicate admin store |

### 5.5 Procedure catalog / RT requests

| Field | Value |
|-------|--------|
| **Files** | `enterpriseProcedureCatalog.ts`, `canonicalCareProcedureStaffOrdersWave1Manifest.ts`, execution profile |
| **Examples** | `oxygen_therapy`, `nebulizer_treatment`, `respiratory_treatment`, `bipap_rt_request`, `peak_flow_rt_request`, suctioning, airway_assist |
| **Class** | **E** + **G** |
| **Action** | Active respiratory orders section via work-queue filter |

### 5.6 Nursing respiratory assessment (D4B.2)

| Field | Value |
|-------|--------|
| **Files** | `enterpriseNursingClinicalWorkspaceD4b2.ts` section `respiratory`, med-surg H2T, ER reassessment, lifecycle admission |
| **Class** | **C** |
| **Action** | Visibility / parallel authorship only; RT must not overwrite |

### 5.7 Technician SpO2 / vitals (D4B.3)

| Field | Value |
|-------|--------|
| **Files** | D4B.3 vitals activity; `Triage.vitalsJson` / `TriageVitalsReading` |
| **Class** | **D** |
| **Action** | Read-only projection in RT overview; preserve tech performer |

### 5.8 EncounterNote types

| Field | Value |
|-------|--------|
| **Files** | `encounterNoteTypes.ts`, Prisma `EncounterNoteType` enum |
| **Types** | PROVIDER / NURSING / TECHNICIAN / OTHER only |
| **Class** | **K** (dedicated RESPIRATORY type needs migration) |
| **Action** | Defer enum add; use EDOC + D4B.1 RT document types; OTHER notes may carry narrative with discipline designation only when server-authoritative |

### 5.9 D4B.1 foundation

| Field | Value |
|-------|--------|
| **Discipline** | `RESPIRATORY_THERAPY` present |
| **Registry** | No RT document types yet |
| **Class** | **B** + soft **L** (unused discipline) |
| **Action** | Register RT document/activity types; reuse adapters; no second lifecycle |

### 5.10 Provider respiratory surfaces

| Field | Value |
|-------|--------|
| **Files** | Complaint intel, MSE examRespiratory, discharge templates, order sets |
| **Class** | **E** (orders) / provider docs out of scope |
| **Action** | Do not host provider documentation in RT workspace |

### 5.11 Device / vent telemetry / PFT / home O2

| Field | Value |
|-------|--------|
| **Evidence** | Device contracts; ICU `VENTILATOR_DOCUMENTATION` shell; ABG lab catalog; no PFT engine; no home O2 vendor |
| **Class** | **K** |
| **Action** | Defer; document manual-entry limitations on vent checks |

### 5.12 Legacy RT cards

| Field | Value |
|-------|--------|
| **Cards** | Hidden `flow_respiratory_therapy`, `resp_oxygen_therapy`, `resp_nebulizer` |
| **Class** | **I** + **J** risk if revived |
| **Action** | Do not revive; use EDOC.12 AVAILABLE set |

### 5.13 Workflow / taxonomy

| Field | Value |
|-------|--------|
| **Files** | `enterpriseWorkflowEngineD4a28` RESPIRATORY dept / RESPIRATORY_CARE task; hospital taxonomy support `RESPIRATORY_THERAPY` |
| **Class** | **H** + **K** (no staffing engine) |
| **Action** | Optional display labels only; no board RT column |

---

## 6. Distinctions (required)

| Concept | Owner / store | RT workspace role |
|---------|---------------|-------------------|
| RT assessment | EDOC.12 / future RT doc type | Author via hub adapter |
| Nursing respiratory assessment | D4B.2 / nursing EDOC | Project only |
| Tech SpO2 | Vitals engine / D4B.3 | Project; tech performer preserved |
| Provider order | Orders / O₂ params | Display + linkage; not create |
| MAR administration | MAR | Authoritative; RT response links |
| Device observation | EDOC vent/NIV cards (manual) | Document observation ≠ order |
| Recommendation | RT narrative / care-plan contribution | ≠ order / ≠ discharge authority |

---

## 7. Duplicate-concept normalization (designate, do not delete)

| Concept | Authoritative source | Projection consumer | Adapter | Deprecated |
|---------|---------------------|---------------------|---------|------------|
| SpO2 | Triage vitals readings | RT / nursing / tech | D4B.3 projection | — |
| O2 device (ordered) | Oxygen order params | RT O2 section | Display resolver | — |
| O2 device (documented) | EDOC.12 O2 cards | RT / chart summary | EDOC adapter | Legacy O2 cards hidden |
| Breath sounds / WOB | EDOC.12 / nursing reassessment | Discipline-specific | Parallel authorship | — |
| Neb treatment admin | MAR | RT treatment response | MAR response codec | — |
| Vent settings | Provider order + EDOC observation | RT vent section | Manual entry note | Device telemetry deferred |
| Peak flow | EDOC.12 `resp_peak_flow` | RT measurements | EDOC | Full PFT deferred |

---

## 8. Smallest coherent RT capability + activity registry (from audit)

### Role profiles (capability designation — not RoleCodes)

- `RESPIRATORY_THERAPIST` — future RT; today **unavailable** without RoleCode (matrix reserved)
- `NURSE_WITH_RT_PERMISSIONS` — RN completing RESPIRATORY execution (MVP proxy)
- `TECHNICIAN_MEASUREMENT_ONLY` — SpO2/RR visibility only; **no** RT assessment
- `SUPPORT_READ_ONLY` — projection without authoring

### Selected activities (live)

| Activity | Source | Class |
|----------|--------|-------|
| `RT_INITIAL_ASSESSMENT` | EDOC `resp_assessment` | A/B |
| `RT_REASSESSMENT` | EDOC distress / neb reassessment | A/B |
| `RT_TREATMENT_RESPONSE` | MAR respiratory response | F/B |
| `RT_OXYGEN_DEVICE_ASSESSMENT` | EDOC O2 initiation/titration + order display | A/E |
| `RT_AIRWAY_ASSESSMENT` | EDOC + airway concepts (projection) | A |
| `RT_NONINVASIVE_VENTILATION_CHECK` | EDOC CPAP/BiPAP | A |
| `RT_VENTILATOR_CHECK` | EDOC ventilator (manual) | A/K |
| `RT_BEDSIDE_MEASUREMENT` | EDOC peak flow | A |
| `RT_EDUCATION_NOTE` | Education topic RESPIRATORY_CARE where present | B/K limited |
| `RT_CARE_PLAN_UPDATE` | Care-plan discipline token projection | B limited |
| `RT_HANDOFF` | Projection / note adapter | B limited |
| `RT_DISCHARGE_RECOMMENDATION` | Recommendation projection (not discharge auth) | B limited |

### Deferred (selected=false)

`RT_ABG_COLLECTION` (collection platform beyond order/lab status), `RT_RESPIRATORY_SPECIMEN_COLLECTION` (beyond existing specimen ops), full `RT_HIGH_FLOW_CHECK` device telemetry, `RT_ARTIFICIAL_AIRWAY_CHECK` / `RT_TRACHEOSTOMY_CARE` as separate engines (project via airway/vent cards only), staffing engine, home O2 vendor, PFT lab.

---

## 9. Stop-condition review (§46)

| Condition | Status |
|-----------|--------|
| D4B.3 certification missing | **Clear** (present after FF) |
| Unrelated work | **Clear** |
| Unsigned mutation of nursing/provider docs | Not present; must not introduce |
| Client-controlled therapist/signer | Must keep server-authoritative |
| Assignment grants RT capability | Board excludes RT; matrix `assignmentEqualsAuthorization: false` |
| Duplicate MAR | Must not create |
| Ungoverned vent setting change | Manual observation only; distinguish order/observed/recommendation |
| Destructive migration | Not required |
| Exceeds D4B.4 scope | Stay on adapters + shell |

**Verdict:** Safe to proceed to implementation with honest deferrals.

---

## 10. Recommended implementation shape

1. Shared `enterpriseRespiratoryTherapyWorkspaceD4b4.ts` — capabilities, activities, sections, projections, eligibility.
2. Additive D4B.1 registry entries for RT document types (EDOC / reference virtual).
3. Thin Nest projection util (no unrestricted mutation API).
4. Care-setting-aware web shell composing ClinicalDocumentationHub (RESPIRATORY), MAR response panel slot, O₂ order projection slot, tech SpO2 slot.
5. Host on existing ED / Observation / Inpatient nursing surfaces for RN-proxy (no new global shell).
6. i18n EN/FR; tests; architecture + certification docs.

**Do not:** Prisma RoleCode, EncounterNoteType migration, vent telemetry platform, second signature engine, D4B.5.
