# MEDUI.D4B.1 — Enterprise Clinical Documentation Foundation

**Date:** 2026-07-26  
**Branch:** `d4b1-enterprise-clinical-documentation-foundation`  
**Certification id:** `MEDUI.ENTERPRISE_CLINICAL_DOCUMENTATION_FOUNDATION.D4B1`  
**Prerequisite:** D4A.4 closed (`MEDUI.D4A.4.4`)  
**Mode:** Foundation only — adapters preferred; **no Prisma migration**

---

## 1. Purpose

Establish one governed enterprise clinical-document architecture so Nursing, technicians, RT, PT/OT/SLP, case management, social work, UR, and Providers can later attach discipline workspaces **without forking** history, draft, signature, timeline, or legal-record engines.

---

## 2. Existing-state summary

Multiple documentation architectures already exist and are clinically useful:

| Store | Role |
|-------|------|
| `EncounterNote` (MEDNOTE) | Append-only narrative notes + amend/cosign/void |
| EDOC `EncounterClinicalDocumentationEntry` | Structured assessment cards + witness |
| Provider documentation shell | Encounter DRAFT/SIGNED + addenda |
| Med/Surg nursing admission | CAS draft → sign → amendments |
| `Patient.clinicalHistoryProfileJson` | Longitudinal constitution domains |
| `EncounterClinicalEvent` + `AuditLog` | Timeline / audit |

D4B.1 does **not** replace these with a new table. It defines a **canonical contract** and **adapters**.

---

## 3. Audit findings

See `docs/clinical/enterprise-clinical-documentation-foundation-d4b1-audit.md`.

Headline: competing architectures are **adaptable**; EncounterNote is the safest **reference lifecycle**; no Class L silent overwrite found on note/EDOC paths; provider unlock is controlled reopen (documented limitation).

---

## 4. Competing documentation architectures

Classified in the audit (A–L). Strategy: **B — reusable with adapter** for note/EDOC/provider shell/nursing admission; **K** for full discipline suites; **G** for legacy erNotesV1.

---

## 5. Canonical document contract

Shared type `EnterpriseClinicalDocument` (`enterpriseClinicalDocumentContractD4b1.ts`) covers:

1. Document identity · 2. Patient · 3. Encounter · 4. Episode · 5. Facility  
6. Care setting · 7. Discipline · 8. Document type · 9. Template version  
10–12. Author / signer / cosigner (distinct from D4A.4 assignment)  
13–17. Created / service / edited / signed / amended times  
18. Lifecycle state · 19. Structured content · 20. Narrative  
21. Validation · 22. Completeness · 23. Lineage · 24–25. Legal visibility / print eligibility

Contract version: `D4B.1`.

---

## 6. Lifecycle state machine

States: DRAFT, IN_PROGRESS, READY_FOR_SIGNATURE, SIGNED, COSIGN_REQUIRED, COSIGNED, AMENDED, CORRECTED, ENTERED_IN_ERROR, VOIDED.

Module: `enterpriseClinicalDocumentLifecycleD4b1.ts`.

- Unsigned drafts editable (when store supports drafts).  
- Signed content not silently overwritten — amendments/addenda create history.  
- ENTERED_IN_ERROR / VOIDED terminal; soft void only.  
- EncounterNote create maps to **SIGNED** (durable on create).

---

## 7. Authorship and signature model

`enterpriseClinicalDocumentAuthorshipD4b1.ts`:

- Separates creator / author / editor / signer / cosigner / attester / performer / verifier / **currentAssignedClinician**.  
- Reassignment does not rewrite authorship.  
- Signer must equal authenticated user (server-side).  
- Signature timestamps are server-authoritative on API paths.

---

## 8. Co-signature and attestation

- EncounterNote `requiresCosign` / `cosignedAt` → COSIGN_REQUIRED / COSIGNED.  
- EDOC witness → cosigner snapshot.  
- Attestation modeled as explicit legal event in later phases; foundation preserves actor slots.

---

## 9. Addendum, amendment, and correction

- Amendment: new durable version + `amendedFromId` + reason (EncounterNote).  
- Correction: lifecycle CORRECTED (admission amendment dialog already exists; adapter maps AMENDED).  
- Addendum: separately authored/timestamped (provider addenda remain store-specific; projection labels reserved).  
- Late entry: lineage flag `lateEntryLabeled`.

---

## 10. Structured and narrative data model

Hybrid contract:

- `structured`: `{ schemaId, schemaVersion, payload }`  
- `narrative`: versioned sections  

Validation against the document’s schema version; old signed docs remain renderable via stored templateVersion.

---

## 11. Template/schema versioning

Registry entries carry `templateVersion`. Adapters stamp source versions (MEDNOTE.2, EDOC card id, PROVIDER_SHELL.1, D4A.1). Future discipline templates register in `ENTERPRISE_CLINICAL_DOCUMENT_TYPE_REGISTRY`.

---

## 12. Validation and completeness

Separated in `enterpriseClinicalDocumentValidationD4b1.ts`:

- Field validation (required, conditional, mutually exclusive)  
- Clinical completeness indicators  
- Signature readiness ≠ “valid JSON only”

---

## 13. Care-setting governance

Registry `allowedCareSettings` per document type. Unknown care setting allowed on adapters as `UNKNOWN` until encounter classifier is supplied by caller.

---

## 14. Discipline governance

Registry `allowedDisciplines`. **Discipline ≠ authorization** — Nest RBAC remains authority (`assignmentEqualsAuthorization: false`).

---

## 15. Interdisciplinary visibility

Foundation supports projection/reference via legal projection + shared document list helpers. Full interdisciplinary care plan deferred to **D4B.6**. One discipline must not overwrite another’s signed docs (lifecycle + identity immutability helpers).

---

## 16. Version history

`orderEnterpriseClinicalDocumentVersionHistory` + `paginateEnterpriseClinicalDocumentVersionHistory` (bounded, default limit 50, max 200). Sensitive diffs not exposed in normal clinical views.

---

## 17. Legal-record rendering

`buildEnterpriseClinicalDocumentLegalProjection` — status, authorship, amendment/unsigned/EIE marks, template version, structured/narrative sections, legal footer key. No new PDF engine.

---

## 18. Audit model

Reuse `AuditService` / EncounterNote allowlisted metadata / EDOC audits. Foundation does not log clinical narrative bodies. Nest util is read projection only.

---

## 19. Authorization model

Existing facility + encounter scoping + role checks on EncounterNotesService / clinical-documentation / nursing-admission / provider sign. Foundation adds eligibility helpers only.

---

## 20. Persistence strategy

**Adapters only.** No Prisma migration in D4B.1. No patient/encounter/author reassignment. No bulk rewrite of signed payloads.

---

## 21. API strategy

| Concern | D4B.1 approach |
|---------|----------------|
| Mutations | Existing EncounterNotes / EDOC / provider / nursing-admission endpoints |
| Projection | `enterprise-clinical-document-foundation.util.ts` (map already-loaded notes → contract / legal projection) |
| Future | Thin read APIs may wrap util without unrestricted mutation |

Server remains source of truth for status transitions and signer identity.

---

## 22. Frontend primitives

`EnterpriseClinicalDocumentPrimitivesD4b1.tsx` + i18n `enterpriseClinicalDocumentD4b1` (en/fr):

- Status badge · signature metadata · completeness · validation list  
- Version-history label support · amendment/addendum/EIE banner  
- Unsigned draft warning · legal-record header · read-only signed renderer  

No discipline dashboards; no shell redesign.

---

## 23. Performance

- Note list projection is O(n) over already-fetched rows (no per-row author fetch).  
- History pagination bounded.  
- Legal projection built from in-memory document.  
- Avoid speculative optimization.

---

## 24. Security and privacy

Supports: facility/encounter scoping (existing), signer=auth user checks, no client-controlled authorship on note create, PHI-safe audit metadata patterns. Does **not** claim HIPAA certification. Organizational/infra controls remain out of band.

---

## 25. Migration and compatibility

- Legacy erNotesV1 remain read-only merges.  
- Provider localStorage drafts remain H (incomplete enterprise draft).  
- Provider unlock remains explicit controlled reopen — not silent history rewrite.  
- Dual belongings admission/EDOC discipline continues via D4A.2.5A rules.

---

## 26. Deferred discipline work

D4B.2–D4B.10 as listed in phase prompt (nursing workspace through discharge TOC). Also deferred: family history longitudinal promotion, dedicated nutrition/elimination EDOC cards, unified server draft engine, Prisma ClinicalDocument table.

---

## 27. D4B roadmap

| Phase | Title |
|-------|-------|
| **D4B.1** | Enterprise Clinical Documentation Foundation (this) |
| D4B.2 | Enterprise Nursing Clinical Workspace |
| D4B.3 | Technician / NA Workspace |
| D4B.4 | Respiratory Therapy Workspace |
| D4B.5 | Rehab (PT/OT/SLP) |
| D4B.6 | Interdisciplinary Care Plan |
| D4B.7 | CM / SW / UR / Discharge Planning |
| D4B.8 | Provider Clinical Workspace |
| D4B.9 | H&P / Progress / Consult / Procedure |
| D4B.10 | Discharge and Transition of Care |

---

## 28. Final implementation summary

Delivered:

1. Complete audit document  
2. Shared contract, lifecycle, registry, authorship, validation, adapters, render helpers  
3. EncounterNote Nest projection util (reference)  
4. Web primitives + FR/EN i18n  
5. Shared + API + web characterization tests  
6. This architecture doc + certification  

**Not delivered (by design):** discipline dashboards, H&P suite, nursing admission rewrite, MAR/ownership/auth redesign, Prisma migration.
