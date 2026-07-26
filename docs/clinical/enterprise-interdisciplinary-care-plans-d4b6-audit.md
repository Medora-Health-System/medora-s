# MEDUI.D4B.6 — Enterprise Interdisciplinary Care Plans Audit

**Date:** 2026-07-26  
**Branch:** `d4b6-enterprise-interdisciplinary-care-plans`  
**HEAD (baseline):** `e3b516ba0` (Merge PR #57 D4B.5)  
**Mode:** Audit first — **no implementation until this inventory is materially complete**  
**Prerequisites:** `docs/certification/MEDUI.D4B.1|2|3|4|5-certification.md` on HEAD

---

## 1. Baseline verification

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4b6-enterprise-interdisciplinary-care-plans` |
| `git status --short` (audit start) | clean |
| `git fetch origin` | ok |
| `git rev-parse HEAD` | `e3b516ba0a1d65be5dd620bb291e084764ee6e23` |
| `git rev-parse origin/main` | `e3b516ba0a1d65be5dd620bb291e084764ee6e23` |
| `merge-base --is-ancestor origin/main HEAD` | **0** |
| `rev-list --left-right --count origin/main...HEAD` | **0 0** |
| D4B.1 / D4B.2 / D4B.3 / D4B.4 / D4B.5 certifications on HEAD | ✔ |
| D4B.1–5 architecture docs | ✔ |
| Shared exports D4B.1–5 | ✔ |
| Unrelated local work | None |
| Prior D4B.6 attempt in working tree | **Absent** (re-implement from D4B.5 baseline) |
| Behind `origin/main` | **0** (HEAD == origin/main) |

D4B.5 is present on `origin/main` via PR #57. Safe to proceed.

---

## 2. Audit methodology

1. Repository-wide search for care plan / carePlan / care_plan / interdisciplinary / nursing diagnosis / NANDA / intervention / goal / outcome / template activation / discharge readiness terms.
2. Inspection of D3E `inpatientCarePlanV1`, EDOC.19 nursing admission/care-plan cards, D4B.2 `carePlan` section, D4B.4 `rt.care_plan_contribution`, D4B.5 rehab goals (`contributionToCarePlanOnly`), Observation/Inpatient `carePlan` hosts, D4B.1 lifecycle/registry.
3. Classification **A–V** per D4B.6 legend below.
4. Stop-condition review before coding (no CM/SW/UR/Pharmacy/Nutrition/Provider/Billing workspaces; no independent signature engine; no auto-activation from diagnosis alone; no Prisma destructive migration).

---

## 3. Classification legend (D4B.6)

| Class | Meaning |
|-------|---------|
| **A** | Reusable interdisciplinary care-plan engine (target — currently absent) |
| **B** | Reusable care-plan template catalog / governance |
| **C** | Reusable with D4B.1 adapter (lifecycle, registry, authorship) |
| **D** | Nursing-owned care-plan contribution (project / compose; do not overwrite) |
| **E** | Technician-owned task overlap (project only) |
| **F** | RT-owned care-plan contribution (D4B.4; project / compose) |
| **G** | Rehab (PT/OT/SLP) goals contribution (D4B.5; not full IDCP) |
| **H** | Provider diagnosis / problem-list / MDM (must remain separate) |
| **I** | Provider order / POE / MAR / diet / O2 / vent authority |
| **J** | Discharge authorization / CM/SW/UR engine (D4B.7+) |
| **K** | Historical attribution / narrative stickers |
| **L** | Operational display / nav shell only |
| **M** | Legacy compatibility (D3E stub) |
| **N** | Duplicate concept risk if forked |
| **O** | Recommendation ≠ order / ≠ authority boundary |
| **P** | Safety precaution documentation (≠ activation of isolation/restraints) |
| **Q** | Education / teaching plan component |
| **R** | Monitoring / reassessment schedule (≠ order) |
| **S** | Custom patient-specific plan components |
| **T** | Template governance / versioning |
| **U** | Care-setting projection matrix (ED limited; Obs/IP full) |
| **V** | Deferred (CM/SW/UR, pharmacy, nutrition workspace, billing, RoleCode, huge catalog, offline sync) |

---

## 4. Existing care-plan architectures (summary)

| Architecture | Persistence | Lifecycle today | Verdict |
|--------------|-------------|-----------------|---------|
| **D4B.1 foundation** | Contract + registry + authorship | DRAFT→SIGNED→AMEND/EIE | **C** — **must reuse**; no independent care-plan signature engine |
| **D3E `inpatientCarePlanV1`** | Ops JSON append-only goals | ACTIVE/MET/DISCONTINUED | **M** + **N** + **L** — stub; compose/upgrade, do not fork parallel engine |
| **EDOC.19 nursing care plan cards** | EDOC structured payloads | Nursing authorship | **D** + **N** — nursing initiation/update ≠ full IDCP |
| **D4B.2 nursing workspace `carePlan`** | Points at nursing update / EDOC | Nursing | **D** — project nursing contributions |
| **D4B.4 `rt.care_plan_contribution`** | REFERENCE_VIRTUAL / EDOC | RT | **F** + **O** — contribution only |
| **D4B.5 rehab goals** | `pt.goals` / `ot.goals` / `slp.goals` | Explicit `isNotFullInterdisciplinaryCarePlan` | **G** + **O** — keep distinct; compose into IDCP |
| **Observation `carePlan` section** | Static i18n placeholder | — | **L** — replace with D4B.6 Obs activation shell |
| **Inpatient `carePlan` section** | D3E ops panel + discipline list | Flag-gated | **M** + **L** — host D4B.6 primary UX; keep D3E compatibility projection |
| **NANDA / nursing diagnosis engine** | **Absent** | — | **V** — do not invent diagnosis taxonomy |
| **Problem-list mutation from plan** | **Absent / must remain so** | — | **H** — hard separation |
| **Dedicated interdisciplinary template catalog** | **Absent** | — | **B** + **T** — target of this phase (curated) |
| **CM / SW / UR / Nutrition / Pharmacy workspaces** | **Absent** | — | **J** / **V** — D4B.7+ |
| **Auto-activation from diagnosis/risk** | **Absent (correct)** | — | Must remain **absent** |

**Safe D4B.6 strategy:** one enterprise interdisciplinary care-plan domain on D4B.1 lifecycle; code-governed curated ACTIVE template catalog (versioned, localized, testable); patient-specific activation that **never mutates** source templates; compose nursing EDOC.19, RT contributions, rehab goals, and D3E stub as projections; Obs + IP full activation workflows; ED limited projection; hard authority boundaries (plan ≠ diagnosis ≠ order ≠ MAR ≠ diet ≠ O2/vent ≠ discharge auth ≠ DME ≠ precaution activation); prefer **CERTIFIED WITH DOCUMENTED DEFERRALS** over unsafe breadth.

---

## 5. Complete inventory (selected findings)

### 5.1 D4B.1 lifecycle and registry

| Field | Value |
|-------|--------|
| **Files** | `enterpriseClinicalDocumentContractD4b1.ts`, `enterpriseClinicalDocumentLifecycleD4b1.ts`, `enterpriseClinicalDocumentRegistryD4b1.ts`, authorship/adapters |
| **States** | DRAFT → IN_PROGRESS → READY_FOR_SIGNATURE → SIGNED → (COSIGN) → AMENDED / CORRECTED / ENTERED_IN_ERROR / VOIDED |
| **Care-plan types** | **Absent** (`care_plan.*` not registered) |
| **Class** | **C** |
| **Action** | Additive `care_plan.activation` / `progress_evaluation` / `review` / `revision` / `completion` / `discontinuation` / `entered_in_error`; reuse lifecycle; `assignmentEqualsAuthorization: false` |

### 5.2 D3E inpatient care-plan stub

| Field | Value |
|-------|--------|
| **Files** | `packages/shared/src/encounters/inpatientCarePlanV1.ts`, `InpatientClinicalOpsPanel` mode=`carePlan`, `inpatient-operations.service.ts` `appendCarePlanItem`, flag `NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED` |
| **Model** | Discipline token + goalText + ACTIVE/MET/DISCONTINUED |
| **Class** | **M** + **N** + **L** |
| **Action** | Project as legacy compatibility; D4B.6 patient plan is authoritative interdisciplinary surface; do not create second durable schema |

### 5.3 EDOC.19 nursing admission / care plan

| Field | Value |
|-------|--------|
| **Files** | `nursingAdmissionCarePlanDocumentationPayloads.ts`, cards `nursing_care_plan_initiation` / `nursing_care_plan_update`, hub forms, clinicalDocumentationRegistry |
| **Class** | **D** + **N** |
| **Action** | Project nursing-authored initiation/update into IDCP; never overwrite nursing authorship; EDOC.19A automation remains deferred |

### 5.4 D4B.2 nursing clinical workspace

| Field | Value |
|-------|--------|
| **Files** | `enterpriseNursingClinicalWorkspaceD4b2.ts`, section `carePlan` |
| **Class** | **D** |
| **Action** | Keep nursing workspace intact; IDCP hosts separately under Obs/IP `carePlan` (and ED projection); compose contributions |

### 5.5 D4B.3 technician overlap

| Field | Value |
|-------|--------|
| **Files** | `enterpriseTechnicianNursingAssistantWorkspaceD4b3.ts` |
| **Class** | **E** |
| **Action** | Monitoring/intervention progress may reference tech task completion as projection; never rewrite tech performer |

### 5.6 D4B.4 RT care-plan contribution

| Field | Value |
|-------|--------|
| **Files** | `enterpriseRespiratoryTherapyWorkspaceD4b4.ts`, registry `rt.care_plan_contribution`, section `carePlanContributions` |
| **Class** | **F** + **O** |
| **Action** | Project RT contributions into IDCP; RT docs remain RT-owned; contribution ≠ full plan; O2/vent remain RT/order authority — plan cannot alter |

### 5.7 D4B.5 rehabilitation goals

| Field | Value |
|-------|--------|
| **Files** | `enterpriseRehabilitationWorkspacesD4b5.ts` (`RehabilitationGoalsStructuredPayload.contributionToCarePlanOnly`, `isNotFullInterdisciplinaryCarePlan`) |
| **Class** | **G** + **O** |
| **Action** | Keep PT/OT/SLP distinct; project goals into IDCP; equipment/diet/discharge rehab recs remain recommendations |

### 5.8 Observation and Inpatient hosts

| Field | Value |
|-------|--------|
| **Files** | `ObservationWorkspacePanel.tsx` `case "carePlan"` (placeholder), `InpatientWorkspacePanel.tsx` `case "carePlan"` (D3E), `EmergencyActiveWorkspaceView.tsx` (nursing hosts RT/rehab only today) |
| **Class** | **L** + **U** |
| **Action** | IP + Obs: full D4B.6 shell in `carePlan` section; ED: limited projection / awareness only (no full activation engine buried in note composer) |

### 5.9 Diagnosis / problem list / orders / MAR / diet / discharge

| Field | Value |
|-------|--------|
| **Diagnosis / problem list** | Provider MDM / problem surfaces — **H** — plan must not mutate |
| **POE / MAR** | Existing order/MAR engines — **I** — intervention recommendation ≠ order; plan ≠ administer |
| **Diet / O2 / vent** | Order / RT authority — **I** + **O** |
| **Discharge auth / CM/SW/UR** | Ops shells + D4B.7 — **J** + **V** |
| **Action** | Hard false flags on summary; UI banners; tests |

### 5.10 Template catalogs / NANDA / huge libraries

| Field | Value |
|-------|--------|
| **Enterprise IDCP template catalog** | **Absent** |
| **NANDA** | **Absent** |
| **Class** | **B** + **T** + **V** |
| **Action** | Curated high-quality ACTIVE starters only; code-governed governance statuses; defer hundreds of shallow templates and full NANDA |

### 5.11 Safety precautions

| Field | Value |
|-------|--------|
| **Existing** | Fall precautions CARE, isolation ops, restraint flows (where present) |
| **Class** | **P** + **I** |
| **Action** | Care-plan safety components document/recommend precautions; **do not** independently authorize restraints/isolation activation |

### 5.12 Education

| Field | Value |
|-------|--------|
| **Existing** | Nursing/RT/rehab education notes |
| **Class** | **Q** |
| **Action** | Education components on patient plan; discipline education docs remain discipline-owned contributions |

---

## 6. Duplicate-source matrix

| Concept | Existing owner | D4B.6 action | Duplicate prevented? |
|---------|----------------|--------------|----------------------|
| Document lifecycle / signature / amend | D4B.1 | Reuse | ✔ |
| Nursing care plan initiation/update | EDOC.19 / D4B.2 | Project | ✔ |
| RT care-plan contribution | D4B.4 | Project | ✔ |
| PT/OT/SLP goals | D4B.5 | Project; keep distinct | ✔ |
| D3E goal stub | D3E ops | Legacy projection | ✔ |
| Diagnosis | Provider | Never mutate | ✔ |
| Provider orders / MAR | POE/MAR | Never create/alter | ✔ |
| Diet / O2 / vent authority | Orders / RT | Recommendations only | ✔ |
| Discharge authorization | Discharge / D4B.7 | Recommendation only | ✔ |
| Full IDCP engine | **None** | **Create once** | ✔ (if single domain) |

---

## 7. Proposed curated starter catalog (pre-implementation intent)

Implement only if content quality is solid; document each fully; defer the rest explicitly.

| Template ID (intent) | Priority | Notes |
|----------------------|----------|-------|
| `fall_risk` | Required | Link nursing fall projection; safety ≠ restraint auth |
| `aspiration_risk` | Required | Link swallow screen / SLP contribution; ≠ diet order |
| `acute_pain` | Required | Nursing pain foundation; ≠ MAR / prescribe |
| `pneumonia` | Required | Monitoring/education; ≠ auto antibiotic order |
| `chf` | Required | Fluid/weight monitoring; ≠ diet/O2 order |
| `impaired_mobility` | Required | Compose PT/OT/tech projections |
| `pressure_injury_risk` | Required | Skin/wound foundation; nursing-owned assessments projected |
| `discharge_readiness` | Partial OK | Recommendation / checklist; ≠ discharge auth (D4B.7) |

**Deferred examples (non-exhaustive):** COPD exacerbation deep protocol, sepsis pathways, behavioral health full protocols, diabetes full endocrine, stroke full pathway, wound VAC protocols, CM/SW/UR templates, pharmacy MTM plans, nutrition care process, pediatric specialty packs, hundreds of NANDA mappings.

---

## 8. Care-setting matrix (intent)

| Setting | Activation | Progress / review | Notes |
|---------|------------|-------------------|-------|
| **EMERGENCY** | Limited / projection | Limited | Awareness + handoff projection; no deep longitudinal engine |
| **OBSERVATION** | Full | Full | Focused workspace |
| **INPATIENT** | Full | Full | Primary Care Plans area |

---

## 9. Stop-condition review (pre-code)

| Condition | Status |
|-----------|--------|
| D4B.5 missing from main | **Clear** |
| Unrelated dirty tree | **Clear** |
| D4B.6 already fully present | **Clear** (absent) |
| Would require Prisma destructive migration | **Avoid** — zero-schema / adapters / registry |
| Would invent independent signature engine | **Forbidden** — reuse D4B.1 |
| Would build CM/SW/UR/Pharmacy/Nutrition/Provider workspaces | **Forbidden** — defer |
| Would auto-activate from diagnosis alone | **Forbidden** |
| Would mutate problem list / MAR / diet / O2 / vent / discharge auth | **Forbidden** |
| Catalog would be hundreds of shallow templates | **Prefer curated + deferrals** |

**Audit conclusion:** Proceed to implement D4B.6 within permitted scope with documented deferrals.

---

## 10. Absences (honest)

- No enterprise interdisciplinary care-plan domain module yet  
- No `care_plan.*` D4B.1 registry types yet  
- No durable Prisma CarePlan tables (acceptable — prefer adapters)  
- No CM/SW/UR/Pharmacy/Nutrition RoleCodes or workspaces  
- No NANDA engine  
- No auto template suggestion engine from problem list  
- Observation carePlan is placeholder; IP carePlan is D3E stub  

---

## 11. Implementation posture (post-audit)

1. Shared: `enterpriseInterdisciplinaryCarePlansD4b6.ts` + tests  
2. Registry: additive `care_plan.*` types + i18n labels  
3. API: thin projection util + identity rejection + spec  
4. Web: `EnterpriseInterdisciplinaryCarePlansD4b6.tsx` hosted in IP/Obs `carePlan` + limited ED projection  
5. i18n: dedicated en/fr feature modules mirrored into aggregates  
6. Docs: this audit + architecture (50 sections) + `MEDUI.D4B.6-certification.md`  
7. Compose D3E / EDOC.19 / RT / rehab; never fork D4B.1–5  
