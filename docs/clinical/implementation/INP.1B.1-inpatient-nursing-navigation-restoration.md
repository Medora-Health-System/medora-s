# INP.1B.1 inpatient nursing navigation restoration

## Minimal correction

A dedicated shared-chart navigation catalog now defines the required order:

1. Overview
2. Nursing Admission
3. Nursing Assessment
4. Review Orders
5. MAR
6. Review Results
7. Care Plan
8. Discharge
9. Timeline
10. Summary

The CHART role explicitly selects this catalog. RN navigation also places admission before assessment. The existing horizontal overflow behavior is retained.

## Deep links

The canonical destinations remain `?section=admission` and `?section=nursing`. Normalization also accepts `nursing-admission` and `nursing-assessment`, resolving them to those established IDs. Initial state and the search-parameter effect both use the parser, so direct load and refresh select the same section. Section changes only replace the query string, retaining the encounter pathname.

Overview now offers separate **Open Nursing Admission** and **Start Nursing Assessment** / **Open Nursing Assessment / Reassess** actions. Admission completion and last-assessment state determine the displayed status/action wording; they do not create browser-owned clinical state.

## Clinical and authorization behavior

Nursing Admission reuses `InpatientAdmissionClinicalShell`. Nursing Assessment reuses `InpatientNursingAssessmentPanel` and its dedicated INP.1A POST/event endpoints. Reassessment is a new immutable event in the same engine, with prior assessment history visible. No ED reassessment component or `erNursingReassessmentV1` write is introduced.

Visible shared-chart tabs do not authorize writes. Assessment controls are editable only for an authenticated RN/Admin when writers are enabled and the chart is not locked; other clinicians can review. Server-side authority is unchanged.

## Localization and scope

English and French labels cover Nursing Admission, Nursing Assessment/Reassessment, start/open actions, and the immutable-event explanation. ED and Observation navigation are untouched. There are no database or INP.2 care-plan changes.
