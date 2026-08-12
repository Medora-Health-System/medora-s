# INP.1B.5 shared nursing documentation board — audit

## Verdict

The INP.1A API already supports an append-only assessment per save and is sufficient for hourly columns without Prisma work. The former inpatient tab/configuration UI was therefore replaceable without changing clinical authority. The ED board is mature but its concrete grid is coupled to ED schemas, trauma and the mutable bedside triage side-write; only its presentation and interaction contract are safe to generalize.

## Exact reuse matrix

| ED UI feature | ED implementation | Reusable as shared UI? | ED-specific dependency | Inpatient adapter required? |
|---|---|---:|---|---:|
| Horizontal flowsheet columns | `EmergencyNursingDocumentationGrid` CSS grid, persisted columns plus active form | Yes: layout/column contract | `ErNursingReassessmentEventColumn` | Yes |
| Column date, time, status, author | Grid header/footer and performer snapshot | Yes | ED event shape and “current session” semantics | Yes |
| Editable rightmost column | Grid binds active `ErNursingReassessmentForm` through `onPatch` | Yes | ED form schema | Yes |
| Read-only history | Event columns are values, never write targets | Yes | `/nursing-reassessment-events` payload | Yes |
| Add column/session | Panel save/new-session callbacks | Yes: action affordance | ED session/current-column mutation rules | Yes; INP.1A makes every save a new event |
| Local draft | ED panel sessionStorage key and server freshness comparison | Pattern only | ED-specific key, trauma and triage slices | Yes; not reused in this phase |
| Structured dropdown rows | ED option catalogs and grid row descriptors | Yes: generic row rendering | ED airway/ABC/trauma vocabulary | Yes; inpatient row catalog |
| WNL selection | ED canonical select options | Yes | ED canonical codes | Yes; explicit inpatient codes, no implicit normal |
| Trauma rows | ED primary/secondary survey props | No | ED trauma namespace | No; excluded |
| Bedside triage safety | Triage slice and side-write callback | No | ED triage persistence/concurrency | No; excluded |
| Narrative generation | Structured fragment builder and manual-text fence | Pattern reusable | ED field set and translated fragment templates | Yes; inpatient manual narrative remains verbatim |
| Nursing Summary sidebar | ED preview model/accent sections | Yes: presentation | ED preview model, vitals/trauma sections | Yes; inpatient concise projection |
| Summary projection | `emergencyVisitSummaryModel` consumes ED events | No authority reuse | ED Summary adapter | Yes; existing inpatient clinical-record adapter |
| Patient Chart projection | ED clinical-record adapter | No authority reuse | ED event discriminator | Yes; `projectPatientChartInpatientAssessment` |
| Print/export projection | ED legal-record projection | No authority reuse | ED record shape | Yes; `projectPrintExportInpatientAssessment` |

## Inpatient authority audit

`InpatientNursingAssessmentPanel` previously embedded a large `sections` configuration and navigation tabs. It loaded the latest `Encounter.nursingAssessment.inpatientNursingAssessmentV1` plus immutable event history. `POST /encounters/:id/inpatient-nursing-assessments` validates client clinical content, derives identity/time on the server, updates the latest encounter snapshot, and appends `NURSING_ASSESSMENT_SAVED`. `GET /encounters/:id/inpatient-nursing-assessment-events` filters the event namespace and returns oldest-first authoritative entries.

The shared package already exposes one clinical-record adapter and aliases for Inpatient Summary, Patient Chart and print/export. Overview projects from the latest saved snapshot; it does not persist separately.

## Isolation findings

ED persistence, local draft keys, triage concurrency, trauma survey, ESI and disposition are not imported by the inpatient adapter. Observation components and persistence are untouched. Provider access reaches the read endpoint but server POST authorization remains RN/Admin only.
