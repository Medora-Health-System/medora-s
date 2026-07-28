# MEDUI.D4C.7A — Ambulatory Medical Evaluation French MDM + discharge cleanup

## Purpose

French facilities / French-authored ambulatory Clinic Medical Evaluation must insert **French** MDM narrative (not English ED boilerplate behind French labels). Remove Justification clinique and Actions immédiates from routine ambulatory presentation. Keep a **single** ambulatory discharge engine (D4C.7 diagnosis-driven).

## Product outcome

1. Ambulatory Med Eval no longer shows Justification clinique / Actions immédiates (ED/Hospital unchanged).
2. High-value MDM templates (MDM standard, Préoccupation patient, ECG, études diagnostiques, sevrage tabagique) insert ambulatory-appropriate French when authored-document locale is French.
3. Unsigned legacy English MDM fragments offer explicit **Appliquer le français / Actualiser** — no silent overwrite; signed notes immutable.
4. Suivi/sortie shows one discharge workflow; obsolete flat “Instructions de sortie au patient” card removed from ambulatory compose.

## Architecture

### Shared

`packages/shared/src/auth/clinicCareAmbulatoryMdmLocalizationDischargeCleanupD4c7a.ts`

- Care-setting presentation filter for ambulatory MDM chrome fields
- Authored-document locale resolver (locale ≠ jurisdiction)
- Ambulatory high-value fragment key remap
- Legacy English → French explicit refresh helpers
- Omit empty hidden ambulatory fields on persist
- Forbidden ClinicMDM / ClinicDischarge fork names

### Web

- `ProviderDocumentationWorkspace` — hide ambulatory chrome; ambulatory MDM options; Apply French banner
- `providerDocumentationMdmTemplateCatalog` — encounter-mode aware options / insert targets
- `ClinicCareAmbulatoryDischargeWorkflow` — D4C.7 section only (closure card unmounted)
- i18n: `providerDocumentationMdmHighValueAmbulatory` + `clinicCareD4c7a.*` (EN/FR mirrored)

## Language authority

Typed authored-document language context: app / authored locale, care setting, workspace mode, template id. Facility.country remains jurisdiction only.

## Non-regression

| Surface | Expectation |
|---------|-------------|
| Clinic diagnosis / suggestion / facility name | Unchanged (D4C.7) |
| No ED wording in Clinic discharge | Unchanged |
| FR save / sign / print / Summary | Unchanged paths |
| ED Med Eval fields | Clinical rationale + immediate actions still present |
| Hospital / Observation | Unchanged |

## Migration

**None.**

## Phase

Phase 1 Clinic MVP. French UI via i18n. Enterprise documentation constitution — reuse, do not fork.
