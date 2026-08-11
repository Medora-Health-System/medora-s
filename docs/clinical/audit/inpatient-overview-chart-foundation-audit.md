# Inpatient Overview chart foundation audit

## Verdict and root cause

The repository already had most of the required **read-only inpatient projection foundation**. `ClinicalSynthesisService` type-gates reads to `INPATIENT`, queries encounter, vital, order/result, diagnosis, documentation, nursing-admission, care-team, consult, and discharge sources, and feeds a typed shared projector. `projectInpatientOverview` and `InpatientOverviewView` already provided a care-setting-specific operational view. No schema work is justified.

The production defect was composition, not persistence: the `overview` switch mounted `EnterpriseProviderClinicalWorkspaceD4b8` before the purpose-built overview. That enterprise component is a governance/composition workbench, so internal boundary and projection text became the first clinician-facing content. It remains available to its provider documentation surfaces, but is no longer mounted by Overview.

The nursing-navigation defect was ordering. The admission route and shell existed and were allowed, but Admission was sixth in a non-wrapping, horizontally scrollable strip. On ordinary widths it was outside the immediately visible portion. The active renderer is `InpatientActiveWorkspaceView` -> `InpatientWorkspaceSectionNav`, not the broad section catalogue. Admission and Assessment now follow Overview in both the shared role policy and rendered RN sticky catalogue.

## Existing engines and reuse decision

* `ClinicalSynthesisService.buildProviderProjection` is the current enterprise, read-only inpatient record projection. It rejects Emergency and Observation encounter types.
* Shared projectors in `@medora/shared` own vital trends, lab lines, radiology, medication snapshot, I/O, discharge readiness, provider workspace slices, typed nursing admission readers, and clinical-ops readers.
* `projectInpatientOverview` is the inpatient operational adapter. It does not persist.
* `InpatientOverviewView` is inpatient-only presentation.
* `EnterpriseHospitalPatientHeader` owns authoritative identity, encounter, location, allergy, code-status, isolation, and the latest header snapshot.
* `InpatientAdmissionClinicalShell` and the connected admission cards are a substantial, persisted workflow, not a placeholder. Section drafts and completion live in the encounter admission summary through versioned typed readers/writers; completion also links applicable enterprise documentation records.
* Emergency `EncounterClinicalRecord` remains an Emergency adapter/UI. This phase reuses neutral shared projector invariants and authoritative domain persistence; it does not import ED Summary UI or create a second clinical-record store.

## Overview authority/source matrix

| Section | Field | Authoritative source | API / reader | Status before | Foundation fix/status | Summary connection | Patient-record connection |
|---|---|---|---|---|---|---|---|
| Header | name, MRN, DOB/age, sex | Patient joined to Encounter | inpatient bootstrap -> `EnterpriseHospitalPatientHeader` | Available | Retained in authoritative header; not duplicated | Encounter identity | Patient chart identity |
| Header | admitted time, hospital day, LOS | `Encounter.admittedAt` | bootstrap + `computeProviderHospitalDay` / `computeProviderLosHours` | Available | Retained/projected | Encounter chronology | Encounter episode |
| Header | room/bed/unit | encounter room plus canonical bed key | bootstrap + `resolveEncounterCanonicalBedKey` | Available | Retained in header | Encounter location | Episode location |
| Safety | allergies | enterprise allergy persistence | bootstrap/header allergy reader | Available | Retained in safety header | Shared clinical domains | Patient allergy record |
| Safety | code status | inpatient clinical ops in admission summary | `resolveAuthoritativeCodeStatus` | Available | Retained in safety header | Clinical-ops record | Encounter record |
| Safety | isolation | inpatient clinical ops in admission summary | `resolveAuthoritativeIsolation` | Available | Retained in safety header | Clinical-ops record | Encounter record |
| Admission | diagnosis/reason | active Diagnosis; provider primary problem fallback | synthesis diagnosis query | Available | Primary diagnosis projected read-only | Shared diagnosis domain | Diagnosis history |
| Admission | nursing admission completion | typed Med/Surg nursing admission + clinical ops | nursing admission API / `computeAdmissionCompletionSummary` | Available but nav obscured | Visible RN nav; Overview reads completion on reload | Admission documentation | Encounter admission packet |
| Current state | pain, fall risk, skin/wounds | linked authoritative documentation entries referenced by nursing admission | authoritative clinical projection endpoint | Partial by domain | Typed states render; unresolved synthetic data is not presented as fact | Documentation entries | Clinical documentation timeline |
| Current state | latest/prior vital and trend | active `TriageVitalsReading` rows | `projectProviderVitals` | Available | Typed current/prior/trend rows retained | Vital domain | Patient vital history |
| Current state | I/O | non-voided encounter documentation entries | `projectIntakeOutputSynthesis` | Partial | Render only when documented | Documentation entries | Encounter documentation |
| Current state | devices | device workflows do not yet expose a stable Overview projector | none | Unsupported | Omitted/marked unsupported internally; no invented values | Future phase | Future domain connection |
| Problems/plan | active problems and assessment | active Diagnosis + provider workspace problem plans | synthesis + typed provider workspace reader | Available | Read-only projection; no Overview mutation | Provider legal record | Diagnosis/problem history |
| Results | pending/abnormal/critical results | OrderItem Result | `projectLabLines`, `projectRadiologyStudies` | Available; legacy free-text results possible | Structured typed rows and acknowledgment state; no JSON renderer | Enterprise Results | Result history |
| Medications | active/held medication orders | enterprise Order/OrderItem lifecycle | `projectMedicationSnapshot` | Available | Reuses snapshot; Overview does not implement MAR persistence | Enterprise medication/MAR domains | Medication history |
| Work | critical/today/upcoming tasks | provider workspace task slices | `attachWorkspaceSlices` | Available | Role-aware attention module | Workspace record | Encounter timeline where emitted |
| Nursing | last shift assessment | inpatient clinical ops | provider workspace API / typed clinical ops reader | Available when recorded | Nursing/Chart roles see timestamp and deep links | Clinical ops | Encounter record |
| Care team | attending/provider/resident/APP | Encounter assignment + active care-team history | synthesis identity resolver | Available | Normalized clinician display; unknown IDs are not shown as clinicians | Encounter/care-team record | Episode care team |
| Consults | active/completed consults | inpatient clinical ops consult collection | typed clinical ops reader + synthesis | Available | Active specialties and completion events | Clinical ops | Encounter event history |
| Discharge | state, EDD, destination, barriers | inpatient discharge planning clinical ops | `projectDischargeReadiness` | Available when documented | Read-only readiness projection | Discharge planning record | Episode disposition history |
| Events | significant events | provider workspace clinical events plus derived read-only critical/consult events | `attachWorkspaceSlices` | Available | Chronological localized type/status labels; narrative unchanged | Encounter chronology | Event/history projection |
| Summary | complete legal-record packages | authoritative encounter domains/provider print package | provider print/package readers | Partial | Shares sources; Overview remains operational and non-persistent | Legal record projection | chart export/print pathway |

## Raw JSON and stale-field findings

The Overview view does not stringify or render admission, assessment, care-plan, discharge, device, medication, or event JSON. Typed readers sit at API/shared boundaries. Results are projected as typed lab/radiology rows, although historic `Result.resultText` remains a clinician-authored/free-text compatibility field and may not always have discrete unit/reference-range elements. Inventing those elements or parsing arbitrary concatenated strings is unsafe; completing structured result normalization is a residual Results-domain task. Device state similarly lacks a certified Overview read model.

Pain discrepancies were caused by distinct sources: admission pain, current vital pain, and linked nursing documentation. The projection keeps those concepts separate. BP/weight appear only when active vital readings contain them; it does not promote a previous reading to “current.”

## Boundaries and missing domains

* Exact ED boundary: no files below `features/emergency` or `/app/emergency/**` are changed, no inpatient presentation is imported there, and the synthesis API rejects any encounter whose type is not `INPATIENT`.
* Observation retains its existing independent route and is not classified as inpatient.
* The same adapter accepts unit/service metadata without Med/Surg branching. ICU, pediatric, OB/GYN, and behavioral-health metadata therefore use the same renderer; specialty modules remain future extensions.
* RN attribution and admission timestamps are preserved within versioned admission section audit data, but the current compact nursing Overview contract exposes completion and last-assessment time only. A richer attribution/timestamp projection is a follow-up rather than duplicate storage.
* Not yet certified for the Overview: device snapshot, comprehensive MAR due/overdue/pharmacy state, structured result units/reference ranges for legacy text, complete consult assignee roles, and comprehensive longitudinal print inclusion.
