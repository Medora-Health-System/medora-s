# INP.1A authority audit

## Verdict

The existing inpatient surface is not a write authority: it embeds the ED reassessment engine and writes `erNursingReassessmentV1`. Existing `Encounter.nursingAssessment` JSON and append-only `EncounterClinicalEvent` rows can represent an inpatient-native authority without a Prisma change. `Patient.clinicalHistoryProfileJson` remains the sole current longitudinal history authority.

## Decisions

- **Namespace:** `inpatientNursingAssessmentV1`; the ED namespace is prohibited on the new endpoint.
- **Care setting:** only an `INPATIENT` encounter whose hospital assignment/admission classification resolves to `INPATIENT`. Observation is explicitly excluded because Medora represents it as a distinct hospital care setting even when `Encounter.type` is `INPATIENT`.
- **History:** every save creates a new `NURSING_ASSESSMENT_SAVED` event. No ED 60-minute window and no update/delete of prior events.
- **Compatibility:** an ER-namespaced blob found on an inpatient encounter is returned separately as `LEGACY_ER_NAMESPACE_READ_ONLY`; it is never promoted, rewritten, or used by new writes.
- **Attribution:** authenticated user, active facility roles and server clock are authoritative. Assignment never grants endpoint authorization.
- **Legal state:** this foundation accepts DRAFT/SAVED/SIGNED/FINAL. Each save is immutable; correction/addendum workflow is deferred because no inpatient signature/correction authority exists. A correction must therefore be a new session until that authority is certified.

## Isolation and residual risk

Queries constrain encounter, patient and facility and filter the exact inpatient namespace. ED endpoints, components, summaries, disposition and persistence code were not edited. The legacy inpatient UI remains uncertified and must not be treated as the new endpoint's client; replacement is INP.1B work. No production inspection was performed.
