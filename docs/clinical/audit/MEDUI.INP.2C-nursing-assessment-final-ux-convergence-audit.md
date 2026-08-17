# MEDUI.INP.2C — Audit (reuse matrix)

**Branch:** `inp2c-nursing-assessment-final-ux-overview`  
**Base:** `origin/main` (includes certified INP.2A + INP.2B)  
**New persistence:** NO · **Prisma:** NO

## Reuse matrix

| Feature | Existing authority | UI source | Persistence | Keep / Fix | New persistence? |
|---|---|---|---|---|---|
| Assessment board | INP.1B.6 | `NursingDocumentationBoard` | none (presentation) | Keep + rapid UX | NO |
| Head-to-toe rows | INP.1B.6 | `inpatientNursingBoardRowsInp1b6` | `structuredFindings` JSON | Keep | NO |
| Save / history | INP.1A | Panel → POST/GET | snapshot + `EncounterClinicalEvent` | Keep | NO |
| clinicalDocumentedAt | INP.1B.6 | board datetime-local | JSON field only | Keep + label UX | NO |
| Nursing Summary | Projection | Panel `SectionSummary` | none | Fix concise lines | NO |
| Clinical Hub | EDOC | `ClinicalDocumentationHub` INPATIENT | separate engines | Keep + integrate | NO |
| Right rail | INP.2A pattern | Overview only today | none | Generalize onto Assessment | NO |
| Overview assessment | `projectInpatientNursingAssessmentOverview` | Overview | read-only | Keep + baseline distinction | NO |
| Overview admission | INP.2B | Overview | admission JSON | Keep distinct | NO |
| I&O / devices | EDOC.5 / EDOC.17 | Hub deep-links | enterprise | Keep; no duplicate | NO |
| Roles | RN/ADMIN write | UI + API | same | Keep | NO |

## INP.1B.6 invariants (must not weaken)

Horizontal immutable columns · sticky Clinical Finding · Add Column · Copy Previous · copied clear-on-edit · clinicalDocumentedAt vs server authoredAt/createdAt · RN/ADMIN write · Provider read-only · Assessment ≠ Admission · no second store.

## Gaps addressed in INP.2C

Rapid in-grid chips · draft vs history chrome · copied verify label · concise summary · Assessment context rail (projection-only) · Overview baseline vs current mobility · EN/FR board labels via i18n · no schema.
