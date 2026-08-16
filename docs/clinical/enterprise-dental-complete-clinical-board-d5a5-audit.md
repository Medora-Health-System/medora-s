# MEDUI.D5A.5 — Audit / Reuse Map

**Date:** 2026-08-15  
**Branch:** `d5a5-enterprise-dental-complete-clinical-board`  
**Base:** `d4c10d-enterprise-active-visit-routing` @ `200ca70dc`

## Governing rule

ONE FACILITY → ONE REGISTRATION → ONE PATIENT/MRN → ONE ENTERPRISE MEDICAL RECORD → MANY SERVICE-LINE ENCOUNTERS.

## Reuse map

| Domain | Class | Decision |
|--------|-------|----------|
| Odontogram / ToothFinding | A | Keep; multi-select + bulk create |
| Dental Evaluation D5A.4A | A | Preserve save/sign |
| Periodontal | C→F | `DentalPeriodontalExam` + site measurements |
| Treatment Plan | C→F | `DentalTreatmentPlan` + items (not `Encounter.treatmentPlan` free-text) |
| Procedures | C→F | `DentalProcedureRecord` |
| Diagnoses | E | Enterprise `Diagnosis` |
| Imaging / Orders / Results | E | Existing panels |
| Prescriptions | E | Ambulatory Rx panel |
| Notes / Documents | E | Encounter notes + RegistrationDocumentCenter |
| Follow-up | B→E | Encounter `followUpDate` + Overview surface |
| Overview | B→A | Projection over all domains |
| Chart-export / print | E | Extend enterprise export |
| Sign / close / PMR / AuditLog | E | Extend audit actions only |
| Forbidden | — | No DentalPatient / DentalEncounter / CDT catalog |

## Clinical sources (design guidance)

- AAP periodontal exam parameters (six-site probing, BOP, recession, mobility, furcation)
- Clinician-authored staging/grading (no auto-diagnosis from numbers)
- Medora-owned plan/procedure clinical labels (not licensed CDT descriptors)

## D4C.10D preservation

Keep claim-or-start and ownership blockers; extend counts for perio / plan / procedure ownership.
