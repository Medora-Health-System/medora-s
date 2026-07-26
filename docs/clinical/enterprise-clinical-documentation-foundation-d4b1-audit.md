# MEDUI.D4B.1 — Enterprise Clinical Documentation Foundation Audit

**Date:** 2026-07-26  
**Branch:** `d4b1-enterprise-clinical-documentation-foundation`  
**HEAD (baseline):** `bea706fab` (origin/main = main = Merge PR #52 D4A.4.4)  
**Mode:** Audit first — **no implementation until this inventory is materially complete**  
**Prerequisite:** `docs/certification/MEDUI.D4A.4.4-certification.md` present on HEAD and `origin/main`

---

## 1. Baseline verification

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4b1-enterprise-clinical-documentation-foundation` |
| `git status --short` (audit start) | clean |
| `git fetch origin` | ok |
| `merge-base --is-ancestor origin/main HEAD` | **0** |
| D4A.4.4 certification on HEAD | ✔ `docs/certification/MEDUI.D4A.4.4-certification.md` |
| D4A.4.4 certification on `origin/main` | ✔ |
| Working tree at audit start | clean |

---

## 2. Audit methodology

1. Ripgrep across `apps/`, `packages/`, `docs/` for clinical-document terms (draft, signed, signature, cosign, addendum, amendment, correction, late entry, H&P, progress note, EDOC, nursing admission, provider documentation, EncounterNote, print/export, template, Zod).
2. Prisma model inspection: `EncounterNote`, `EncounterClinicalDocumentationEntry`, `EncounterProviderAddendum`, `Encounter` providerDocumentation*, `EnterpriseDocument` / signatures, `EncounterClinicalEvent`, `AuditLog`, `Patient.clinicalHistoryProfileJson`.
3. API / service / controller inspection for create / sign / amend / void / witness / export paths.
4. Shared package + web editor / legal-chart / timeline surfaces.
5. Classification **A–L** per finding (prompt §5).
6. Enterprise constitution domain matrix (patient vs encounter ownership; duplicate prevention).
7. Stop-condition review (prompt §27) before any code.

---

## 3. Classification legend

| Class | Meaning |
|-------|---------|
| **A** | Reusable enterprise foundation |
| **B** | Reusable with adapter |
| **C** | Discipline-specific implementation |
| **D** | Historical authorship |
| **E** | Operational workflow, not documentation |
| **F** | Print or export projection |
| **G** | Legacy compatibility |
| **H** | Incomplete lifecycle implementation |
| **I** | Unsafe mutable signed-document behavior |
| **J** | Duplicate or competing document architecture |
| **K** | Future discipline-phase work |
| **L** | Defect requiring correction in D4B.1 |

---

## 4. Competing documentation architectures (summary)

| Architecture | Persistence | Lifecycle today | Verdict |
|--------------|-------------|-----------------|---------|
| **EncounterNote (MEDNOTE.1/2)** | Prisma `EncounterNote` | Create (immutable row) → amend (new row + lineage) → cosign → void (soft) | **Primary adapter target / reference** |
| **EDOC structured cards** | `EncounterClinicalDocumentationEntry` | Create = durable legal entry; witness optional; void soft | **Adapter** (no draft edit cycle) |
| **Provider documentation shell** | `Encounter.providerDocumentationStatus` DRAFT\|SIGNED + JSON body + `EncounterProviderAddendum` | Sign / unlock / addenda | **Adapter** (encounter-scoped shell; unlock is controlled reopen) |
| **Med/Surg nursing admission** | `admissionSummaryJson.medSurgNursingAdmissionV1` CAS | Draft sections → sign → amendments | **Adapter** (discipline admission engine; do not rebuild) |
| **Inpatient clinical ops** | `admissionSummaryJson.inpatientClinicalOpsV1` | Code status / med recon lines / care team history | **Partial** ops-clinical hybrid — not a note engine |
| **Patient longitudinal history** | `Patient.clinicalHistoryProfileJson` | Reconcile from triage; allergy PATCH | **Constitution domain store** (not a signed note) |
| **EnterpriseDocument packets** | `EnterpriseDocument` + signatures/blobs | File/packet legal docs | **Adjacent** — registration/packets, not clinical note lifecycle |
| **Legacy erNotesV1** | `Encounter.nursingAssessment` blob | Read-only display merge | **G** legacy read path |
| **Provider localStorage drafts** | Browser `providerDocumentationDraftStorage` | Client recovery only | **H** — not enterprise draft engine |
| **Inpatient H&P / progress / care plan / discharge planning V1** | Shared JSON contracts + ops APIs | Partial specialty workspaces | **K** — D4B.8–D4B.10 |

**Safe D4B.1 strategy:** define one canonical **enterprise clinical document contract** + lifecycle + authorship rules in `@medora/shared`, adapt existing stores (prefer EncounterNote as reference), **no Prisma migration**, no new parallel note table, no discipline dashboards.

---

## 5. Complete inventory (implementations)

### 5.1 EncounterNote (MEDNOTE)

| Field | Value |
|-------|--------|
| **File / symbols** | `apps/api/prisma/schema.prisma` `EncounterNote`; `apps/api/src/encounters/encounter-notes.service.ts`; `encounters.controller.ts` notes routes; `packages/shared/src/encounters/encounterNote*.ts`; `apps/web/src/lib/encounterNotesApi.ts`; `EmergencyErNotesPanel.tsx` |
| **Discipline** | PROVIDER / NURSING / TECHNICIAN / OTHER |
| **Care setting** | Encounter-scoped (ED primary UI; model is facility+encounter generic) |
| **Document type** | Encounter narrative note |
| **Persistence** | Relational row; append-only create |
| **Lifecycle** | Created (effectively signed-on-create narrative) → amendment child → cosign optional → void soft |
| **Author source** | Server `authorUserId` + display/role snapshots |
| **Signature source** | Author identity at create; cosign separate |
| **Amendment** | New note + `amendedFromNoteId` + reason; original preserved |
| **Structured vs narrative** | Narrative `body` |
| **Validation** | Zod create/amend/void DTOs |
| **Print/export** | `mapEncounterNoteForLegalChart` in chart-export / chart-summary |
| **Audit** | `AuditAction` on create/amend/void/cosign; PHI-safe metadata allowlist |
| **Legal** | Soft void; lineage retained; legacy blob merge marked |
| **Class** | **A / B** |
| **Risk** | Note types lack full care-setting/discipline registry; no explicit DRAFT state (create is durable) |
| **Action** | **Reuse as D4B.1 reference adapter** — map to enterprise lifecycle (SIGNED / COSIGN_REQUIRED / AMENDED / ENTERED_IN_ERROR) |

### 5.2 EDOC (`EncounterClinicalDocumentationEntry`)

| Field | Value |
|-------|--------|
| **File / symbols** | Prisma model; `clinical-documentation.service.ts`; `packages/shared/src/clinicalDocumentation/*`; web `features/clinical-documentation/*` |
| **Discipline** | Nursing-heavy registry; multi-card |
| **Care setting** | Encounter-scoped |
| **Document type** | Structured assessment cards (pain, fall, skin/wound, belongings, devices, …) |
| **Persistence** | JSON payload + category/cardId; append-only |
| **Lifecycle** | Create → optional witness → void; **no draft edit** |
| **Author / witness** | Snapshots at create / witness |
| **Amendment** | Not in-row; new entry or void |
| **Structured vs narrative** | Versioned payloads per card |
| **Validation** | Shared payload validators + registry |
| **Print/export** | Legal chart EDOC projection |
| **Audit** | Create/witness/void audits |
| **Class** | **A / B** |
| **Risk** | Nutrition/elimination claimed by admission without dedicated foundation cards |
| **Action** | Adapter into enterprise contract; **do not fork** wound/skin/fall/pain/belongings |

### 5.3 Provider documentation shell

| Field | Value |
|-------|--------|
| **File / symbols** | `Encounter.providerDocumentationStatus`, `providerDocumentationSignedAt/By`; sign/unlock controller routes; extensive `apps/web/src/lib/providerDocumentation*`; addenda `EncounterProviderAddendum` |
| **Discipline** | Provider |
| **Care setting** | ED-centric shell; inpatient provider workspace separate JSON |
| **Lifecycle** | DRAFT → SIGNED; unlock reopens under policy; addenda append |
| **Author / signer** | SignedBy user id; operational assignment ≠ authorship (D4A.4) |
| **Class** | **B / H** |
| **Risk** | Unlock can return to editable state — must remain explicit legal reopen, not silent overwrite of history; addenda preserve prior signed snapshot via export rules |
| **Action** | Adapter; document unlock as controlled transition; **do not rebuild H&P suite (K)** |

### 5.4 Nursing admission (Med/Surg D4A.1 / D4A.2.5)

| Field | Value |
|-------|--------|
| **File / symbols** | `medSurgNursingAdmissionD4a1.ts`, `inpatientLifecycleNursingAdmissionD4a25.ts`, inpatient-operations nursing-admission APIs, amendment dialog |
| **Discipline** | Nursing |
| **Care setting** | Inpatient |
| **Lifecycle** | Section CAS drafts → nurse sign → amendment / correction / entered-in-error |
| **Class** | **B / C** |
| **Risk** | Dual belongings/cash with EDOC9 if integration drift |
| **Action** | Adapter only; **do not reimplement admission in D4B.1** |

### 5.5 Patient clinical history profile

| Field | Value |
|-------|--------|
| **File / symbols** | `Patient.clinicalHistoryProfileJson`; `patientClinicalHistoryProfile.ts`; patient clinical-history APIs; chart block |
| **Discipline** | Cross-cutting longitudinal |
| **Lifecycle** | Reconcile / PATCH allergies — not signed clinical document |
| **Class** | **A** (constitution store) |
| **Action** | Reuse; never duplicate for specialty engines |

### 5.6 Inpatient clinical ops (code status / med recon)

| Field | Value |
|-------|--------|
| **File / symbols** | `inpatientClinicalOpsV1.ts`; inpatient-operations clinical-ops |
| **Class** | **B / E** hybrid |
| **Action** | Keep as ops foundation; not the enterprise note contract |

### 5.7 Timeline / audit

| Field | Value |
|-------|--------|
| **File / symbols** | `EncounterClinicalEvent`; `UnifiedEncounterTimelineService`; `AuditLog` / `AuditService` |
| **Class** | **A** |
| **Action** | Reuse for legal events; foundation emits audit contracts without logging PHI bodies |

### 5.8 EnterpriseDocument (packets / e-sign files)

| Field | Value |
|-------|--------|
| **Class** | **F / adjacent** |
| **Action** | Out of clinical-note foundation scope; keep separate |

### 5.9 Legacy erNotesV1

| Field | Value |
|-------|--------|
| **Class** | **G** |
| **Action** | Read-only merge; no new writes |

### 5.10 Client-only provider drafts

| Field | Value |
|-------|--------|
| **Class** | **H** |
| **Action** | Defer unified draft engine; document as compatibility limitation |

### 5.11 Inpatient H&P / progress / care plan / discharge (shared V1)

| Field | Value |
|-------|--------|
| **Class** | **K** |
| **Action** | Defer to D4B.8–D4B.10 |

### 5.12 Operational ownership (D4A.4)

| Field | Value |
|-------|--------|
| **Class** | **E** |
| **Action** | **Do not redesign**; authorship must remain independent of assignment |

---

## 6. ENTERPRISE DOMAIN AUDIT (constitution)

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Patient demographics | `Patient` | ✔ | — | ✔ |
| Medical history | `clinicalHistoryProfileJson` | ✔ | — | ✔ |
| Surgical history | same + surgical catalog | ✔ | — | ✔ |
| Allergies | profile + enterpriseAllergyRecord | ✔ | — | ✔ |
| Home medications | profile + admission lines | ✔ | — | ✔ |
| Med reconciliation | inpatientClinicalOpsV1 + admission | ✔ | — | ✔ |
| Social history | profile | ✔ | — | ✔ |
| Family history | ER triage only (not longitudinal) | ✖ store | Deferred | ✔ (no fork yet) |
| Preferred language | `Patient.language` + admission | ✔ | — | ✔ |
| Communication needs | admission / EDOC19 | ✔ partial | Deferred | ✔ |
| Functional / mobility | admission + EDOC19 | ✔ partial | Deferred | ✔ |
| Existing devices | admission + EDOC17 | ✔ | — | ✔ |
| Existing wounds | admission POA | ✔ | — | ✔ |
| Wound documentation | EDOC20 | ✔ | — | ✔ |
| Skin documentation | EDOC20 | ✔ | — | ✔ |
| Fall risk | EDOC14 Morse | ✔ | — | ✔ |
| Pain assessment | EDOC13 | ✔ | — | ✔ |
| Nutrition screening | admission NUTRITION | ✔ partial | Deferred | ✔ |
| Elimination | admission + I&O | ✔ partial | Deferred | ✔ |
| Belongings | EDOC9 + admission | ✔ | — | ✔ |
| Cash / valuables | EDOC9 + cash counts | ✔ | — | ✔ |
| Advance directives | packets + review flags | ✔ partial | Deferred | ✔ |
| Code status | inpatientClinicalOpsV1 | ✔ | — | ✔ |
| Care team identity | assignees + careTeamHistory | ✔ | — | ✔ |
| Clinical timeline | EncounterClinicalEvent | ✔ | — | ✔ |
| Clinical audit | AuditLog | ✔ | — | ✔ |
| Draft framework | admission CAS + localStorage + note create | ✔ partial | Adapter unify | ✔ |
| Signature framework | notes / EDOC witness / provider / nursing / files | ✔ | Adapter unify | ✔ |

---

## 7. Stop-condition review (§27)

| Condition | Result |
|-----------|--------|
| D4A.4.4 absent | **No** — present |
| Incompatible persistence cannot adapt | **No** — adapters feasible |
| Signed docs silently overwritten/deleted | **No Class L** for EncounterNote/EDOC (append + soft void). Provider unlock is explicit controlled reopen — document, do not expand in D4B.1 |
| Destructive migration required | **No** |
| Historical authorship cannot be preserved | **No** — snapshots exist |
| Access not facility/encounter scoped | **No** — services scope by facilityId |
| Client-controlled signature identity | **No** — server userId |
| Destructive conversion required | **No** |
| Exceeds foundation boundary | Avoided by adapter-only scope |
| Unrelated work on branch | Clean at audit start |

**Gate:** Proceed to smallest safe foundation implementation (adapters + shared contract + reference on EncounterNote + UI primitives + tests + architecture/cert docs).

---

## 8. Recommended D4B.1 implementation (post-audit)

1. Shared canonical contract + lifecycle state machine + authorship invariants.
2. Document-type registry (care setting + discipline governance) — starter set only.
3. Adapters: EncounterNote (reference), EDOC entry, provider shell status, nursing admission signature summary.
4. Legal-record render projection builder (shared).
5. Validation vs completeness separation helpers.
6. Narrow frontend primitives (status, signature meta, banners, completeness, validation list) + FR/EN i18n.
7. Characterization / unit tests for lifecycle, authorship, adapters, rendering.
8. **No Prisma migration.** No MAR/ownership/auth redesign. No discipline dashboards. No H&P suite.

---

## 9. Deferred (explicit)

- Full draft engine unification (localStorage → server)
- Family history longitudinal promotion
- Dedicated nutrition / elimination EDOC foundation cards
- Patient longitudinal advance-directive clinical store
- Full interdisciplinary care plan / all discipline workspaces (D4B.2–D4B.10)
- New PDF engine
- Prisma `ClinicalDocument` table

---

## 10. Audit completion statement

This inventory is **materially complete** for D4B.1 foundation design. Implementation may begin under the hard scope boundary in the phase prompt.
