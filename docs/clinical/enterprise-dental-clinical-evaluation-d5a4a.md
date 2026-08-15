# MEDUI.D5A.4A — Enterprise Dental Clinical Evaluation

**Status:** Implemented locally — not committed / not deployed  
**Branch:** `d5a4a-enterprise-dental-clinical-evaluation`  
**Base:** `main` @ `1a1dea29e`

## STOP GATE 1 (audit)

Dental → Évaluation mounted `ClinicCareAmbulatoryMedicalEvaluationPanel` → `ProviderDocumentationWorkspace` (AMBULATORY) with the full medical complaint/MDM template catalog. That is why chest pain, ECG, smoking cessation, etc. appeared.

Persistence for provider documentation is enterprise `Encounter` + `nursingAssessment` + sign columns. D5A.4 `ToothFinding` remains tooth authority. No parallel DentalNote required.

## Implementation

- Replaced Evaluation presentation with `EnterpriseDentalClinicalEvaluationPanel`
- Structured zero-schema JSON: `nursingAssessment.dentalClinicalEvaluationV1`
- Bridges to `physicianEvalV1` + chiefComplaint/providerNote/treatmentPlan for enterprise sign/summary
- Signs via existing `POST .../sign-provider-documentation`
- History / diagnoses / imaging / odontogram unchanged (enterprise reuse)
- Fixed odontogram legend `PLANNED` → `dentalCareD5a4.states.PLANNED`

## Out of scope (hard stop)

D5A.5 Treatment Plan / Procedures · D5A.6 Periodontal · CDT catalog · DentalPatient
