# MEDUI.D4C.7 — Certification

## Verdict

**CERTIFIED WITH DOCUMENTED DEFERRALS**

All fixable parameterization and integration gates for Clinic Care Public Health, Pharmacy ambulatory filtering, and ambulatory discharge (care-setting-aware shared ED diagnosis instruction engine) ship in this change set.

### Documented deferrals (enterprise STOP — report exact gap)

| Item | Authority | Why deferred |
|------|-----------|--------------|
| Clinical disease report DRAFT → submit → amend lifecycle | `DiseaseCaseStatus` = `SUSPECTED \| CONFIRMED \| RULED_OUT` only | Requires approved Prisma migration — must not invent `ClinicDiseaseReport` or silently mark unsupported jurisdictions as submitted |
| Live WHO / MSPP connector | Prior D4C.2 deferral | Out of Phase 1 Clinic MVP scope for this cert |
| Facesheet immunization SSoT fields | Prior D4C.2 deferral | Chart tab + VaccineAdministration reuse exists; facesheet profile fields deferred |
| Haiti Clinic RN lab result entry enablement | `Facility.allowRnLabResultSubmission` (default `false`) | Unchanged — requires separate facility seed / admin approval (D4C.5B.3) |

All other gates pass. No migration. No Clinic* forks. U.S. ED discharge paths unchanged when `careSettingContext` omitted / `ED`.

## Certification id

`MEDUI.D4C.7`

## Tests

| Suite | Counts |
|-------|--------|
| Shared D4C.7 A–M | **13 passed** |
| Web D4C.7 source guards A–H | **8 passed** |
| Web D4C.5B.2 mounts (regression) | **12 passed** |
| **Total focused validation** | **33 passed** |

Validation: `@medora/shared` build OK · `@medora/api` build OK · `@medora/web` build OK · web `tsc --noEmit` OK · `prisma validate` OK · `git diff --check` OK · migration none.

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Pharmacy | `/app/pharmacy` + PharmacyVerification | ✔ | Ambulatory filter | ✔ |
| Public Health / Vaccine | VaccineAdministration | ✔ | Deep-link | ✔ |
| Disease report | DiseaseCaseReport | ✔ | Jurisdiction helper | ✔ |
| Discharge instructions | ProviderDischargeDocumentationSection + registry | ✔ | careSetting + facilityDisplayName | ✔ |
| Patient instructions card | PatientDischargeInstructionsClosureCard | ✔ | Under shared workflow | ✔ |
| Print | DischargePrintLayout | ✔ | Clinic print gates | ✔ |
| Summary | EmergencyVisitSummaryPanel | ✔ | — | ✔ |
| Jurisdiction | Facility.country | ✔ | Pathway resolver | ✔ |
| Med safety | medicationSafetyWarnings | ✔ | (D4C.5B.3) | ✔ |

## Phase

Phase 1 Clinic MVP — French UI via mirrored `en.ts` / `fr.ts`.
