# MEDUI.INP.2B.1 — Nursing Admission UX convergence audit

**Date:** 2026-08-17  
**Branch:** `inp2b1-nursing-admission-ux-convergence`  
**Base:** `origin/main` (includes certified INP.2B + INP.2C / INP.2C.1)  
**Phase:** INP.2B.1 only (layout / navigation / save / clinical time). INP.2B.2 subsection UX is deferred.

## Persistence authority

| Item | Finding |
|---|---|
| Durable store | `Encounter.admissionSummaryJson.medSurgNursingAdmissionV1` |
| Schema | `packages/shared/.../medSurgNursingAdmissionD4a1.ts` |
| API | `PATCH .../nursing-admission/sections` (section-level, `expectedVersion`) |
| Section merge | `saveAdmissionSectionDraft` replaces **one** section object; other sections spread unchanged |
| Prisma | **No migration required** |

## Clinical effective time STOP-GATE

Nursing Admission previously had **no** nurse-selected clinical effective timestamp distinct from audit time.

| Clock | Field | Role |
|---|---|---|
| Server audit | `updatedAt`, section `updatedAt`, `nurseSignature.signedAt` | Server-authored |
| Missing | `clinicalDocumentedAt` | Nurse-selected effective time |

**Decision:** additive JSON field `clinicalDocumentedAt` on `MedSurgNursingAdmissionDocV1`. Do **not** overwrite `updatedAt` / `authored` audit clocks. **Prisma = NONE.**

## Duplicate chrome (current)

- Stage chips + “Stage X of 6” hint + completion dashboard + save-status bar + sticky footer (same save actions repeated)
- Two-column layout (form + 220–280px context rail); subsections cramped
- `AdditionalClinicalDocumentationLauncher` in left nav **and** OVERVIEW rapid controls
- `InpatientLifecycleActionsMenu` in the primary admission chrome
- Context rail `allergiesSummary={null}` (allergies never projected)
- Raw ops codes possible (`DNR_DNI`, `STANDARD`) if display formatters are skipped

## Navigation / save risks

- `goTo` auto-persists then navigates even when persist fails (catch swallows)
- `useEffect([active, doc?.sections])` reloads answers from server and can drop a local draft
- 409 conflict is not mapped from `apiFetch` `status` (always `SAVE_FAILED`)

## Reuse matrix

| Domain | Existing component | Reused | Extended | Duplicate prevented |
|---|---|---|---|---|
| Admission JSON | `medSurgNursingAdmissionV1` | ✔ | `clinicalDocumentedAt` | ✔ |
| Six stages / 20 sections | `NURSING_ADMISSION_STAGES` | ✔ | presentation | ✔ |
| Context rail | `NursingAdmissionContextRail` | ✔ | save + time | ✔ |
| Overview projection | `projectNursingAdmissionOverview` | ✔ | clinical time | ✔ |
| Code/isolation | header / `inpatientClinicalOpsV1` | ✔ | display labels | ✔ |
| Allergies | preload / enterprise allergy | ✔ | rail projection | ✔ |
| Clinical Documentation | existing launcher / hub | ✔ | one left-nav action | ✔ |
| Encounter lifecycle | `InpatientLifecycleActionsMenu` | ✔ | moved out of primary form | ✔ |
| Nursing Assessment | INP.1B.6 / INP.2C.1 | ✔ | untouched | ✔ |

## INP.2B.2 deferred

Mode-of-arrival icon cards, full subsection rapid redesign, Stage 6 review rewrite, and live UAT certification belong to INP.2B.2 / INP.2B.3.
