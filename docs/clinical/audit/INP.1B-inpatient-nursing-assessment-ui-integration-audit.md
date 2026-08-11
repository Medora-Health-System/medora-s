# INP.1B audit — inpatient nursing UI integration

## Verdict and pre-change path

The INP.1A database-free authority was present, but `InpatientNursingAssessmentSection` mounted `EmergencyNursingReassessmentPanel`. Its editable inpatient presentation therefore used the ED `erNursingReassessmentV1` path while the dedicated POST/GET inpatient endpoints and typed projections had no production UI consumer. The nursing navigation already exposed a nursing destination, patient longitudinal history remained `Patient.clinicalHistoryProfileJson`, and allergies remained its governed enterprise section.

## Reuse decision

The versioned INP.1A schema, dedicated controller/service, immutable `EncounterClinicalEvent` history, server attribution, typed history writers, existing navigation, i18n framework and patient allergy authority are reused. The ED panel/grid are untouched. No Prisma model, migration, or seed is required.
