# MEDUI.D5A.3 — Dental Encounter Workspace Audit

**Prerequisites:** D5A.1, D5A.2, D4C.7K, D4C.8A–C on main  
**Mode:** Thin Dental care-setting projection. No DentalPatient / DentalEncounter / Dental* engines.

## Reuse unchanged

| Domain | Authority |
|---|---|
| Patient | Enterprise Patient |
| Encounter | Enterprise Encounter (OUTPATIENT + dentalServiceLineV1 tag) |
| Lifecycle | D4C.7K close/reopen |
| Closed record | D4C.8A Viewer + D4C.8B ClinicalRecord |
| Documentation | ProviderDocumentationWorkspace (AMBULATORY) |
| Diagnoses | EncounterDiagnosticsPanel |
| Imaging / orders / results | EmergencyErOrdersPanel / EmergencyResultsPanel |
| Rx | ClinicCareAmbulatoryPrescriptionPanel (outpatient; no MAR) |
| Notes | EmergencyErNotesPanel |
| Documents | EnterpriseDocument / RegistrationDocumentCenter pattern |
| Follow-up | Encounter followUpDate + FollowUp APIs |
| Access | D5A.2 DentalCareShell + DentalCareReadAccessGuard |

## Thin projection (D5A.3)

- Canonical route `/app/dental/encounters/:encounterId`
- `EnterpriseDentalEncounterWorkspace` shell + section nav
- Dental service-line tag in `nursingAssessment.dentalServiceLineV1` (zero-schema)
- Worklist from OPEN encounters filtered by that tag
- Placeholders: odontogram, periodontal, treatment plan → D5A.4+

## Architectural forks (STOP)

DentalPatient · DentalEncounter · DentalOrder · DentalResult · DentalPrescription · DentalFollowUp · DentalMedicalRecord · DentalLifecycleService · DentalClosedChart

## Deferrals

D5A.4 odontogram · D5A.5 treatment plans · D5A.6 perio · D5A.7+ ortho · D5A.9 image associations · D5A.10 billing/consents depth
