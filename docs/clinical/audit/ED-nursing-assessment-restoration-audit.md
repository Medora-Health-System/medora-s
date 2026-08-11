# ED Nursing Assessment restoration audit

## Verdict

The production symptom was a composition/routing regression, not a persistence regression. The Emergency `nursing` dashboard section still contained `EmergencyNursingReassessmentPanel`, but it was demoted to a `liveEngineSlot` inside an enterprise nursing shell and then surrounded by respiratory therapy, rehabilitation, interdisciplinary care-plan, case-management/discharge-planning, and provider workspaces. The ED grid, JSON contract, PATCH save, append-only clinical-event history, Summary readers, and longitudinal chart readers remain present.

## History and root cause

`git log`, `git show`, and `git blame` establish the sequence:

* The last known-good direct mount is the parent of `0f9718c101770228b0e2e125ff533da21c577c78`, visible in `git show 0f9718c^:.../EmergencyActiveWorkspaceView.tsx`. It directly rendered `EmergencyNursingReassessmentPanel`, `ErHandoffV1NursingSection`, and `EmergencyErNursingHandoffPanel` in the Emergency nursing branch.
* Commit `0f9718c101770228b0e2e125ff533da21c577c78` (`feat(nursing): add enterprise nursing clinical workspace D4B.2`, 2026-07-26) wrapped those ED surfaces in `EnterpriseNursingClinicalWorkspaceD4b2` with `careSetting="EMERGENCY"`. Its documentation describes enterprise workspace consolidation/reuse; it did not remove the ED engine or its persistence.
* Commits `689a57c7`, `34f468b5`, `130bf443`, `80ad5a94`, and `03b33737` subsequently appended respiratory, rehabilitation, care-plan, case-management, and provider enterprise components to that same Emergency nursing branch. No PR number is encoded in the local commit messages or repository metadata, and no Git remote is configured, so a PR identifier cannot be proven locally.
* Commit `34547f5` later changed the ED panel and inpatient consolidation, but blame attributes the incorrect Emergency wrapper to `0f9718c` and the unrelated domain mounts to the five commits above.

The exact minimum correction is therefore to restore the direct ED composition in `EmergencyActiveWorkspaceView` and remove only the enterprise component imports/mounts from that branch. Enterprise component implementations and Observation/Inpatient mounts are retained.

## Existing ED implementation

`EmergencyNursingReassessmentPanel` remains mounted in Emergency active/chart/legacy encounter surfaces and in compatibility surfaces. It mounts `EmergencyNursingDocumentationGrid`. The grid owns the structured dropdown catalog and rows, current editable column, read-only persisted columns, legacy ABC display, trauma/safety rows, narrative areas, column ordering, timestamps, and attribution.

`emergencyNursingReassessmentV1.ts` remains the ED contract. It reads/writes `Encounter.nursingAssessment.erNursingReassessmentV1`, preserves stable codes, normalizes supported legacy values on read, and builds a legacy history column including signature and trauma snapshot. No replacement contract was found.

## Persistence authority and append-only behavior

The panel merges the V1 blob into the existing `Encounter.nursingAssessment` JSON and saves through the existing `PATCH /encounters/:id`. The API snapshots ED reassessments as `NURSING_ASSESSMENT_SAVED` encounter clinical events under namespace `erNursingReassessmentV1`. `GET /encounters/:id/nursing-reassessment-events` returns facility-scoped, newest-first event snapshots with immutable creator identity, documented/save times, nurse attribution, reassessment snapshot, and trauma snapshot.

Within an active session the API can update the latest event; a new-session signal, material time change, or different creator causes insertion of a new event. The UI renders returned events oldest-to-newest as disabled historical columns plus one editable draft column. It never translates stored codes. Existing pre-event JSON is represented as a synthetic read-only legacy column and is not rewritten by restoration.

## ED Summary connection

`EmergencyVisitSummaryPanel` independently fetches the authoritative reassessment-event endpoint after persistence and passes those events to the visit-summary model and encounter clinical-record adapter. Those readers parse snapshots through `erNursingReassessmentFormFromEncounter`; the Summary does not depend on editor-local state. Legacy/current `Encounter.nursingAssessment` remains the fallback/initial source, while event rows supply append-only history. This is one persistence stream, not a second summary model.

## Patient record connection

The patient chart obtains encounters and reads each encounter's `nursingAssessment`. `EncounterClinicalTimeline`, `PatientChartClinicalTabs`, print layout, and live preview parse that JSON through existing nursing chart helpers. Encounter clinical-record/print paths also accept the same reassessment event history. Thus discoverability is: ED panel -> encounter JSON plus namespaced encounter clinical event -> encounter Summary -> patient encounter timeline/chart/print. No patient-record table or duplicate nursing document is introduced.

## Compatibility and localization

There is no Prisma change or migration. Legacy ABC values, saved signatures, trauma snapshots, stable dropdown codes, and prior event snapshots continue through existing readers. Restored presentation adds no user-facing copy; both EN and FR use the existing `emergencyNursingReassessment` message catalogs.

## Residual risks

* The local checkout has no remote, so the historical PR number cannot be established and delivery push/hosted PR creation cannot succeed without repository hosting configuration.
* Source/contract regression tests exercise wiring and pure compatibility readers; browser-level interaction still depends on deployed authentication, facility authority, and API/database integration.
* Existing API behavior permits an authorized same-user save within the active session to update its latest event. Append-only column creation is deliberately triggered by the existing new-session/time/creator rules; this restoration does not alter that established policy.
