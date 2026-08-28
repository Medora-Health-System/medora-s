# Medora Enterprise Authorship Immutability — Implementation Audit

**Constitution:** `.cursor/rules/enterprise-clinical-authorship-immutability.mdc`  
**Short form:** Authors can correct themselves. Everyone else documents forward.  
**Shared contract:** `packages/shared/src/clinical/clinicalDocumentationAuthorshipAuthority.ts`  
**Audit scope:** `.worktrees/inp2g` (representative enterprise tree)  
**Date:** 2026-08-23  
**Mode:** Audit only — remediations listed, not blindly applied.

---

## Compliance matrix

| Domain | SSoT | author field | modification endpoint | current rule | Status | Required remediation |
|---|---|---|---|---|---|---|
| Nursing Admission (Med/Surg) | `admissionSummaryJson` / med-surg nursing admission + `nursingDocumentationOwnershipInp2g1` | `documentOwnerUserId`; after sign `nurseSignature.signedByUserId` | `PATCH …/nursing-admission/sections`, `POST …/sign`, `POST …/amendments` | Owner gate + 409 on amend/section; INP.2G.1 live-certified owner correction | **PARTIAL → strong** | Gate sign + preload on owner; ADMIN must not substitute for author |
| Inpatient Nursing Assessment | `inpatientNursingAssessmentV1` + clinical events | `authorUserId` | `POST …/inpatient-nursing-assessments` | Server owner/correction gates; new episode for non-owner after sign | **PARTIAL** | Add expectedVersion/409 on draft; ADMIN ≠ author substitute |
| Encounter nursing notes | Prisma `EncounterNote` | `authorUserId` | notes create / amend / void | Amend author-only; void/cosign broader roles | **PARTIAL** | Void/EIE as governance event, not body rewrite |
| Provider H&P | inpatient provider workspace H&P draft JSON | `signedByUserId` only (no draft owner) | `PATCH …/provider-workspace/hp`, sign | Any PROVIDER/ADMIN with version match | **NONCOMPLIANT** | Stamp immutable draft owner; owner-only edit/sign/amend |
| Provider progress notes | provider progress note array | `signedByUserId` only | progress-notes patch/sign | Any PROVIDER/ADMIN on unsigned | **NONCOMPLIANT** | Per-note `authorUserId`; owner-only |
| Consult notes | consult request shell (thin) | `requestedByUserId` | consult append/transition | Status ops; little note-body authorship | **PARTIAL** | If narrative notes added: author + owner gates |
| Procedure documentation | `EncounterClinicalEvent` PROCEDURE | `createdByUserId` | `POST …/procedures/document` | Append-create; weak correction path | **PARTIAL** | Author-only correction/EIE; no role rewrite |
| Care Plans | `EncounterCarePlan*` + D4B.6 | component `createdByUserId`; progress `authorUserId` | care-plans component update | Discipline/role gates, not author | **NONCOMPLIANT** | `createdByUserId` checks; others contribute new items |
| Pharmacy clinical (non-MAR) | verification stamps | `pharmacistUserId` | pharmacy verify | Operational verify, not narrative ownership | **UNKNOWN** | Future pharmacist notes → authorship contract |
| Lab results / ack | order results pipeline | verify/ack user ids | verify + acknowledge | Ack should not rewrite result body | **PARTIAL** | Keep immutable results; ack notes author-owned |
| Radiology reports | results pipeline | same | same | Thin narrative ownership | **PARTIAL** | Same as lab |
| ED nursing (`nursingAssessment` JSON) | `Encounter.nursingAssessment` namespaces | mostly absent | `PATCH /encounters/:id` | Wholesale JSON overwrite by RN/PROVIDER/ADMIN | **NONCOMPLIANT** | Split APIs; per-namespace owner; deny non-author |
| Provider exam / MSE | provider eval namespaces + sign flags | sign stamp only | PATCH encounter + unlock | Unlock/edit without original signer check | **NONCOMPLIANT** | Owner content; unlock = governed amendment |
| EDOC clinical cards | `EncounterClinicalDocumentationEntry` | `authorUserId` | create + **upsertLatestActiveEntryForCard** | Create stamps author; upsert mutates without author check | **NONCOMPLIANT** (upsert) | Owner-only upsert or versioned replace |
| Handoff | ED handoff JSON + IP provider handoff | weak / signedBy only | PATCH + handoff endpoints | Role-gated drafts | **NONCOMPLIANT** | Draft owner; owner-only edit |
| Discharge / CM / SW / education | ops JSON + EDOC education | sparse | ops set + EDOC | Shared overwritable planning | **PARTIAL** | Separate planning vs authored narrative |
| Respiratory / PT/OT | EDOC cards | EDOC `authorUserId` | EDOC paths | Inherits EDOC upsert gap | **PARTIAL** | Same as EDOC |
| Amendments / EIE / void | nursing amend (owner-gated); provider amend; note void | varies | amend/void/unlock | Nursing admission amend strong; provider/unlock weak | **PARTIAL** | Universal author-or-explicit-governance policy |

---

## Highest-risk NONCOMPLIANT (remediate first)

1. **`PATCH /encounters/:id` ED `nursingAssessment` overwrite** — non-author can replace live clinical JSON.
2. **EDOC `upsertLatestActiveEntryForCard`** — in-place mutate ignoring `authorUserId`.
3. **Provider workspace H&P / progress / handoff** — no draft owner; ADMIN/PROVIDER free edit.
4. **Provider documentation unlock** — clears signature without original-author ownership.
5. **Care plan component update** — discipline gate without `createdByUserId` check.

---

## Closest to compliant (reference patterns)

- Nursing Admission draft + amendments (INP.2G.1): `assertNursingAdmissionOwnerWrite`, unresolved-owner read-only, 409 stale.
- Inpatient nursing assessment episodes: author lock + `correctionOfSessionId` for author corrections.
- Encounter note **amend**: author-only.

---

## Shared resolver

Introduced (contract only; not yet wired to every domain):

`canModifyClinicalDocumentation({ currentUserId, authorUserId, documentState, action })`

Ordinary modification ⇒ `currentUserId === authorUserId`.  
Governance actions are explicit and separate.

---

## Next remediation order (do not big-bang)

1. Wire shared resolver into **EDOC upsert** + **ED nursingAssessment write split**.
2. Provider workspace draft ownership stamp + owner gates.
3. Care plan component author checks.
4. Provider unlock → governed amendment only.
5. Sweep ADMIN role on clinical content writes (ADMIN ≠ clinical author).

---

## Migration / seed

**None** for this constitution + audit pass.
