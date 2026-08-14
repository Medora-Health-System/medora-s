# MEDUI.D5A.3 — Enterprise Dental Encounter Workspace

Dental is a **service-line projection** over enterprise Patient + Encounter.

## Canonical route

`/app/dental/encounters/:encounterId`

- OPEN Dental-tagged encounter → `EnterpriseDentalEncounterWorkspace`
- CLOSED → `EnterpriseClosedEncounterViewer` (D4C.8A/8B)
- Non-dental encounter → refuse Dental shell; link to generic encounter

## Dental tag (zero-schema)

`nursingAssessment.dentalServiceLineV1 = { careSetting: "DENTAL", serviceLine: "DENTAL", specialty, certificationId }`

## Active sections (reuse)

Overview · Medical History · Dental Evaluation (provider documentation) · Diagnoses · Imaging · Prescriptions · Notes · Consents · Follow-up · Summary

## Placeholders

Odontogram (D5A.4) · Periodontal (D5A.6) · Treatment plan / Procedures (D5A.5)

## Worklist

`GET /dental-care/worklist` — OPEN OUTPATIENT encounters filtered by dental tag.

## Non-goals

No DentalPatient / DentalEncounter / DentalOrder / DentalPrescription / DentalFollowUp / DentalLifecycleService.
