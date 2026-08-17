# MEDUI.INP.2B.2 — Nursing Admission Design 1 rapid-documentation audit

**Date:** 2026-08-17  
**Branch:** `inp2b1-nursing-admission-ux-convergence`  
**Base:** INP.2B.1 three-column layout  
**Phase:** INP.2B.2 subsection rapid UX + Stage 6 review dashboard

## Persistence authority

| Item | Finding |
|---|---|
| Durable store | `Encounter.admissionSummaryJson.medSurgNursingAdmissionV1` |
| Schema | `packages/shared/.../medSurgNursingAdmissionD4a1.ts` |
| Migration | **NONE** |
| Seed | **NONE** |
| New engine | **NONE** — section `answers` JSON extended only |

## Enterprise domain audit

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Patient demographics | Registration / encounter patient | ✔ | ✔ locale DOB | ✔ |
| Medical/surgical history | Preload + verify API | ✔ | ✔ review chips | ✔ |
| Allergies | Preload + enterprise allergy | ✔ | ✔ review chips | ✔ |
| Home medications | Preload + recon lines | ✔ | ✔ review chips | ✔ |
| Pain | EDOC13 + admission PAIN section | ✔ | ✔ rapid screen | ✔ |
| Fall safety | EDOC14 + FALL_SAFETY section | ✔ | ✔ | ✔ |
| Skin/wound | EDOC20 + domain launcher | ✔ | ✔ | ✔ |
| Devices | EDOC devices + domain launcher | ✔ | ✔ confirm YNU | ✔ |
| Belongings | Belongings engine button | ✔ | ✔ | ✔ |
| Code status / isolation | inpatientClinicalOps projection | ✔ read-only | — | ✔ |
| Nursing Assessment (INP.2C) | Separate panel | ✔ untouched | — | ✔ |

## INP.2B.1 preserved

- Three-column layout (left nav / center form / right rail)
- Six-stage tracker + subsection cards
- Save draft / Save and continue / conflict recovery
- `clinicalDocumentedAt` on JSON
- Single Clinical Documentation launcher in left nav

## INP.2B.2 added

- Icon card selects (admission source, mode of arrival)
- Semantic condition-on-arrival pills
- Expanded rapid YNU / review controls across 20 sections
- Stage 6 `NursingAdmissionReviewDashboard`
- Extended `projectNursingAdmissionOverview` + `projectNursingAdmissionRailSummary`
- EN/FR `inpatientAdmissionInp2b2.*`
- Domain panel cleanup (hide 0 linked records, clinical help only)

## Deferred

- Live browser UAT A–AG
- Operator certification sign-off
