# MEDUI.D4C.8B — Domain Audit

**Prerequisite:** MEDUI.D4C.8A (PR #116) — CLOSED_READ_ONLY shell, navigation, reopen, lifecycle.  
**Mode:** Composition / presentation only. No new clinical engines. No Prisma migration expected.

## Verdict of audit

Enterprise closed shell (D4C.8A) is identity + lifecycle + reopen only. Full clinical composition today exists mainly as the ED adapter (`EmergencyErSummaryClosureSurface`). D4C.8B must mount an **enterprise**, encounter-scoped clinical composition inside `EnterpriseClosedEncounterViewer` for all care settings.

**Do not use** `GET /patients/:id/chart-summary` (patient-scoped, capped at 10 recent encounters).

## Domain matrix

| Domain | Persistence | API / service | Existing projection | Encounter scope | RO ready | Shape | Reuse | Mutation risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Identity | Encounter + Patient | GET /encounters/:id | Closed viewer header | Yes | Yes | Structured | Shell | Low | Already on shell |
| Chief complaint | Encounter.chiefComplaint / visitReason | GET encounter | Header | Yes | Yes | Free text | Shell | Low | |
| Allergies | Patient clinicalHistoryProfileJson | Patient clinical-history; triage strip | allergiesLine | **Patient** | Partial | Structured/JSON | Strip only | Medium | Show as “at time of viewing”; not encounter-owned history |
| Vitals | TriageVitalsReading + VITALS_RECORDED | GET …/vitals-history | parseVitalsHistoryEntries | Yes | Yes | Structured | ED/closure | Low if GET-only | High priority table |
| Triage | Triage 1:1 | Triage GET / encounter triage fields | ED triage docs | Yes | Partial | Mixed | ED helpers | High if editors | ESI / complaint via encounter |
| Nursing assessment | nursingAssessment JSON | GET encounter | parseNursingAssessmentSectionsForChart | Yes | Yes | Structured JSON | Chart helpers | High if editors | |
| Nursing notes | EncounterNote NURSING | GET …/notes | Narrative note lists | Yes | Partial | Free text | Notes API | Medium | |
| Provider documentation | physicianEvalV1 / workspace | GET encounter | parsePhysicianEvalV1ForChart | Yes | Yes | Structured | Chart helpers | High if workspace | |
| Signed status | providerDocumentationStatus / SignedAt / By | GET encounter | Status lines | Yes | Yes | Structured | Shell | High if unlock | |
| Addenda | EncounterProviderAddendum | GET encounter | erProviderDocumentationSummary | Yes | Yes | Free text | Encounter GET | Medium if POST | |
| Diagnoses | Diagnosis (encounterId required) | Patient diagnoses filtered by encounterId | useEncounterDiagnosisRows | Yes | Yes | Structured | Adapter filter | Medium | |
| Orders | Order / OrderItem | GET …/orders | Order lists | Yes | Yes | Structured | ED/closure | High if entry | |
| Lab results | Result via OrderItem LAB | Orders + ClinicalResultViewer | ClinicalResultViewer | Yes via order | Yes | Text + JSON attachments | Shared viewer | Low display | |
| Imaging | Result via IMAGING_STUDY | same | same | Yes | Yes | same | same | Low | |
| Medication orders | Order MEDICATION | GET …/orders | Med order rows | Yes | Yes | Structured | ED MAR helpers | High | |
| MAR | MedicationAdministration | GET …/medication-administrations | MAR tables | Yes | Yes | Structured | ED helpers | High if write | |
| Procedures | Clinical events / CARE orders | GET …/procedures | Procedure summaries | Yes | Partial | JSON + text | formatDocumentedProcedure* | High | |
| IV access | Clinical events | GET …/iv-access | ErIvAccessSummaryCard | Yes | Partial | Event JSON | ED (optional) | High | Deferred if empty |
| Consultations | MDM free text only | none | Provider MDM | **Cannot prove** | No entity | Free text | — | — | Do not invent section |
| Observation docs | EDOC / reassessment events | clinical-documentation | Obs workspace | Yes when encounterId | Partial | JSON | Future thin | High | Compose via nursingAssessment/EDOC when present |
| Inpatient docs | admissionSummaryJson + events | inpatient nursing events | Inpatient workspace | Yes | Partial | JSON | admission summary parse | High | |
| Disposition/discharge | dischargeSummaryJson + fields | GET encounter | parseDischargeSummaryForChart | Yes | Yes | Structured keys | Chart helpers | High if forms | ≠ CLOSED |
| Prescriptions | PHARMACY_DISPENSE orders + discharge meds | orders + discharge JSON | Order + discharge | Yes | Partial | Mixed | Orders/discharge | High | |
| Follow-up instructions | dischargeSummaryJson | GET encounter | Discharge parse | Yes | Yes | Free text | Discharge | Low | |
| Patient instructions | discharge instruction keys | GET encounter | Discharge parse | Yes | Yes | Free text | Discharge | Low | |
| Attachments | Result.resultData; EnterpriseDocument optional | Results viewer | ClinicalResultViewer | Result yes; EnterpriseDocument nullable | Partial | Metadata | Viewer | Medium | Skip null encounterId docs |
| Lifecycle | EncounterLifecycleTransition | GET …/lifecycle-timeline | EnterpriseEncounterLifecycleTimeline | Yes | Yes | Structured | D4C.8A | Reopen only | Already on shell |

## Reusable ED / shared engines

- `buildEncounterClinicalRecord` (shared types/builder) — optional spine; D4C.8B may compose via existing parse helpers without requiring ED summary flag
- `EmergencyErSummaryClosureSurface` — pattern for parallel encounter-scoped fetches; **do not fork** a ClinicClosedChart
- `ClinicalResultViewer` — mandatory for results presentation
- `parsePhysicianEvalV1ForChart`, `parseNursingAssessmentSectionsForChart`, `parseDischargeSummaryForChart`
- `parseVitalsHistoryEntries` + vitals dual-unit formatters

## Composition contract (implementation)

`EnterpriseClosedEncounterClinicalRecord` mounts inside `EnterpriseClosedEncounterViewer` and loads only:

1. Encounter payload already provided (docs JSON, discharge, addenda, signed meta)
2. `GET /encounters/:id/vitals-history`
3. `GET /encounters/:id/orders`
4. `GET /encounters/:id/medication-administrations`
5. Patient diagnoses filtered to `encounterId`

No chart-summary. No mutation controls. Empty sections show localized “not documented”.
