# MEDUI.D4B.2 — Enterprise Nursing Clinical Workspace Audit

**Date:** 2026-07-26  
**Branch:** `d4b2-enterprise-nursing-clinical-workspace`  
**HEAD (baseline after FF origin/main):** `42c1ba206` (Merge PR #53 D4B.1)  
**Mode:** Audit first — **no implementation until this inventory is materially complete**  
**Prerequisite:** `docs/certification/MEDUI.D4B.1-certification.md` + D4B.1 shared foundation on HEAD

---

## 1. Baseline verification

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4b2-enterprise-nursing-clinical-workspace` |
| `git status --short` (audit start) | clean (after FF) |
| `git fetch origin` | ok |
| `merge-base --is-ancestor origin/main HEAD` | **0** (after FF-only merge of `origin/main`) |
| D4B.1 certification on HEAD | ✔ `docs/certification/MEDUI.D4B.1-certification.md` |
| D4B.1 architecture + audit docs | ✔ |
| D4B.1 shared modules / exports | ✔ `enterpriseClinicalDocumentFoundationD4b1` via `@medora/shared` |
| Unrelated local work | None |

**Note:** Branch was 2 commits behind `origin/main` at start; clean FF-only merge brought D4B.1. No cherry-pick / rebase / auto-merge of other work.

---

## 2. Audit methodology

1. Repository-wide search for nursing assessment / admission / reassessment / handoff / pain / fall / skin / wound / restraint / neuro / respiratory / cardiovascular / GI / GU / nutrition / elimination / I&O / devices / education / care plan / discharge nursing / EDOC / CAS / vitals / IV terms.
2. Inspection of inpatient, observation, and ED nursing workspace shells and sticky nav.
3. Inspection of D4B.1 registry + adapters for nursing-related document types.
4. Persistence map across Prisma models and encounter JSON blobs.
5. Duplicate-concept matrix (admission vs EDOC19; reassessment vs EvalV1; IV sources).
6. Classification **A–L** per D4B.2 prompt §5 (nursing-specific legend).
7. Stop-condition review (prompt §38) before coding.

---

## 3. Classification legend (D4B.2)

| Class | Meaning |
|-------|---------|
| **A** | Reuse directly through D4B.1 |
| **B** | Reuse with adapter |
| **C** | Canonical nursing source |
| **D** | Operational display only |
| **E** | Historical document |
| **F** | Duplicate clinical concept |
| **G** | Legacy compatibility |
| **H** | Missing lifecycle governance |
| **I** | Unsafe mutable signed content |
| **J** | Missing care-setting behavior |
| **K** | Deferred discipline work |
| **L** | Defect requiring D4B.2 correction |

---

## 4. Existing nursing architectures (summary)

| Architecture | Persistence | Lifecycle today | Verdict |
|--------------|-------------|-----------------|---------|
| **Med/Surg nursing admission (D4A.1 / D4A.2.5)** | `admissionSummaryJson.medSurgNursingAdmissionV1` | Section CAS draft → nurse sign → amendment | **C** + **A/B** via D4B.1 adapter |
| **ED nursing reassessment engine** | `nursingAssessment.erNursingReassessmentV1` + clinical events | Save durable; local session draft; **no** enterprise amend/void | **C** live engine + **H** |
| **Inpatient nursing assessment composer** | Hosts ED engine + handoff + team | Shell | **B** composition surface |
| **ErHandoffV1** | `nursingAssessment.erHandoffV1` | Signature fields + history append | **C** + **H** |
| **EDOC structured cards** | `EncounterClinicalDocumentationEntry` | Create≈signed; witness; soft void | **A/B** (pain/fall/skin/devices/I&O/restraint/education/care plan) |
| **EncounterNote nursing** | `EncounterNote` MEDNOTE.2 | Append-only amend/void/cosign | **A/B** reference |
| **nursingEvalV1** | `nursingAssessment.nursingEvalV1` | Soft signature; chart-cert probe | **G** + **F** |
| **NursingRapidReassessmentPanel** | **None** (fake save) | None | **H** + **L** if presented as live |
| **Adaptive ED nursing / discharge execution** | nursingAssessment keys | Operational completion | **D** / **C** ED ops |
| **MAR / vitals / census / ownership** | Operational tables / readings | N/A documentation | **D** — **DO NOT TOUCH** |
| **Inpatient care-plan shell** | Flag-gated / thin JSON | Incomplete vs EDOC19 | **H** + **F** vs EDOC19 |

**Safe D4B.2 strategy:** one nursing workspace shell with care-setting-aware section IA that **composes** existing engines and **projects** them through D4B.1 adapters — **no** second signature/version/amendment engine, **no** Prisma migration, **no** MAR/ownership redesign.

---

## 5. Complete inventory

### 5.1 Med/Surg nursing admission (D4A.1 / D4A.2.5 / D4A.2.5A)

| Field | Value |
|-------|--------|
| **Files** | `medSurgNursingAdmissionD4a1.ts`, `inpatientLifecycleNursingAdmissionD4a25.ts`, `nursingAdmissionDomainIntegrationD4a25a.ts`; web admission shell/forms/amendment/print; inpatient-operations nursing-admission APIs |
| **Clinical concept** | Comprehensive inpatient/observation nursing admission |
| **Care setting** | INPATIENT / OBSERVATION |
| **Persistence** | `admissionSummaryJson.medSurgNursingAdmissionV1`; longitudinal via `Patient.clinicalHistoryProfileJson` |
| **Lifecycle** | Draft sections → sign → amendment/correction/EIE |
| **Author/signer** | Server nurse identity at sign |
| **Validation** | Shared completion / CAS version |
| **Structured vs narrative** | Structured sections + narrative notes |
| **Print/export** | Print summary modal |
| **Interdisciplinary visibility** | Admission status flags; domain links to EDOC |
| **Duplicate risk** | **F** vs EDOC19 `nursing_admission_assessment` |
| **Class** | **C** + **A/B** |
| **Action** | **WRAP** with D4B.1; do not rebuild |

### 5.2 ED nursing reassessment (canonical live)

| Field | Value |
|-------|--------|
| **Files** | `EmergencyNursingReassessmentPanel.tsx`, `emergencyNursingReassessmentV1.ts`, embeds `ClinicalDocumentationHub` |
| **Care setting** | EMERGENCY primary; reused INPATIENT + OBSERVATION (`variant="inpatientEncounter"`) |
| **Persistence** | `erNursingReassessmentV1` + `EncounterClinicalEvent` history |
| **Lifecycle** | Durable save; **H** missing enterprise document lifecycle |
| **Class** | **C** + **H** |
| **Action** | **REUSE** panel; optional summary **WRAP**; do not replace |

### 5.3 Nursing rapid reassessment (D4A.2.7C)

| Field | Value |
|-------|--------|
| **Files** | `NursingRapidReassessmentPanel.tsx` |
| **Persistence** | None (fake save) |
| **Class** | **H** + **L** (must not ship as durable) |
| **Action** | **Hide / defer**; prefer ED engine or EDOC |

### 5.4 Inpatient nursing assessment section

| Field | Value |
|-------|--------|
| **Files** | `InpatientNursingAssessmentSection.tsx` |
| **Class** | **B** composition |
| **Action** | Extend as D4B.2 host / wrap with enterprise workspace chrome |

### 5.5 Nursing handoff (ErHandoffV1)

| Field | Value |
|-------|--------|
| **Files** | `InpatientNursingHandoffPanel.tsx`, `erHandoffV1.ts`, `EmergencyErNursingHandoffPanel.tsx` (disposition ops) |
| **Persistence** | `erHandoffV1` |
| **Lifecycle** | Soft electronic signature + history; **H** |
| **Class** | **C** + **H** (IP); disposition panel **D** |
| **Action** | **REUSE**; project via adapter; defer full enterprise amend/void |

### 5.6 EDOC nursing cards (canonical structured)

| Family | Cards / store | Class | Action |
|--------|---------------|-------|--------|
| Pain EDOC13 | pain_* | **A** | REUSE + WRAP |
| Fall EDOC14 | Morse / reassess / events | **A** | REUSE + WRAP |
| Skin/wound EDOC20 | Braden / PI / wounds | **A** | REUSE + WRAP |
| Devices EDOC17 | IV / Foley / NG / drains / airway | **A** | REUSE + WRAP |
| I&O EDOC5 | io_* | **A** | REUSE + WRAP |
| Restraint EDOC6 | safety_restraint_* | **A** | REUSE + WRAP |
| Belongings EDOC9 | inventory / transfer / return | **A** | REUSE (+ admission integration) |
| Nursing admission/care plan EDOC19 | systems, shift, care plan, handoff report | **A** + **F** vs D4A.1 / ED grid | REUSE; do not invent third engine |
| Education EDOC22 | discharge teaching | **A** | REUSE |
| Neuro / stroke / respiratory / cardiac EDOC | dedicated forms | **A** | REUSE projections |

Hub: `ClinicalDocumentationHub.tsx` — **A**.

### 5.7 EncounterNote nursing

| Field | Value |
|-------|--------|
| **Class** | **A/B** |
| **Action** | WRAP in Documentation History |

### 5.8 Legacy nursingEvalV1

| Field | Value |
|-------|--------|
| **Files** | `NursingAssessmentTab.tsx`, chart cert evaluator |
| **Class** | **G** + **F** |
| **Action** | Read-compatible; avoid new primary writes |

### 5.9 Adaptive ED nursing + discharge execution

| Field | Value |
|-------|--------|
| **Class** | **D** / **C** (ED disposition) |
| **Action** | REUSE in ED care-setting sections; defer IP redesign |

### 5.10 Team execution / `/app/nursing` worklist / MAR / vitals / census

| Field | Value |
|-------|--------|
| **Class** | **D** |
| **Action** | Link/nav only; **DO NOT TOUCH** engines |

### 5.11 Inpatient / Observation / ED workspace shells

| Setting | Route / shell | Notes |
|---------|---------------|-------|
| Inpatient | `/hospitalisation/inpatient/active/[id]/nursing` + sticky nav | Compose admission + nursing + notes + MAR ops |
| Observation | `/hospitalisation/observation/active/[id]/nursing` | Live reassessment = ED engine |
| ED | Emergency chart / active workspace | Reassessment + hub + disposition nursing |

**IA to mirror:** role-forced route + sticky section nav + compose existing engines (do not invent parallel shell).

### 5.12 D4B.1 nursing-related registry (already present)

| documentTypeId | Source | Class |
|----------------|--------|-------|
| `encounter_note.nursing` | EncounterNote | **A** |
| `edoc.structured_entry` | EDOC | **A** |
| `nursing.admission_assessment` | D4A.1 admission | **A/B** |

Adapters exist for note / EDOC / nursing admission summary.

---

## 6. Duplicate-concept matrix (constitution + F)

| Concept | Authoritative for D4B.2 | Competing | Duplicate prevented |
|---------|-------------------------|-----------|---------------------|
| Longitudinal history / allergies / home meds | `clinicalHistoryProfileJson` + admission verify | Specialty forks | ✔ no fork |
| Nursing admission | D4A.1 CAS | EDOC19 admission card | Prefer D4A.1; EDOC19 complementary structured |
| Systems / shift assessment | ED reassessment grid + EDOC19 systems/shift | nursingEvalV1 | No third engine |
| Pain / fall / skin / devices / I&O / restraint / education | EDOC families | Admission scaffolds / EvalV1 IV | Prefer EDOC |
| Narrative notes | EncounterNote | legacy erNotesV1 | G read-only |
| Care plan | EDOC19 care-plan cards | inpatientCarePlanV1 shell | Prefer EDOC19; defer multidisciplinary (D4B.6) |
| Handoff | ErHandoffV1 | EDOC19 handoff report | Prefer ErHandoffV1; EDOC optional |
| MAR / orders / assignment | Operational ownership | — | Untouched |

---

## 7. Care-setting evidence matrix (actual)

| Nursing capability | ED | Observation | Inpatient | Audit note |
|--------------------|----|-------------|-----------|------------|
| Initial / admission | Focused triage + reassessment | Transition; admission engine when IP-path | Comprehensive D4A.1 | |
| Systems assessment | ED grid + EDOC | Same shared engine | Same + EDOC19 | |
| Reassessment | Live ED engine | Same engine | Same engine | Rapid panel deferred |
| Pain / fall / skin | EDOC hub | EDOC | EDOC + admission links | |
| Neuro / resp / cardiac | EDOC + grid columns | Same | Same | Full NIHSS suite not rebuilt |
| Devices / I&O | EDOC17 / EDOC5 | Yes | Yes | |
| Restraints | EDOC6 | EDOC6 | EDOC6 | Full workflow UX may remain hub-driven |
| Care plan | Limited | EDOC19 | EDOC19 + shell | Complete interdisciplinary deferred |
| Handoff | Yes (ErHandoff + disposition) | Yes | Yes | |
| Discharge nursing | Home execution suite | Partial | Discharge planning tab | Full TOC deferred D4B.10 |
| Documentation history | Notes + EDOC list | Same | Same | D4B.1 projection |

---

## 8. ENTERPRISE DOMAIN AUDIT (constitution)

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Patient demographics | `Patient` | ✔ | — | ✔ |
| Medical / surgical / social / allergies / home meds | `clinicalHistoryProfileJson` + admission | ✔ | Workspace projection | ✔ |
| Med reconciliation | inpatientClinicalOps + admission | ✔ | — | ✔ |
| Preferred language / communication | Patient + admission | ✔ partial | — | ✔ |
| Functional / mobility | admission + EDOC14 | ✔ | Workspace section | ✔ |
| Devices / wounds / skin / fall / pain | EDOC + admission | ✔ | Workspace sections | ✔ |
| Nutrition / elimination | admission / I&O | ✔ partial | Deferred dedicated cards | ✔ |
| Belongings / cash | EDOC9 + admission | ✔ | — | ✔ |
| Advance directives / code status | packets / ops | ✔ | — | ✔ |
| Care team / timeline / audit | assignees / events / AuditLog | ✔ | — | ✔ |
| Draft / signature frameworks | D4B.1 + existing engines | ✔ | Nursing workspace consumes | ✔ |

---

## 9. Stop-condition review (§38)

| Condition | Result |
|-----------|--------|
| D4B.1 certification missing | **No** |
| Unrelated work present | **No** |
| Signed nursing docs silently overwritten | **No** Class I on note/EDOC/admission |
| Client-controlled signer identity | **No** on durable APIs |
| Destructive migration required | **No** |
| Historical authorship cannot be preserved | **No** |
| Patient/encounter reassignment required | **No** |
| Multiple sources cannot be adapted | **No** — adapters feasible |
| Exceeds D4B.2 scope | Avoided via compose + defer |
| Ownership / MAR redesign needed | **No** |
| Patient-safety defect cannot be corrected narrowly | Rapid reassessment fake-save → hide/defer (**L** addressed without rewrite) |
| Cross-facility / cross-encounter access | Existing services remain scoped |

**Gate:** Proceed to smallest coherent nursing workspace implementation (IA + care-setting governance + nursing document registry + D4B.1-integrated UI composing existing engines + tests + architecture/cert docs).

---

## 10. Recommended D4B.2 implementation (post-audit)

1. Shared nursing workspace IA sections + care-setting visibility matrix.
2. Smallest coherent nursing document-type registry mapping to existing stores (admission, reassessment projection, EDOC families, handoff, notes, care-plan update, discharge nursing where present).
3. Projection helpers using D4B.1 adapters (no new lifecycle engine).
4. Web enterprise nursing workspace shell with section nav, empty/loading states, D4B.1 status/completeness primitives, composing:
   - Admission (existing shell)
   - Reassessment (`EmergencyNursingReassessmentPanel`)
   - Handoff (`InpatientNursingHandoffPanel`)
   - EDOC hub projections for pain/fall/skin/devices/I&O/restraint/education/neuro/respiratory
   - Notes / documentation history via EncounterNote + EDOC adapters
5. Wire into inpatient nursing assessment host (and care-setting-aware entry for observation/ED where safe).
6. Thin API util for workspace summary projection (optional; no unrestricted mutation).
7. Characterization tests + FR/EN i18n.
8. Architecture doc (36 sections) + certification.
9. **Explicit deferrals:** full systems form invention, complete restraint UX beyond EDOC6, complete multidisciplinary care plan, rapid reassessment persistence, nutrition/elimination dedicated cards, D4B.3+ discipline workspaces, Prisma ClinicalDocument table.

---

## 11. Deferred (explicit)

- NursingRapidReassessment durable engine
- Unified server draft for all nursing JSON blobs
- Full multidisciplinary care plan (D4B.6)
- Provider H&P / discharge TOC (D4B.8–D4B.10)
- Technician / NA workspace (D4B.3)
- Dedicated nutrition / elimination foundation cards
- Destructive normalization of nursingEvalV1 / dual IV sources
- New PDF engine
- MAR / ownership / census / staffing / auth redesign

---

## 12. Audit completion statement

This inventory is **materially complete** for D4B.2 nursing workspace design. Implementation may begin under the hard scope boundary in the phase prompt (compose + adapt; CERTIFIED WITH DOCUMENTED DEFERRALS expected if full systems/restraints/care-plan depth cannot be completed in one pass).
