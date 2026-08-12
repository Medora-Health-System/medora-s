# INP.1B.3 Inpatient Nursing Assessment UX — Authority Audit

## Verdict

The existing INP.1A authority can represent the required assessment without a database change. `Encounter.nursingAssessment.inpatientNursingAssessmentV1` is the latest snapshot and each POST appends an immutable `NURSING_ASSESSMENT_SAVED` `EncounterClinicalEvent`. The JSON authority accepts typed structured findings, so no Prisma, migration, seed, signature, care-plan, ED, or observation change is required.

## Root cause

`InpatientNursingAssessmentSection` composed the native nursing panel inside the enterprise nursing workspace and then appended respiratory therapy, rehabilitation, and Team Execution engines. Each brought its own navigation and governance copy. The defect was route composition, not missing clinical engines.

## End-to-end authority map

| Stage | Authority |
|---|---|
| UI field and chip | `FieldControl`; visible text comes from EN/FR catalogs |
| Draft | `InpatientNursingAssessmentSave.structuredFindings`, plus established projection fields |
| POST | `POST /encounters/:id/inpatient-nursing-assessments` |
| Latest reload | `Encounter.nursingAssessment.inpatientNursingAssessmentV1` |
| Legal history | append-only `EncounterClinicalEvent`, namespace `inpatientNursingAssessmentV1` |
| Overview | `projectInpatientNursingAssessmentOverview` and the assessment Overview tab |
| Summary / Patient Chart / print | the single `adaptInpatientNursingAssessmentToClinicalRecord` adapter and its named exports |
| History | `GET /encounters/:id/inpatient-nursing-assessment-events` |

The client persists canonical codes only; translations never enter the payload. Server code owns identity, role, time, session ID, facility scoping, and event creation.

## Boundaries

RN and Admin retain authoring authority. Provider review is read-only; the POST guard and service reject provider authoring. RT, PT, OT, SLP, and PCT have no authoring grant. Ancillary workspaces and Team Execution remain implemented in their existing files, but are not imported by the Nursing Assessment composition. ED Nursing, Nursing Admission, Observation, pain/device/wound/restraint/I&O authorities, signatures, and INP.2 care-plan persistence are unchanged.
