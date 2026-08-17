# MEDUI.INP.2C.1 — Implementation notes

## Scope

Correct PR #137 / INP.2C Nursing Assessment UX regression without changing INP.1A/1B.6 persistence. Operator target layout (INP.2C.1 continuation): longitudinal board left, Nursing Summary right, nursing note full-width below.

## Changes

1. **Removed** `NursingAssessmentContextRail` (orders/MAR/results context). Do not resurrect it.
2. **Restored** `<select>` dropdown documentation for structured option rows (removed `CHIP_MAX` rapid chips).
3. **Layout** — `minmax(0, 1fr)` board + sticky **360–400px** Nursing Summary (latest) rail. Historical columns keep horizontal scroll because the board column can shrink. Nursing Note spans full width below both columns.
4. **clinicalDocumentedAt** is edited in the nursing-note Date/Time control and is the same field on the ACTIVE DRAFT; save posts the existing INP.1A payload (server `authoredAt` unchanged).
5. **Clinical Documentation** remains in the board header. **Open I&O** / **Open devices** open the same inpatient Hub (`io_intake_output` / `peripheral_iv_assessment` focus). Hub `onClose` / `onEntriesChanged` refresh projections.
6. **Nursing Summary** is a read-only latest **saved** picture plus enterprise I&O / devices / oxygen projections (`projectClinicalDocumentationSummaryLines`). No duplicate persistence.
7. **Nursing Note** binds `draft.narrative` (max 8000, existing schema). Save nursing note uses the same POST as Save assessment.
8. **Overview** devices module projects IV + EDOC.17 inventory when present; I&O remains synthesis projection.
9. Rail-specific i18n keys remain removed; note/summary-latest keys added (EN/FR mirrored).

## Unchanged

- INP.1A POST/GET + clinicalDocumentedAt validation  
- Add Column / Copy Previous / Discard / Save  
- RN/ADMIN write · Provider read-only  
- Nursing Admission / MAR / Care Plan / Discharge / ED / Observation engines  

## Prisma

NONE
