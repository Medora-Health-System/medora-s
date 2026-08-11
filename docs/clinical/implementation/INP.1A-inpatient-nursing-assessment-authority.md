# INP.1A implementation

## Persistence and history

`Encounter.nursingAssessment.inpatientNursingAssessmentV1` holds the latest typed snapshot. Each save atomically appends a `NURSING_ASSESSMENT_SAVED` clinical event containing the complete versioned snapshot. Event rows are the chronological legal-history source; the latest JSON is a reload/read optimization, not a substitute for history.

`POST /encounters/:id/inpatient-nursing-assessments` validates client clinical content with a strict schema. Identity, role, session UUID and time are generated on the server. `GET /encounters/:id/inpatient-nursing-assessment-events` is inpatient-only, facility/patient/encounter scoped, and namespace filtered.

The typed adapter `adaptInpatientNursingAssessmentToClinicalRecord` is the single contract for Inpatient Summary, patient chart and print/export. Overview uses `projectInpatientNursingAssessmentOverview`; neither projection persists a copy or exposes an untyped JSON root.

## Longitudinal patient history

`PATCH /patients/:id/clinical-history-profile/sections/:section` accepts only PMH, PSH, home medications, tobacco, alcohol, substances, or social history typed shapes. It merges into `Patient.clinicalHistoryProfileJson`, adds server provenance, actor and timestamp, and writes a PHI-light audit record containing identifiers and section/result—not clinical bodies. RN, Provider and Admin are authorized by server roles; PCT, RT, billing and unrelated roles are not.

An optional encounter ID must belong to the same patient and facility. The operation never updates an Encounter, so ED legal snapshots and `admissionSummaryJson.medSurgNursingAdmissionV1` admission snapshots remain unchanged. Future readers and Patient Summary continue to consume the patient profile.

## Explicit exclusions

No care-plan mutation, discharge lifecycle, specialty extension, provider workflow, migration, seed, background rewrite or full inpatient assessment UI is included.
