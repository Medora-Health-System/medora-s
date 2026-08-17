# MEDUI.INP.2C.1 — Nursing Assessment workflow restoration audit

**Branch:** `inp2c1-nursing-assessment-workflow-restoration`  
**Base:** `origin/main` @ `48bd7d23e` (includes PR #137 / INP.2C)  
**New persistence:** NO · **Prisma:** NO · **Migration:** NONE

## Root cause (PR #137)

1. **`NursingAssessmentContextRail`** mounted beside the board → outer `auto-fit` two-column layout halved flowsheet width.
2. **Rapid chips** (`CHIP_MAX = 8`) replaced `<select>` for all inpatient option rows (3–8 options) → tall wrapping draft cells, unusable longitudinal scan.
3. Board already had an inner Nursing Summary sidebar → **duplicate summary** (board + rail).

## Correction matrix

| Domain | Current authority | Current UI | Problem | Correct UI | Persistence | Change | Duplicate risk |
|---|---|---|---|---|---|---|---|
| Assessment board | INP.1B.6 | `NursingDocumentationBoard` | Chips + squeezed columns | Sticky finding + scrollable saved columns + `<select>` | INP.1A JSON/events | Fix | None |
| Assessment context rail | INP.2C only | `NursingAssessmentContextRail` | Steals width; duplicates summary | **Remove** | none | Remove | None |
| Nursing Summary | Projection | Board `SectionSummary` | Empty of Hub I&O/devices | Sticky 360–400px **latest** rail (not Assessment Context) | none | Extend projection | Do not copy into assessment |
| Clinical Documentation Hub | EDOC | Hub button INPATIENT | Keep | Keep; refresh summary/Overview on close | EDOC entries | Fix refresh | None |
| I&O | EDOC.5 | Hub + Overview synthesis | Not in Nursing Summary | Project into Summary + Overview | EDOC only | Projection | No second ledger |
| Devices | EDOC.17 | Hub; Overview UNSUPPORTED | Not in Summary/Overview | Project active inventory when available | EDOC only | Projection | No second inventory |
| Overview assessment | INP.1A projector | Overview nursing block | Keep admission vs assessment | Keep + Hub projections | none | Extend reads | None |
| Roles / clinical time | INP.1A/1B.6 | API + UI | Intact | Preserve | unchanged | Keep | None |

## INP.1B.6 invariants (must not weaken)

Horizontal immutable columns · sticky Clinical Finding · Add Column · Copy Previous · copied clear-on-edit · clinicalDocumentedAt vs server authoredAt · RN/ADMIN write · Provider read-only · Assessment ≠ Admission · no second store.

## Nursing Summary placement

Operator target (INP.2C.1 layout): **right rail 360–420px**, sticky, latest clinical picture only (assessment + Clinical Documentation projections). **Not** the retired Assessment Context rail (`auto-fit minmax(260px, 1fr)` + Open orders/MAR/results).

Board column uses `minmax(0, 1fr)` so historical columns keep horizontal scroll. Nursing Note is full-width below both columns. `clinicalDocumentedAt` is shared with the note Date/Time control.
