# MEDUI.INP.2C — Implementation notes

## Scope

Finalize inpatient Nursing Assessment bedside UX without rewriting INP.1B.6 persistence.

## Changes

1. **Board rapid UX** — option rows (≤8) use chip buttons with `aria-pressed`; empty = Not charted (no auto-WNL). Larger catalogs keep `<select>`.
2. **Draft vs history** — ACTIVE DRAFT column chrome; historical columns `aria-readonly` + HISTORICAL label; Discard draft.
3. **Copy Previous** — amber cells + “Copied — verify before saving” EN/FR; marker clears on edit.
4. **Nursing Summary** — concise group lines via `buildSummaryLines`; empty sections omitted; significant lines emphasized.
5. **Context rail** — `NursingAssessmentContextRail` (`data-persistence="none"`) from local board values + deep links; no second API fan-out.
6. **Overview** — explicit admission baseline vs latest assessment mobility pairing.
7. **i18n** — `inpatientNursingAssessmentInp2c.{en,fr}` + board labels via `t()`.

## Unchanged

- INP.1A POST/GET + `clinicalDocumentedAt` validation  
- Event namespace / legal record  
- RN/ADMIN write · Provider read-only  
- I&O / device enterprise authorities (Hub deep-link only)  
- MAR / Care Plan / Discharge / Nursing Admission engines  

## Prisma

NONE
