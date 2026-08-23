# MEDUI.INP.2G.1 — Owner-Controlled Correction Certification

**Branch:** `medui-inp2g-nursing-admission-care-plan-convergence`  
**Worktree:** `.worktrees/inp2g`  
**HEAD:** `3e8c1077389fb7dc678e3dba06d599b248f9a6e6`  
**Base:** `e0f9c1fc8bc0b371500559e0622c5cfe8ebe1c93` (`origin/main`)  
**Date:** 2026-08-23  
**Status:** **CERTIFIED** (two-RN live UAT complete)

---

## Exact document-owner source

```
resolveNursingAdmissionDocumentOwner(doc):
  if signed && signedByUserId → that userId
  else if documentOwnerUserId → that userId
  else null
```

Implemented in `packages/shared/src/encounters/nursingDocumentationOwnershipInp2g1.ts`.

**Hard rule (live-proven defect fixed in this pass):**  
If `signed === true` and owner cannot be resolved → `NURSING_ADMISSION_OWNER_UNRESOLVED`  
→ **READ ONLY** (never claimable; never infer from assigned RN / shift / role).

**Nursing Admission ownership rule**

- First successful RN section draft write stamps immutable `documentOwnerUserId`.
- After sign, owner = `nurseSignature.signedByUserId`.
- Non-owner RN: read OK; draft PATCH forbidden; amendment POST forbidden.
- Owner corrects after sign via append-only amendment with required reason.

**Nursing Assessment ownership rule**

- Episode owner = server-stamped `authorUserId` on that session.
- While latest is unsigned (DRAFT/SAVED), only that author may write.
- After SIGNED/FINAL, other RNs may start a **new** episode.
- Owner correction: new session with `correctionOfSessionId` + `correctionReason`; original session intact.

---

## Live UAT actors

| | Email | userId | Facility |
|--|--|--|--|
| RN A | `rna-inp2g1-uat@test.local` | `2e290fa5-f225-43e9-8d74-22e0301d1871` | Facility A (DR) `04067471-1172-483c-8830-39f1dc0a2310` |
| RN B | `rnb-inp2g1-uat@test.local` | `8a840fbc-eba7-4b05-8fe2-54edbac536ce` | same |
| Password | `MedoraAdmin123!` | MFA not required for RN (unchanged) | |

Disposable OPEN inpatient encounter: `eb7ea927-3f54-43fc-85e7-09262069883e`

---

## Live UAT matrix

| Gate | Result | Evidence |
|------|--------|----------|
| RN A draft ownership | **PASS** | `documentOwnerUserId` = RN A after first section save |
| RN B draft rejection | **PASS** | PATCH 403 `NURSING_ADMISSION_NOT_DOCUMENT_OWNER` |
| RN A sign | **PASS** | 201; `nurseSignature.signedByUserId` = RN A |
| RN A correction | **PASS** | Amendment append; reason persisted; version++ |
| RN B signed correction rejection | **PASS** | POST amendments 403 `NURSING_ADMISSION_NOT_DOCUMENT_OWNER` |
| Original signature immutable | **PASS** | `signedAt` / `signedByUserId` unchanged after amend |
| Amendment reason | **PASS** | Reason stored on amendment row |
| Amendment history | **PASS** | `amendments[]` durable on reload; printStatus `CORRECTED` |
| 409 stale write | **PASS** | Second concurrent amend 409 `NURSING_ADMISSION_AMENDMENT_STALE` |
| Nursing Assessment episode ownership | **PASS** | RN A author; RN B 403 `NURSING_ASSESSMENT_DRAFT_NOT_OWNER` |
| Nursing Assessment correction | **PASS** | RN A correctionOfSessionId; RN B 403 `NURSING_ASSESSMENT_CORRECTION_NOT_OWNER` |
| Summary | **PASS** | Corrected projection; original signer/time; amend metadata |
| Print | **PASS** | print-summary `printStatus=CORRECTED` + signature + amendments (RN chart-export is PROVIDER/ADMIN-gated; RN surfaces captured) |
| Care Plan | **PASS** | Single `fall_risk` plan create/reload; D4B.6 engine; review returned 409 revision conflict (non-blocking) |
| Zero Order/MAR side effects | **PASS** | MAR count unchanged; no unintended Order create observed |
| Unresolved legacy owner safety | **PASS** | After fix: PATCH 409 already-signed; amend **403 `NURSING_ADMISSION_OWNER_UNRESOLVED`** |
| EN | **PASS** | Ownership strings present |
| FR | **PASS** | French values; no English UI leakage in FR values |
| Cross-facility | **PASS** | Wrong facility → 403 |
| Tests/builds | **PASS** | See gates below |
| Migration | **NO** | Additive JSON only |
| Seed | **NO** | Disposable local UAT users only |

---

## Focused gates re-run

- Shared ownership + care-plan convergence + D4B.6 unit tests: PASS  
- API `encounters.service.inpatient-nursing-authority.spec.ts` (incl. INP.2G.1): PASS  
- API nursing-admission INP.2B.2C + interdisciplinary care plans util: PASS  
- Orders/MAR/Results regression sample: PASS  
- `@medora/shared` build: PASS  
- `@medora/api` nest build: PASS  
- Web `tsc --noEmit`: PASS  
- Next production build: PASS  
- Prisma validate: PASS  
- `git diff --check`: PASS  

---

## Remaining risks

1. Full `/encounters/:id/chart-export` remains PROVIDER/ADMIN-only; RN medical-record print uses nursing-admission print-summary (CORRECTED) + care-plan/assessment surfaces.  
2. Care Plan `/reviews` may return `CARE_PLAN_REVISION_CONFLICT` without client expectedVersion — create/reload/no Order-MAR side effects still proven.  
3. Next production build wrote default `apps/web/.next` (no live `next dev` lock observed on this worktree).  
4. Uncommitted certification + ownership-fix files remain local — **no commit/push/PR** in this pass.

---

## Verdict

**CERTIFIED**
