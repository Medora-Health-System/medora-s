# MEDUI.INP.2G.1 — Owner-Controlled Correction Certification

**Branch:** `medui-inp2g-nursing-admission-care-plan-convergence`  
**Worktree:** `.worktrees/inp2g`  
**Date:** 2026-08-23  
**Status:** **NOT CERTIFIED**

---

## Part R — Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| R1 | Nursing Admission document owner = `nurseSignature.signedByUserId` when signed, else `documentOwnerUserId`, else null | PASS (code) | `resolveNursingAdmissionDocumentOwner` in `nursingDocumentationOwnershipInp2g1.ts` |
| R2 | First successful RN section draft write stamps immutable `documentOwnerUserId` | PASS (code + unit) | `stampNursingAdmissionDocumentOwnerOnDraftWrite` via `saveAdmissionSectionDraft` |
| R3 | Ownership never derived from assigned RN / shift | PASS (code) | No assignment fields consulted |
| R4 | Non-owner RN: read OK; draft PATCH forbidden | PASS (code + unit) | Shared gate + API `ForbiddenException` |
| R5 | Non-owner amendment POST forbidden | PASS (code + unit) | `appendNursingAdmissionAmendment` owner gate |
| R6 | Owner may amend after sign via existing amendment mechanism with required reason | PASS (code) | Existing amendment path + owner allow |
| R7 | Concurrent writes still 409 via `expectedVersion` | PASS (code + unit) | `EXPECTED_VERSION_CONFLICT` preserved |
| R8 | No Prisma migration / no new Admission store | PASS | Additive JSON `documentOwnerUserId` only |
| R9 | Assessment: non-owner cannot write unsigned working copy of another author | PASS (code + unit) | `assertInpatientNursingAssessmentWriteAllowed` + API gate |
| R10 | Assessment: other RNs may start new episode after SIGNED/FINAL | PASS (code + unit) | Write gate allows when finalized |
| R11 | Assessment correction links exact `correctionOfSessionId` + reason; does not mutate original event | PASS (code + unit) | New session + clinical event; original untouched |
| R12 | UI signed owner chrome (banner, View / Edit·Correct / History) | PASS (code) | `InpatientAdmissionClinicalShell.tsx` |
| R13 | UI draft non-owner read-only | PASS (code) | Draft owner lock banner + `writeBlocked` |
| R14 | Assessment UI ownership chrome | PASS (code) | `InpatientNursingAssessmentPanel.tsx` |
| R15 | Summary/print amendment indicator from same projection (no copy store) | PASS (code) | `nursingAdmissionMedicalRecordProjectionInp2g` `hasAmendments` / `amendmentCount` |
| R16 | Care Plan remains D4B.6 / EncounterCarePlan* (no new engine) | PASS | Unchanged SSoT |
| R17 | No facility UUID / Haiti / Wayne forks | PASS | Enterprise-only |
| R18 | No global unlock of signed forms | PASS | Owner amend path only |
| R19 | EN/FR i18n Part O ownership strings | PASS (code) | `inpatientNursingAdmissionInp2g.en.ts` / `.fr.ts` |
| R20 | Live UAT (two RNs, sign, correct, 409, assessment correction) | **FAIL** | Not executed in this agent session |

**Overall:** **NOT CERTIFIED** — implementation + unit coverage complete; live UAT remaining.

---

## Exact owner source

```
resolveNursingAdmissionDocumentOwner(doc):
  if doc.nurseSignature?.signed && doc.nurseSignature.signedByUserId → that userId
  else if doc.documentOwnerUserId → that userId
  else null
```

Assessment episode owner = server-stamped `authorUserId` on that session.

---

## Migration needed?

**No.** Additive JSON only (`documentOwnerUserId` on `MedSurgNursingAdmissionDocV1`; assessment correction fields on save schema / event payload).

---

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Nursing Admission doc | `MedSurgNursingAdmissionDocV1` / admissionSummaryJson | ✔ | ✔ (`documentOwnerUserId` + owner gates) | ✔ |
| Nursing Admission amendments | `appendNursingAdmissionAmendment` | ✔ | ✔ (owner gate) | ✔ |
| Nursing Assessment | `inpatientNursingAssessmentV1` + clinical events | ✔ | ✔ (draft lock + correction linkage) | ✔ |
| Care Plan | `EnterpriseInterdisciplinaryCarePlansD4b6` / EncounterCarePlan* | ✔ | — | ✔ |
| Signature / draft frameworks | Existing nurse signature + expectedVersion | ✔ | — | ✔ |

---

## Remaining gaps for CERTIFIED

1. Live UAT with two RN accounts: draft lock, sign, owner correct, non-owner deny, 409 race, assessment correction of exact session.
2. Confirm French UI copy with clinical reviewers on Part O strings.
3. Optional: surface amendment indicator chip on Summary/print consumer components if not already bound to `hasAmendments`.
