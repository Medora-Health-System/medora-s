# MEDUI.D4C.7A — Audit: ambulatory MDM French localization + duplicate discharge removal

## 0. Git verification

| Check | Result |
|-------|--------|
| Branch | `d4c7a-ambulatory-mdm-localization-discharge-cleanup` |
| Working tree at start | Clean |
| `origin/main` | Fetched; HEAD contained latest `origin/main` (`f46a4bbd8`) |
| D4C.7 / D4C.5B.3 / D4C.5B.2 | Merged on main (PRs #74 / #73 / #72) |
| Commit / push / merge | **Not performed** (authorized hold) |

## STOP gates screened

| Gate | Status |
|------|--------|
| Unrelated dirty changes | Pass (clean start) |
| Second provider-documentation engine / ClinicMDM | Pass — reuses `ProviderDocumentationWorkspace` |
| Second discharge-instruction persistence model | Pass — D4C.7 `ProviderDischargeDocumentationSection` only; flat card removed from presentation |
| Global U.S. ED behavior change | Pass — ED high-value catalog keys + clinical-rationale fields unchanged for `encounterMode=ED` |
| Translating signed historical notes in place | Pass — Apply French / Refresh gated on `!signedOrFinalized` |

## Screenshot defect map

| Defect | Root cause | Fix |
|--------|------------|-----|
| A. Justification clinique + Actions immédiates on ambulatory Med Eval | Fields always rendered | Care-setting presentation filter `shouldHideAmbulatoryRoutineMedEvalMdmChromeFields` (`AMBULATORY` only) |
| B. French labels / English inserts | `providerDocumentationMdmHighValue` FR catalog held English ED text | Separate ambulatory catalog `providerDocumentationMdmHighValueAmbulatory` + care-setting fragment key remap |
| C. Duplicate discharge card | `PatientDischargeInstructionsClosureCard` mounted under D4C.7 workflow | Removed obsolete presentation; preserve historical JSON; one save/print engine |

## MDM path audit (summary)

| Stage | Authority |
|-------|-----------|
| Registry / high-value templates | `providerDocumentationMdmTemplateCatalog.ts` |
| Labels | `providerDocumentationWorkspace.mdmTemplate*` (FR already) |
| Narrative inserts | `providerDocumentationMdmHighValue*` → ambulatory prefix when AMBULATORY |
| Preview / right summary | `buildProviderDocumentationPreviewSections` (authored field text) |
| Save / sign | `buildProviderDocumentationSavePayload` + omit empty hidden ambulatory fields |
| Print / Summary / longitudinal | Unchanged enterprise paths |

## Duplicate discharge audit

| Mount | Role after D4C.7A |
|-------|-------------------|
| `ProviderDischargeDocumentationSection` | **Authoritative** diagnosis-driven ambulatory discharge |
| `PatientDischargeInstructionsClosureCard` | **Removed** from Clinic Suivi/sortie presentation (component retained for ED) |
| Historical `dischargeSummaryJson` flat fields | Preserved; no wipe |

## Migration

**None.** No ClinicMDM table. No silent seed change.

### ClinicVisitTab host parity (audit follow-up)

`ClinicVisitTab` now passes `facilityCountry` + `authoredDocumentLocale` into `ProviderDocumentationWorkspace`, matching Clinic Care Med Eval so Haiti presentation filters and Apply French / Refresh work on the encounter clinic tab host as well.


## Validation (this change set)

| Check | Result |
|-------|--------|
| Shared D4C.7A A–H | 8 passed |
| Web D4C.7A A–H | 8 passed |
| Focused regressions (D4C.7 + D4C.5B.2 + MDM dropdown) | 68 passed |
| **Total focused** | **84 passed** |
| `@medora/shared` / `@medora/api` / `@medora/web` build | OK |
| web `tsc --noEmit` | OK |
| `prisma validate` | OK |
| `git diff --check` | OK |
| Commit / push | Not performed |
