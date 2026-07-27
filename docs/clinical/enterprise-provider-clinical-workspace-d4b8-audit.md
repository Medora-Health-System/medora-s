# MEDUI.D4B.8 — Enterprise Provider Clinical Workspace Audit

**Date:** 2026-07-26  
**Branch:** `d4b8-enterprise-provider-clinical-workspace`  
**HEAD (baseline):** `ee9b8e79b` (Merge PR #59 D4B.7)  
**Mode:** Audit complete — implementation revised under **repository-aware v2 composition rules**  
**Prerequisites:** `docs/certification/MEDUI.D4B.1|2|3|4|5|6|7-certification.md` on HEAD / `origin/main`

> **v2 revision note:** Prior D4B.8 draft/finalize helpers were classified as **Z (duplicate provider-note engine)** and removed. Durable authorship remains ProviderDocumentationWorkspace + EncounterNote + D4A.26; D4B.8 is registry + projection + host composition only.

---

## 1. Baseline verification

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4b8-enterprise-provider-clinical-workspace` |
| `git status --short` (audit start) | clean |
| `git fetch origin` | ok |
| `git rev-parse HEAD` | `ee9b8e79ba5e0f887b6c4c5ea20ffd2b3c13d079` |
| `git rev-parse origin/main` | `ee9b8e79ba5e0f887b6c4c5ea20ffd2b3c13d079` |
| `merge-base --is-ancestor origin/main HEAD` | **0** |
| `rev-list --left-right --count origin/main...HEAD` | **0 0** |
| D4B.1–D4B.7 certifications on HEAD | ✔ |
| D4B.7 shared / registry / API util / Obs+IP+ED hosts | ✔ |
| PR #59 / `80ad5a946` ancestor of HEAD | ✔ |
| Prior D4B.8 implementation | **Absent** |
| Unrelated local work | None |

D4B.7 is present on `origin/main` via PR #59. Safe to proceed.

---

## 2. Audit methodology

1. Repository-wide search for provider workspace / census / rounding / H&P / progress / consult / A&P / MDM / attestation / co-sign / handoff / diagnosis / problem list / order / MAR / result terms.
2. Inspection of D4B.1 lifecycle/registry/authorship/signature, D4B.2–7 shells and projections, ED provider documentation (`providerDocumentation*`, `EmergencyErNotesPanel`), inpatient provider workspace (`InpatientProviderWorkspacePanel`, `providerClinicalSynthesisD4a26a`, `inpatientProviderWorkspaceD4a26`), observation provider notes host, hospital census, diagnosis/order/MAR engines.
3. Classification **A–AB** per D4B.8 legend below.
4. Stop-condition review before coding (no final discharge engine, discharge summaries, procedure/operative/anesthesia notes, med rec, discharge Rx, billing/CDI/E/M coding, ambient AI, autonomous diagnoses/orders; no Prisma RoleCode invention; no destructive migration; preserve ED provider workflow).

---

## 3. Classification legend (D4B.8)

| Class | Meaning |
|-------|---------|
| **A** | Reusable provider-documentation architecture |
| **B** | Reusable H&P architecture |
| **C** | Reusable progress-note architecture |
| **D** | Reusable consult-note architecture |
| **E** | Reusable assessment-and-plan architecture |
| **F** | Reusable MDM architecture |
| **G** | Reusable signature/attestation architecture |
| **H** | Reusable provider-assignment architecture |
| **I** | Reusable provider-census architecture |
| **J** | Reusable provider-timeline architecture |
| **K** | Reusable diagnosis architecture |
| **L** | Reusable problem-list architecture |
| **M** | Reusable order projection |
| **N** | Reusable medication/MAR projection |
| **O** | Reusable result projection |
| **P** | D4B.2 nursing projection |
| **Q** | D4B.3 technician projection |
| **R** | D4B.4 respiratory projection |
| **S** | D4B.5 rehabilitation projection |
| **T** | D4B.6 care-plan projection |
| **U** | D4B.7 coordination projection |
| **V** | ED compatibility |
| **W** | Observation compatibility |
| **X** | Inpatient compatibility |
| **Y** | Legacy compatibility |
| **Z** | Duplicate provider-note concept |
| **AA** | Deferred future phase |
| **AB** | Defect requiring narrow D4B.8 correction |

---

## 4. Existing provider-documentation architectures (summary)

| Architecture | Persistence | Lifecycle today | Verdict |
|--------------|-------------|-----------------|---------|
| **D4B.1 foundation** | Contract + registry + authorship + signature + amendment/EIE | DRAFT→SIGNED→AMEND/EIE | **A** + **G** — **must reuse**; no independent provider signature engine |
| **`provider.documentation_shell` / `encounter_note.provider`** | D4B.1 registry | Shell / MEDNOTE.2 | **A** — EXTEND with curated `provider.*` types |
| **ED provider documentation workspace** | Encounter note / complaint intel / templates | ED-signed status | **V** + **A** — **compatibility only**; do not redesign ED physician notes |
| **`EmergencyErNotesPanel` / MEDNOTE** | Encounter notes | Draft/signed | **V** + **Y** — preserve as ED path |
| **D4A.2.6A `providerClinicalSynthesisD4a26a`** | Projection contracts (vitals, labs, meds, census filters, print packages) | Synthesis projection | **A/E/F/I/M/N/O** — REUSE as projections; do not claim POE/MAR/diagnosis ownership |
| **D4A.2.6 `inpatientProviderWorkspaceD4a26` + `InpatientProviderWorkspacePanel`** | Ops / UI for overview, H&P, progress, problems/plan | IP provider UI | **X** + **B/C/E** — HOST D4B.8 beside; do not delete legacy panel |
| **Observation `providerNotes`** | Hosts `EmergencyErNotesPanel` | Docs flag | **W** — host D4B.8 shell + keep ED notes panel for continuity |
| **Hospital census / provider census facets** | `hospitalCensusV1`, `clinicalSynthesisServiceD4a26b` facets | List projection | **I** — bound provider census adapter on these projections |
| **Diagnosis / problem list engines** | Existing encounter diagnosis / problem APIs | Authoritative elsewhere | **K** + **L** — view/link only; never silent mutate |
| **Order engine / POE** | Existing orders services | Authoritative elsewhere | **M** — project + deep-link only |
| **MAR / meds** | MAR tab + medication orders | Authoritative elsewhere | **N** — project only; ≠ recon / ≠ admin |
| **Results (lab/imaging)** | Results panels | Authoritative elsewhere | **O** — inclusion ≠ acknowledgment |
| **D4B.2–D4B.7 workspaces** | Shared modules + shells | Discipline authorship | **P–U** — project without overwrite |
| **Consult catalog / consult orders** | Procedure/order catalog | Order ≠ note | **D** + **M** — consult note ≠ consult order |
| **Attestation / co-sign primitives (D4B.1)** | Authorship bundle + UI primitives | Attester/cosigner snapshots | **G** — reuse; attestation ≠ authorship |
| **Discharge summary / procedure notes** | Absent as enterprise governed types (correct) | — | **AA** — D4B.9+ / discharge phase |
| **Billing / E/M / CDI / ambient AI** | Absent (correct) | — | **AA** |
| **Governed Obs/IP enterprise provider workspace on D4B.1** | **Absent** | — | **A** — target of this phase (curated) |

**Safe D4B.8 strategy:** one enterprise provider clinical workspace on D4B.1 lifecycle; curated note types (H&P, initial hospital assessment, progress, consult ± follow-up/cross-cover/event); structured A&P and MDM without E/M coding; bounded census; Obs+IP full patient workspace; ED limited projection/compatibility; project D4B.2–7 + orders/meds/MAR/results/diagnoses without overwrite; hard authority boundaries (note ≠ order ≠ diagnosis mutation ≠ MAR ≠ discharge auth ≠ procedure note ≠ discharge summary; assignment ≠ authorization; attestation ≠ authorship; finalized notes not silently mutated; reject client-controlled identity); prefer **CERTIFIED WITH DOCUMENTED DEFERRALS**.

---

## 5. Complete inventory (selected findings)

### 5.1 D4B.1 lifecycle, authorship, signature, amendment, EIE

| Field | Value |
|-------|--------|
| **Files** | `enterpriseClinicalDocumentContractD4b1.ts`, `enterpriseClinicalDocumentAuthorshipD4b1.ts`, lifecycle/adapters, `EnterpriseClinicalDocumentPrimitivesD4b1.tsx` |
| **Author / signer / cosigner / attester** | Actor snapshots; `assertSignerIsAuthenticatedUser`; `cosignPreservesOriginalAuthor`; assignment does not rewrite authorship |
| **Class** | **A** + **G** |
| **Action** | Reuse for all D4B.8 note finalize / attest / co-sign / amend / correct / EIE |

### 5.2 Document registry provider types

| Field | Value |
|-------|--------|
| **Files** | `enterpriseClinicalDocumentRegistryD4b1.ts` |
| **Existing** | `encounter_note.provider`, `provider.documentation_shell` |
| **Missing** | `provider.history_and_physical`, `provider.initial_hospital_assessment`, `provider.progress_note`, `provider.consult_note`, etc. |
| **Class** | **A** |
| **Action** | Additive REFERENCE_VIRTUAL / PROVIDER_DOCUMENTATION_SHELL types; templateVersion `D4B.8` |

### 5.3 ED provider documentation (compatibility)

| Field | Value |
|-------|--------|
| **Files** | `apps/web/src/lib/providerDocumentation*`, `EmergencyErNotesPanel`, complaint intel i18n, ED lifecycle `providerDocumentationStatus` |
| **Care setting** | EMERGENCY |
| **Class** | **V** + **Y** + **Z** (risk if forked) |
| **Action** | Do **not** redesign. ED host shows limited D4B.8 projection banner + optional review sections only. |

### 5.4 Inpatient provider workspace (D4A)

| Field | Value |
|-------|--------|
| **Files** | `InpatientProviderWorkspacePanel.tsx`, `inpatientProviderWorkspaceD4a26.ts`, `providerClinicalSynthesisD4a26a.ts` |
| **Modes** | overview, problemsPlan, historyPhysical, progressNotes |
| **Class** | **X** + **B/C/E/F/I** |
| **Action** | Preserve panel; host D4B.8 enterprise shell in same nav sections as governed layer |

### 5.5 Observation provider notes

| Field | Value |
|-------|--------|
| **Files** | `ObservationWorkspacePanel.tsx` `providerNotes` → `EmergencyErNotesPanel` |
| **Class** | **W** + **Y** |
| **Action** | Host D4B.8 shell above continuity notes panel |

### 5.6 Provider census / rounding

| Field | Value |
|-------|--------|
| **Files** | `hospitalCensusV1`, `filterProviderCensusRows` / `sortProviderCensusRows`, `PROVIDER_CENSUS_FACETS` |
| **Class** | **I** |
| **Action** | Bounded D4B.8 census projection (no per-cell N+1; no full note narratives; no full SW narrative) |

### 5.7 Diagnosis / problem list

| Field | Value |
|-------|--------|
| **Files** | Encounter diagnosis / problem-list services and IP problemsPlan mode |
| **Class** | **K** + **L** |
| **Action** | Reference-only linkage from note A&P; `mutatesDiagnosis/ProblemList: false` |

### 5.8 Orders / medications / MAR / results

| Field | Value |
|-------|--------|
| **Files** | Emergency/IP orders panels, MAR tab, results panels, synthesis projections |
| **Class** | **M** + **N** + **O** |
| **Action** | Project only; note inclusion ≠ order create / ≠ MAR admin / ≠ result ack |

### 5.9 D4B.2–D4B.7 projections

| Domain | Class | Action |
|--------|-------|--------|
| Nursing D4B.2 | **P** | Project summaries |
| Technician D4B.3 | **Q** | Project tasks |
| RT D4B.4 | **R** | Project recommendations |
| Rehab D4B.5 | **S** | Project goals/recs |
| Care plans D4B.6 | **T** | Review only — never rewrite |
| CM/SW/UR D4B.7 | **U** | Review only — never rewrite; SW minimized |

### 5.10 Deferred / out of scope

| Item | Class |
|------|-------|
| Discharge summary finalization | **AA** |
| Procedure / operative / anesthesia notes | **AA** (D4B.9) |
| Medication reconciliation / discharge Rx | **AA** |
| Billing / claims / CDI / auto E/M | **AA** |
| Ambient AI / autonomous diagnosis or orders | **AA** |
| Durable Prisma provider-note tables / new RoleCodes | **AA** (zero-schema adapters preferred) |
| ED physician note redesign | **AA** / **V** |

---

## 6. Authority-boundary conclusions (pre-code)

| Boundary | Conclusion |
|----------|------------|
| Note text / A&P → orders | **Forbidden** — launch authoritative POE only |
| Note → diagnosis / problem list mutation | **Forbidden** — reference/link only |
| Diagnosis refs → billing | **Forbidden** |
| Medication projection → recon / MAR admin | **Forbidden** |
| Result inclusion → acknowledgment | **Forbidden** |
| Consult recs → orders | **Forbidden** |
| Care-plan review → D4B.6 rewrite | **Forbidden** |
| CM/SW/UR review → D4B.7 rewrite | **Forbidden** |
| Discharge readiness → discharge auth | **Forbidden** |
| Progress note → discharge summary | **Forbidden** |
| H&P → procedure/operative | **Forbidden** |
| Assignment → authorization | **Forbidden** |
| Attestation → original authorship | **Forbidden** |
| Silent mutation of finalized notes | **Forbidden** |
| Client-controlled author/signer/attester/cosigner/performer/supervisor | **Rejected** |

---

## 7. Recommended D4B.8 file layout

| Layer | Path |
|-------|------|
| Shared | `packages/shared/src/clinicalDocumentation/enterpriseProviderClinicalWorkspaceD4b8.ts` (+ `.test.ts`) |
| Registry | Additive entries in `enterpriseClinicalDocumentRegistryD4b1.ts` |
| Export | `packages/shared/src/index.ts` |
| API | `apps/api/src/encounters/enterprise-provider-clinical-workspace.util.ts` (+ `.spec.ts`) |
| Web shell | `apps/web/src/features/clinical-documentation/EnterpriseProviderClinicalWorkspaceD4b8.tsx` (+ test) |
| i18n | `enterpriseProviderClinicalWorkspaceD4b8.en.ts` / `.fr.ts` + wire `en.ts`/`fr.ts`; D4B.1 document type labels |
| Hosts | `InpatientWorkspacePanel`, `ObservationWorkspacePanel`, limited `EmergencyActiveWorkspaceView` |
| Docs | this audit; architecture; `docs/certification/MEDUI.D4B.8-certification.md` |

---

## 8. Stop conditions before coding

- [x] Baseline passes (D4B.7 on main, clean tree, HEAD==origin/main)
- [x] Audit materially complete
- [x] No D4B.8 files already present
- [x] Reuse path identified (D4B.1 + D4A synthesis + existing IP/Obs/ED hosts)
- [x] Hard boundaries encoded as planned invariants
- [x] Zero-schema adapter preferred; no destructive migration planned

**Audit status: COMPLETE — implementation may proceed.**
