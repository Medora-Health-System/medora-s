# INP.1B.5 certification

## Certified boundaries

- Shared board owns presentation and bedside interaction only.
- Inpatient adapter uses only `/inpatient-nursing-assessments` and `/inpatient-nursing-assessment-events`.
- Every save remains an INP.1A `NURSING_ASSESSMENT_SAVED` immutable event with server-authored identity and timestamp.
- No inpatient code imports ED reassessment, triage, trauma, ESI, disposition, local-draft or Summary persistence.
- Historical columns are read-only; a draft is the only editable column.
- Copying clones into unsaved state and cannot mutate the source event.
- RN/Admin authoring and Provider read-only behavior remain enforced at server and workspace boundaries.
- Existing shared adapters remain the single source for Summary, Patient Chart and print/export.
- Observation and ED implementation files were not modified.

## Data operations

| Operation | Required? |
|---|---:|
| Prisma change | No |
| Local migration | No |
| Production migration | No |
| Seed | No |
| Deployment | No |

## Residual risks

The generic board is intentionally introduced through inpatient first. ED remains on its proven concrete grid, so there is not yet one renderer mounted by both settings; the extracted neutral component codifies the same interaction contract while avoiding a high-risk ED rewrite. Browser-level visual regression and authenticated end-to-end role coverage should be added when the repository has an established component/E2E harness. The new board chrome, row labels and summary labels have complete English/French presentation; canonical values remain language-independent. A future clinical-language review should validate option terminology with local nursing leadership.
