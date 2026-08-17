# MEDUI.INP.2C.1 — Implementation notes

## Scope

Correct PR #137 / INP.2C Nursing Assessment UX regression without changing INP.1A/1B.6 persistence.

## Changes

1. **Removed** `NursingAssessmentContextRail` and the two-column Assessment layout that squeezed historical columns.
2. **Restored** `<select>` dropdown documentation for structured option rows (removed `CHIP_MAX` rapid chips).
3. **Board width** — Nursing Summary is a compact card **above** the flowsheet; the board uses full content width with horizontal scroll (`minmax(180px)` columns).
4. **Clinical Documentation** button kept; Hub `onClose` / `onEntriesChanged` refresh Nursing Summary + workspace bootstrap.
5. **Nursing Summary** projects assessment findings **plus** enterprise I&O / devices / oxygen documentation (read-only via `projectClinicalDocumentationSummaryLines`).
6. **Overview** devices module projects IV + EDOC.17 inventory when present (no longer hard-coded UNSUPPORTED); I&O remains synthesis projection.
7. Rail-specific i18n keys removed.

## Unchanged

- INP.1A POST/GET + clinicalDocumentedAt validation  
- Add Column / Copy Previous / Discard / Save  
- RN/ADMIN write · Provider read-only  
- Nursing Admission / MAR / Care Plan / Discharge / ED / Observation engines  

## Prisma

NONE
