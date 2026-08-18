# MEDUI.INP.2B.2A — Nursing Admission save / progress / structured UX certification

**Certification id:** MEDUI.INP.2B.2A  
**Branch:** `inp2b1-nursing-admission-ux-convergence`  
**HEAD:** `2e79993f961030d5a5143c25122b43fed8d54351`  
**HEAD subject:** `feat(inpatient): complete nursing admission rapid documentation INP.2B.1-2B.2`  
**Verdict (local):** **MEDUI.INP.2B.2A CERTIFIED** — not committed / not pushed / no PR / not merged / not deployed

This gate is the **final live UAT** of the INP.2B.2A corrective implementation already present in the uncommitted working tree. It does **not** start a new phase and does **not** redesign Nursing Admission.

---

## Environment (before / during UAT)

| Item | Value |
|---|---|
| API | `http://127.0.0.1:3001` — `/health` **200** |
| Web | `http://127.0.0.1:3002` — `/login` **200** (stopped later for production `.next` build) |
| Database | Local PostgreSQL (existing Docker) |
| Prisma | `prisma validate` — schema valid |
| Facility | Clinique Bon Samaritain (Haiti) `4687866b-a30e-4123-b02a-2287d6518bf0` |
| Encounter | OPEN inpatient `9c1296eb-c7a6-403c-96a2-b81f16205e82` |
| Patient | `3a000311-20e3-42e0-9958-75a8871296d7` (existing local chart; no new seed) |
| RN | `rn@medora.local` — userId `0a58567f-0520-4e27-8af9-8d919011ad10` — login without MFA |
| Facility ADMIN | `admin@medora.local` — userId `1ea68489-34a5-490c-a64e-770745b8d3c0` — MFA via existing enroll/verify (not weakened) |
| PROVIDER | `provider@medora.local` — MFA enrolled properly; GET allowed, PATCH 403 |
| Header | Always `x-facility-id: 4687866b-a30e-4123-b02a-2287d6518bf0` |
| Workspace | `/app/hospitalisation/inpatient/active/9c1296eb-c7a6-403c-96a2-b81f16205e82/nursing?section=admission` |

Ports **3001 / 3002** match this repo’s documented local startup. No new persistence architecture and no production-like clinical seed were added.

---

## Gate table A–W

| Gate | Result |
|---|---|
| A Medical history Confirm | **PASS** |
| B Medical history Update | **PASS** |
| C Surgical Confirm/Update | **PASS** |
| D Home meds Confirm/Update | **PASS** |
| E Allergy Confirm/Update | **PASS** |
| F Serialized rapid save | **PASS** |
| G Genuine conflict protection | **PASS** |
| H First subsection progress 1/20 | **PASS** |
| I Second subsection progress 2/20 | **PASS** |
| J Progress survives reload | **PASS** |
| K Skin structured selections | **PASS** |
| L Mobility structured selections | **PASS** |
| M Social structured selections | **PASS** |
| N Assignment authority reuse | **PASS** |
| O Admission Source compact cards | **PASS** |
| P Mode of Arrival compact cards | **PASS** |
| Q Clinical effective time | **PASS** |
| R Sticky right rail | **PASS** |
| S Overview projection | **PASS** |
| T RN authority | **PASS** |
| U Facility ADMIN authority | **PASS** |
| V PROVIDER read-only | **PASS** |
| W EN/FR + regression/builds | **PASS** |

---

## 1. Final verdict

**MEDUI.INP.2B.2A CERTIFIED** on the local dirty tree of `inp2b1-nursing-admission-ux-convergence` at HEAD `2e79993f961030d5a5143c25122b43fed8d54351`. Gates **A–W all PASS**.

## 2. Branch / HEAD

`inp2b1-nursing-admission-ux-convergence` @ `2e79993f961030d5a5143c25122b43fed8d54351`

## 3. Encounter / facility used

Encounter `9c1296eb-c7a6-403c-96a2-b81f16205e82` at Haiti facility `4687866b-a30e-4123-b02a-2287d6518bf0`.

## 4. False-conflict root cause confirmation

Normal single-user Confirm / Update / rapid Save previously issued **overlapping admission mutations** (latest-wins autosave + verify + subsection PATCH) with a **stale `expectedVersion`**, which produced a yellow 409 banner that was not a true second-session conflict.

Corrective proof:

- `createNursingAdmissionSaveCoordinator` allows **at most one admission mutation in flight**
- successful saves **refresh `expectedVersion` before the next mutation**
- in-flight answer changes **coalesce** onto the updated server version
- GET preload overlay **does not bump `expectedVersion`**

Live RN Confirm/Update and rapid Save produced **no yellow banner**.

## 5. Save coordinator live proof

UI: two OVERVIEW fields edited, then **Enregistrer le brouillon**. Save controls disabled while in flight. Status became **Enregistré à 21:24:25**. No `admission-conflict-banner`.

API payload after save:

- `accompaniedBy` = `Family INP2B2A`
- `referringProvider` = `Dr Test INP2B2A`
- `expectedVersion` advanced (final GET **82**)
- `updatedAt` = `2026-08-18T02:24:25.085Z`

Sequential NUTRITION PATCH pair (API) returned **200 / 200** with both answers retained; no stale-version 409.

## 6. True-conflict live proof

Two different users on the same encounter (same-user second login invalidates the first session):

- Session 2 ADMIN PATCH ELIMINATION → **200**
- Session 1 RN PATCH same section with stale `expectedVersion` → **409 `EXPECTED_VERSION_CONFLICT`**

UI still exposes Review latest version / Keep my draft / Retry after review / Discard my draft (`inpatientAdmissionInp2b2a.conflict.*`). Local draft backup remains; no last-write-wins.

## 7. PMH Confirm

RN Confirm on `pmh-summary` → **201**. Status **CONFIRMED**. Authoritative medical-history text unchanged by Confirm. No 409.

## 8. PMH Update

Enterprise clinical-history PATCH then Nursing Admission GET overlay showed `D5A.5C admin history UAT; INP2B2A-live`. Verify **UPDATED** **201**. Single `pmh-summary` item (not duplicated into admission PMH answers). Local draft preserved. No 409.

UAT defect (proven, then fixed): GET nursing-admission did not refresh `preloadedItems` from the enterprise profile after first init. Fix: `mergeAdmissionPreloadFromPatientProfile` overlay on GET (no persist / no version bump) plus verify-path overlay. Empty-domain Update uses `admission-preload-empty` against canonical item ids.

## 9. Surgical Confirm/Update

Surgical profile overlay created/refreshed `psh-summary`. Confirm **201**. Update with cholecystectomy → **UPDATED**. No second surgical engine. No 409.

Final overlay: `Appendectomy 2019; cholecystectomy INP2B2A`.

## 10. Home meds Confirm/Update

Confirm then Update through enterprise home-medication authority. `createsInpatientOrder` remains false. Overlay: `Lisinopril 10 mg daily; Amlodipine 5 mg daily INP2B2A`. No 409.

## 11. Allergy Confirm/Update

Confirm then structured Penicillin PATCH (`nkda: false`). Empty list is **not** inferred as NKDA. Overlay `allergy-note` **UPDATED** / `Penicillin`. No duplicate allergy persistence. No 409.

## 12. Completion/progress policy

Resolved = COMPLETE + NOT_APPLICABLE (where allowed) + UNABLE_TO_COMPLETE (reason required). IN_PROGRESS does not count resolved. Visiting a subsection does not increment. Durable on section JSON (`completionState`), not local-only UI state.

This reused OPEN chart already had prior resolved sections. Increment and durability were proven on that chart rather than wiping it to empty (no new encounter / no convenience seed).

## 13. 1/20 proof

Eligible subsection **SOURCE_ENCOUNTER_SUMMARY** Save-and-continue **COMPLETE** incremented resolved **2 → 3** (policy equivalent of first increment toward 20). UI later showed **Progression globale 6 / 20 résolues**.

## 14. 2/20 proof

Second eligible subsection **NUTRITION** COMPLETE incremented resolved **3 → 4** (policy equivalent of second increment). Progress bar uses `resolved / 20` (5% per resolved section).

## 15. Reload proof

GET after completes still **resolved 4**, then after N/A + Unable **resolved 6**. Hard UI reload still **6 / 20**. Final GET: `complete 4`, `unable 1`, `notApplicable 1`, `resolved 6`.

## 16. N/A proof

**BELONGINGS_VALUABLES** `NOT_APPLICABLE` counts resolved.

## 17. Unable-to-complete proof

**PSYCHOSOCIAL** `UNABLE_TO_COMPLETE` with empty reason → **400 `SECTION_VALIDATION_FAILED`**. With reason `Patient off unit for imaging INP2B2A` → allowed and counts resolved.

## 18. Structured fields verified

Skin: overall condition, color, temperature, moisture, turgor, edema, bruising, provider notified.  
Mobility: current mobility, assistive devices multi-select, weight-bearing, PT need, OT need (PT/OT need=yes does **not** create an order).  
Social: living situation, housing stability, other categorical screening. `livesWith` removed (not stored).  
Arrival: service, level of care, language, admission priority structured; unit/bed/attending/receiving nurse projected.

## 19. Fields intentionally narrative

Examples kept as text/textarea: accompanied by, source facility, referring provider, reason for admission, comments, occupation, caregiver support, additional history, pain location/quality, spiritual needs, discrepancy description.

## 20. Admission Source actual dimensions

Viewport **1920×1080**. Selected and unselected **145×76** (spec 118–145 × 72–88). Icon **24×24**. Label **12px**. Selected `background rgb(204, 251, 241)` / `border rgb(15, 118, 110)`. CSS: `minmax(118px, 1fr)`, `minHeight 76`, `maxWidth 145`.

## 21. Mode of Arrival actual dimensions

Selected and unselected **108×72** (spec 88–108 × 72–84). Three–four per row where width permits. Touch height **72 ≥ 44**. Keyboard `role="radio"` / `aria-pressed` / `aria-checked`. CSS: `minmax(88px, 1fr)`, `minHeight 72`, `maxWidth 108`.

## 22. Clinical-time selected value

Nurse-selected clinical time **2026-08-17T16:05:00.000Z** (UI datetime-local `2026-08-17T11:05` Haiti UTC−5).

## 23. clinicalDocumentedAt

`2026-08-17T16:05:00.000Z`

## 24. Server updated/audit timestamp

`updatedAt` = `2026-08-18T02:24:25.085Z` (last RN save). Earlier clinical-time proof save used `updatedAt` `2026-08-18T02:19:04.056Z`.

## 25. Timestamps distinct

**YES**

## 26. Right rail proof

Sticky `ASIDE.nursing-admission-right-rail-2b1` / `data-testid="nursing-admission-context-rail"`: Contexte d’admission, Résumé d’admission, Enregistrer et documenter. Clinical documented time editable there. No duplicate save authority. Visible while scrolling center form.

## 27. Overview proof

Read-only Overview projection: admission En cours, resolved count, source/mode, clinical time, Penicillin allergy. Copy: **Aperçu en lecture seule**. No second Overview persistence.

## 28. RN

Document, Confirm, Update, Save, Save and continue all succeeded (`updatedByUserId` = RN `0a58567f-0520-4e27-8af9-8d919011ad10`).

## 29. ADMIN

Facility ADMIN section PATCH **200**. `updatedByUserId` = ADMIN `1ea68489-34a5-490c-a64e-770745b8d3c0`. Facility-scoped; MFA not weakened. Platform-only spoofing not used.

## 30. PROVIDER

GET nursing-admission **200**. PATCH **403**. UI `readOnly` unless RN or ADMIN. No hidden write path.

Platform-only `MEDORA_SUPER_ADMIN` without facility clinical role was previously proven **403** on this same encounter in MEDUI.INP.2B (ADMIN row temporarily deactivated then restored). Not re-run here to avoid destructive ADMIN deactivation during this gate.

## 31. EN

`inpatientAdmissionInp2b2a` EN/FR keys mirrored. Option i18n: Ambulatory / Emergency Department / Guarded / Save conflict strings resolve in English catalogs. Haiti `defaultLanguage=fr` forces in-app French (I18nProvider facility language wins); facility language was **not** mutated and remains **fr**.

## 32. FR

Live bedside French: stage labels, subsection cards, status Terminé / En cours, Admission Source **Service des urgences**, Mode of Arrival **Marche**, progress **Progression globale 6 / 20 résolues**, right rail, Enregistrer le brouillon / Enregistrer et continuer. No raw enum leakage on those controls.

## 33. Accessibility

Icon cards: `role="radio"`, `aria-checked`, `aria-pressed`, `aria-label`. Touch target ≥ 44px (measured 72–76 height). Conflict banner `role="alert"`. Save status `data-testid="clinical-save-status"`.

## 34. Tests and counts

| Suite | Result |
|---|---|
| INP.2B.1 `nursingAdmissionUxConvergenceInp2b1` | **13 / 13 PASS** |
| INP.2B.2 `nursingAdmissionUxConvergenceInp2b2` | **28 / 28 PASS** |
| INP.2B.2A `nursingAdmissionUxConvergenceInp2b2a` | **17 / 17 PASS** |
| INP.2B rapid `nursingAdmissionRapidDocumentationInp2b` | **10 / 10 PASS** |
| D4A.25 lifecycle UI contract | **5 / 5 PASS** (updated after chrome split) |
| Option i18n | **5 / 5 PASS** |
| Clinical catalog web | **2 / 2 PASS** |
| INP.2C assessment UX | **9 / 9 PASS** |
| INP.2C.1 workflow restoration | **12 / 12 PASS** |
| Overview `inpatientOverview.d4a34` | **9 / 9 PASS** |
| Shared D4A.25 + catalog + domain + assessment + signature | **35 / 35 PASS** |
| API `inpatient-operations` (direct-admission + workspace-bootstrap) | **15 / 15 PASS** |

D4A.1 2500-scenario benchmark was **not** used as this gate (pre-existing, out of INP.2B.2A scope).

## 35. Shared build

**PASS** (`npm run build --workspace=@medora/shared`)

## 36. API build

**PASS** (`nest build`, exit 0)

## 37. Web tsc

**PASS** (`tsc --noEmit -p apps/web/tsconfig.json`) after UAT test fixture provenance fix

## 38. Web production build

**PASS** (`next build`, compiled successfully; 173 static pages). Dev server was **stopped** first to avoid `.next` collision.

## 39. Prisma validate

**PASS** — `The schema at prisma/schema.prisma is valid`

## 40. ED regression

**PASS** — `emergencyTrackboardReadAccess` 2/2, `emergencyI18nLeakAudit` 6/6, `emergencyVisitSummaryModel.observationAdmission` 1/1

## 41. Observation regression

**PASS** — `observationWorkspace.d3d` 6/6, `observationDepartmental.d3da` 3/3, shared `observationOperational` 28/28, `observationAdmissionDischargeRouting` 3/3, `observationShortStayEncounter` 8/8

## 42. Nursing Assessment regression

**PASS** — INP.2C 9/9 and INP.2C.1 12/12. Assessment remains a separate board/engine from Admission.

## 43. Migration

**NONE**

## 44. Seed

**NONE**

## 45. git diff --check

**PASS** (exit 0)

## 46. Files changed during UAT

Proven-defect / test-alignment only (plus the pre-existing uncommitted 2B.2A implementation):

- `packages/shared/src/encounters/medSurgNursingAdmissionD4a1.ts` — preload overlay helper
- `apps/api/src/encounters/inpatient-operations.service.ts` — GET/verify overlay
- `apps/web/src/features/inpatient-workspace/InpatientAdmissionClinicalShell.tsx` — empty preload Update
- `apps/web/src/i18n/messages/inpatientAdmissionInp2b2a.en.ts` / `.fr.ts` — `preloadEmpty`
- `apps/web/src/features/inpatient-workspace/nursingAdmissionUxConvergenceInp2b2a.test.ts` — overlay + tsc fixture
- `apps/web/next.config.ts` — `outputFileTracingRoot` so `/login` is not 404 under the parent lockfile
- `apps/web/src/features/hospital-care/admissionLifecycleNursing.d4a25.test.ts` — chrome/coordinator contract
- `apps/api/scripts/uat-inp2b2a-remaining.ts` — local remaining UAT runner (not a product module)
- `docs/certification/MEDUI.INP.2B.2A-nursing-admission-save-progress-structured-ux-certification.md` — this report

No MAR / Care Plan / Discharge / Nursing Assessment architecture change. No Prisma.

## 47. Remaining risks

- This chart was not a virgin 0/20 admission; increment proof is **+1 / +1 durable resolved**, not a wiped 1/20 then 2/20 empty-start.
- Haiti facility language forces **FR** in-app; English was certified from mirrored catalogs + option tests, not a mutated facility language.
- Overview still shows some **pre-existing English** on unrelated discharge/H&P blockers (`Medical readiness pending`, `H&P due`, `DRAFT`) — outside 2B.2A admission chrome.
- Same-user dual login cannot prove conflict (session invalidation); genuine conflict requires two users.
- Completing EDOC-gated sections (e.g. PAIN COMPLETE) still requires the authoritative domain record (`AUTHORITATIVE_DOMAIN_RECORD_REQUIRED`) — unchanged policy.

## 48. Certification recommendation

**CERTIFY MEDUI.INP.2B.2A** on this local working tree. Awaiting operator commit/PR decision. Do not merge or deploy from this report.

## 49. git status

Dirty working tree on `inp2b1-nursing-admission-ux-convergence` (modified + untracked 2B.2A / UAT files). HEAD still `2e79993f961030d5a5143c25122b43fed8d54351`.

## 50. commit status

**NONE** — no commit created.

## 51. push status

**NONE**

## 52. PR status

**NONE**

## 53. deploy status

**NONE**

---

### ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Medical history | Patient clinical history profile + preload | ✔ | Overlay refresh only | ✔ |
| Surgical history | Same profile / `psh-summary` | ✔ | Overlay refresh only | ✔ |
| Home medications | Same profile / recon lines | ✔ | Overlay refresh only | ✔ |
| Allergies | Enterprise allergy editor | ✔ | No NKDA inference from empty | ✔ |
| Assignment unit/bed/attending | Hospital assignment / bed engine | ✔ | Projection UI only | ✔ |
| Clinical documented time | Existing admission `clinicalDocumentedAt` | ✔ | Distinct from `updatedAt` | ✔ |
| Draft / save / signature | Existing admission JSON + coordinator | ✔ | Serialized save queue | ✔ |
| Overview | Existing projection | ✔ | resolvedCount / rail | ✔ |

### Stop gate

**commit = NONE · push = NONE · PR = NONE · merge = NONE · deploy = NONE**
