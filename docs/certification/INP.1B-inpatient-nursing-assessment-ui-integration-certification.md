# INP.1B certification

## Certification matrix

1. **Audit verdict:** prior inpatient UI incorrectly embedded the ED engine.
2. **Previous authority:** UI used ED-derived `erNursingReassessmentV1`; INP.1A backend was unused by it.
3. **New composition:** inpatient-native structured panel in the existing shared encounter chart/navigation.
4. **Persistence endpoint:** `POST /encounters/:id/inpatient-nursing-assessments`.
5. **Namespace:** `inpatientNursingAssessmentV1` only.
6. **History:** one immutable `NURSING_ASSESSMENT_SAVED` event per save, read by the dedicated events GET.
7. **Overview:** INP.1A `projectInpatientNursingAssessmentOverview` remains the typed projection.
8. **Summary:** `projectInpatientSummaryAssessment` is the authoritative read adapter.
9. **Patient chart:** `projectPatientChartInpatientAssessment` is the legal-record adapter.
10. **Print/export:** `projectPrintExportInpatientAssessment` is the export adapter; no export store.
11–16. **PMH/PSH/home medications/tobacco/alcohol/substances:** visible and editable from patient profile section operations.
17. **Allergies:** displayed from `Patient.clinicalHistoryProfileJson.allergies`; existing allergy PATCH remains the only mutation authority.
18. **Nurse modification:** server-RBAC protected typed section PATCH.
19. **Historical preservation:** section writes update Patient only and do not update encounter snapshots.
20. **EN/FR:** complete parallel catalogs; canonical values are not translated in storage.
21. **ED isolation:** ED implementation unchanged; inpatient host has no ED panel or namespace.
22. **Observation isolation:** server rejects every non-INPATIENT care setting.
23. **Security:** server facility, actor, role and time remain authoritative; guards unchanged.
24–25. **Tests/builds:** record final command results below before delivery.
26. **Prisma change:** NO.
27. **Migration:** NO.
28. **Seed:** NO.
29. **Files changed:** shared versioned contract; inpatient panel/host/test/navigation catalog registration; EN/FR catalogs; three INP.1B documents.
30. **Residual risks:** production RBAC/allergy end-to-end verification requires a deployed, populated facility; certification is conditional if any required build fails.
31. **Branch:** `codex/inp-1b-inpatient-nursing-ui-integration`.
32. **Commit SHA:** recorded by Git delivery history.
33. **PR status:** recorded by GitHub PR delivery.

No raw JSON or engineering-governance prose is rendered in the clinical panel. Current values reload from persisted authority and earlier saves remain visible with time, author, role, status, findings and narrative.
