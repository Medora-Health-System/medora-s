# ED Nursing Assessment restoration implementation

## Change

The Emergency active workspace now mounts the existing `EmergencyNursingReassessmentPanel` directly for `activeSection === "nursing"`. Existing ED handoff and ED nursing-discharge surfaces follow it. The enterprise multidisciplinary shell and the respiratory, rehabilitation, care-plan, case-management, and provider projections are no longer children of the primary Emergency Nurse Assessment section.

No enterprise implementation was deleted. Observation continues mounting `EnterpriseNursingClinicalWorkspaceD4b2`, and Inpatient continues mounting it through `InpatientNursingAssessmentSection`. Their assignment/authority rules are untouched.

## Reused authoritative behavior

The implementation reuses, without cloning fields:

* `EmergencyNursingReassessmentPanel` for load, draft safety, save, new-session behavior, attribution, trauma/triage context, and summary narrative;
* `EmergencyNursingDocumentationGrid` for catalog-driven dropdown/flowsheet rows, read-only historic columns, editable current column, and legacy rows;
* `emergencyNursingReassessmentV1` for stable JSON codes, serialization/deserialization, legacy normalization, signature, and compatibility columns;
* `PATCH /encounters/:id` and `GET /encounters/:id/nursing-reassessment-events` for the existing authoritative data path.

## Data flow

1. The ED panel merges V1 into `Encounter.nursingAssessment` and PATCHes the encounter.
2. The encounter service records/updates the namespaced `NURSING_ASSESSMENT_SAVED` clinical event according to existing session rules.
3. ED Summary reloads event snapshots through the existing list endpoint and parses them using the same V1 reader.
4. Patient chart/timeline/print readers discover the encounter JSON through existing encounter history and nursing chart helpers.

No local-state-only note, duplicate clinical-documentation entry, patient-record table, Prisma model, migration, or seed was added.

## Localization and deployment requirements

No new labels were added. Restored controls already resolve EN/FR keys from the current i18n catalogs; persisted enum values remain canonical codes.

* Local migration: **NOT REQUIRED**
* Production migration: **NOT REQUIRED**
* Seed: **NOT REQUIRED**
