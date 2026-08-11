# ED clinical notes → Summary → legal record audit

## Verdict and root cause

The authoritative persistence paths already existed and no Prisma change was required. The defect was a projection split: the legacy `EmergencyVisitSummaryPanel` rendered `encounter.encounterNotes`, while the enabled enterprise `EncounterClinicalRecord` projection did not model those rows. Consequently provider, nursing, technician, other, legacy, amended, cosigned, and voided encounter notes could disappear specifically from Summary V2 even though the Notes registry, patient chart, and chart export retained them. The remediation adds the rows to the centralized clinical-record projection and its screen/print renderers; it does not copy or dual-write note text.

Nursing reassessment narrative was separately audited. `EmergencyNursingReassessmentPanel` serializes the Notes field through `emergencyNursingReassessmentV1`; PATCH persistence writes the encounter state and the API creates an immutable `NURSING_ASSESSMENT_SAVED` event. Summary loads `/encounters/:id/nursing-reassessment-events`, parses each snapshot, and projects `narrativeSummary` with event performer and documented/save time. The clinical record and print packet preserve every event chronologically. Historic columns are read-only and a new editor draft is separate from persisted event snapshots.

## Source-to-summary matrix

Disposition meanings: **FULL** = verbatim narrative; **STRUCTURED+NARRATIVE** = typed clinical projection plus verbatim narrative; **REFERENCE** = event row/metadata; **EXCLUDED** = no implemented legal narrative.

| Source | Persistence owner | Save endpoint / mutation | Author/signature owner | Summary reader | Patient-record reader | Disposition / current status | Gap / finding |
|---|---|---|---|---|---|---|---|
| Chief complaint | `Encounter.chiefComplaint` / triage | triage/encounter mutation | persisted triage/encounter attribution where available | visit model + clinical-record adapter | chart-summary encounter | FULL, included | Legacy records can lack attribution |
| Triage narrative/additional context/arrival fields | `TriageAssessment` typed fields | triage save | triage saved user/time | triage preview → adapter | chart summary/export triage | STRUCTURED+NARRATIVE, included | Lifecycle has saved state, not a general amendment model |
| Initial nursing assessment narrative | `Encounter.nursingAssessment.nursingEvalV1` | encounter PATCH | stored nursing signature | initial nursing summary adapter | chart summary/export nursing assessment | STRUCTURED+NARRATIVE, included | Latest-state JSON; destructive correction governance remains limited |
| Nursing reassessment Notes | encounter JSON plus immutable `EncounterClinicalEvent` snapshot | encounter PATCH | event performer id/name/role and event timestamps | reassessment-event reader → clinical record | chart summary and export event readers | STRUCTURED+NARRATIVE, included | None in projection after remediation; legacy fallback may lack immutable user id |
| Provider documentation (HPI/ROS/exam/MDM/assessment-plan) | provider documentation slice in encounter nursing JSON/status columns | encounter PATCH/sign mutation | persisted save/sign metadata | provider documentation model → adapter | chart/export encounter reader | STRUCTURED+NARRATIVE, included | Save history is event-backed; older versions may have partial metadata |
| Provider MSE/progress history | `EncounterClinicalEvent` | provider MSE save | immutable event performer/time | documentation-history adapter | timeline/chart export events | STRUCTURED+NARRATIVE, included | Status vocabulary is SAVED/DRAFT; no invented amendment semantics |
| Provider/Nursing/Technician/Other Notes registry | relational `EncounterNote` | `POST /encounters/:id/notes` | immutable `authorUserId` plus name/role snapshots, creation time | **now** adapter → `EncounterClinicalRecord.narrativeNotes` | chart-summary service + patient chart | FULL, included | **Previously omitted from Summary V2** |
| Legacy ER Notes | `Encounter.nursingAssessment.erNotesV1` | historical encounter mutation; now read-only compatibility | legacy snapshots when available | API compatibility rows → narrative-note projection | chart summary/export compatibility reader | FULL, included | Legacy author user id may be unavailable |
| Note amendment | append-only `EncounterNote`, linked by `amendedFromNoteId` | notes amend endpoint | amendment author snapshots/time | narrative-note projection | chart/export legal mapper | FULL, included with status/reason/link id | Original remains; UI does not yet draw a visual linkage graph |
| Note void / entered in error | original `EncounterNote` retained with void metadata | notes void endpoint | voiding user id/time | narrative-note projection | chart/export legal mapper | FULL, retained and labelled/struck | Body is retained as legal history |
| Note cosign | `EncounterNote` cosign metadata | notes cosign endpoint | cosigner id/role/time | narrative-note projection | chart/export legal mapper | FULL, labelled | Projection currently exposes cosign time, not cosigner display name because source row lacks it |
| Procedure documentation (ECG, wound/splint and catalog procedures actually documented) | procedure record | procedure documentation mutation | documented/performed-by snapshots and times | procedure adapter | chart export | STRUCTURED+NARRATIVE, included | Only implemented procedure records are projected |
| Nursing handoff | `erHandoffV1` and `HANDOFF_NURSING` clinical events | handoff save | event performer/time | visit model/history | chart timeline/export | STRUCTURED+NARRATIVE, included | No separate technician handoff type found |
| Disposition/transfer supplement | encounter disposition supplement + clinical event | disposition save | stored signature/event performer | disposition adapter/history | chart/export encounter | STRUCTURED+NARRATIVE, included | Amendment lifecycle not generalized |
| Provider discharge documentation | encounter discharge JSON | provider discharge save | stored metadata/signature when present | visit model/disposition projection | chart/export | STRUCTURED+NARRATIVE, included | Historical versions tolerate missing metadata |
| Nursing discharge execution | encounter nursing/discharge JSON | nursing discharge save | stored execution attribution | visit model | chart/export | STRUCTURED+NARRATIVE, included in legacy Summary | Enterprise record folding remains disposition-oriented |
| Admission/observation/transfer documentation | admission summary JSON + clinical events | admission/observation mutations | stored event performer/time | admission history | chart timeline/export | STRUCTURED+NARRATIVE, included | Event labels, not invented note types |
| Medication administrations / response represented by implemented MAR record | `MedicationAdministration` | MAR mutation | administered/documented-by metadata | clinical record MAR | chart/export MAR | REFERENCE | No standalone medication-response narrative source was found in ED Summary inputs |
| Order comments | order workflow data | order mutation | order attribution | order row | chart/export order | EXCLUDED | No ED legal narrative field is implemented; do not indiscriminately chart operational comments |
| Clinical-documentation cards/scores | clinical documentation events | card save/void | event author/time | Summary structured card renderer | clinical event/timeline | STRUCTURED+NARRATIVE where card schema exposes it | Card-specific payloads remain typed; arbitrary JSON scraping rejected |

## Inventory conclusions

No separate implemented ER-tech free-note store, consultation-note store, restraint narrative, interpreter note, critical-care free-note, or universal AMA/refusal note table was found. When clinicians document those narratives in the implemented Notes registry, provider documentation, procedure documentation, disposition supplement, or event-backed forms, the authoritative owner above is projected. The catalog intentionally does not invent absent note types.

## Scope, chronology, attribution, and lifecycle

* Relational note list/save queries require both encounter id and facility id; stored rows also carry patient and facility ids. The projection additionally rejects a row whose `encounterId` differs from the projected encounter.
* Notes sort by persisted `createdAt`, then stable persisted id; repeated ids deduplicate. Browser/render time and current viewer identity are never used.
* Author user id, display-name snapshot, role snapshot, created time, source id, amendment link/reason, void metadata, and cosign time are retained where persisted.
* Relational notes are append-only. Amendment creates a linked new row; void annotates rather than deletes. The original remains visible. The editor textarea is local draft state and is not projected until saved.
* Clinician body text is emitted verbatim. Only note type/status/metadata labels use EN/FR translations.
* Audit logging uses allowlisted identifiers/metadata and explicitly forbids note body/HPI/MDM keys.

## Record and output chain

`EncounterNote` / event-backed documentation → encounter-scoped API response → centralized `buildEncounterClinicalRecord` projection → `EncounterClinicalRecordSummaryView` → patient chart readers (`ChartSummaryService` and clinical tabs) → clinical record print packet and server chart export HTML. Summary is not persistence and is not the only recovery path.

## Database decision

Prisma schema changed: **NO**. Local migration: **NOT REQUIRED**. Production migration: **NOT REQUIRED**. Seed: **NOT REQUIRED**.
