# INP.1B.1 inpatient nursing navigation restoration audit

## Verdict

The INP.1B clinical engine and canonical section parsing were present, but the production shared-chart header selected a different, provider-only sticky navigation catalog. This was a navigation composition defect, not a persistence defect.

## Actual runtime trace

`/app/hospitalisation/inpatient/active/:encounterId/chart` renders `InpatientSharedChartPage`, which mounts `InpatientActiveWorkspaceView` with `forcedRole="CHART"`. `stickyNavForRole("CHART")` previously fell through to `INPATIENT_PROVIDER_STICKY_NAV_SECTIONS`. That list contained only Overview, Review Orders, MAR, Review Results, Care Plan, Discharge, Timeline, and Summary. Therefore definitions in `INPATIENT_WORKSPACE_SECTIONS` and `INPATIENT_NURSING_STICKY_NAV_SECTIONS` could not appear in the runtime header.

The complete runtime chain is:

1. **Nav definition:** role-specific sticky catalogs in `inpatientWorkspaceSections.ts`.
2. **Role/capability selection:** `forcedRole="CHART"`; `stickyNavForRole`; `filterSectionsForRole` plus sticky section IDs. Visibility is distinct from mutation authority.
3. **Header renderer:** `InpatientWorkspaceSectionNav`, rendered by `InpatientActiveWorkspaceView`; its non-wrapping, horizontally scrollable navigation preserves mobile access.
4. **URL:** the selected section is written as the canonical `?section=<id>` on the same pathname and encounter ID.
5. **Section switch:** `parseInpatientWorkspaceSection` resolves canonical IDs and the `nursing-admission` / `nursing-assessment` normalized aliases. Unknown or disallowed values retain the existing safe fallback.
6. **Clinical component:** `admission` mounts `InpatientAdmissionClinicalShell`; `nursing` mounts `InpatientNursingAssessmentSection`, which mounts `InpatientNursingAssessmentPanel`.

## Findings and boundaries

- Nursing Admission was missing because the CHART role used the provider sticky list, which omitted `admission`.
- Nursing Assessment was missing for the same reason: the provider sticky list omitted `nursing`.
- The role issue was visibility selection, not API authority. The correction exposes review destinations in the shared chart while UI mutation remains RN/Admin-only and server authorization remains unchanged.
- Existing navigation remains sticky above the section panel, so it persists while either clinical engine is open.
- ED and Observation use separate route/workspace modules. Neither navigation source was changed.
- No Prisma schema, migration, seed, endpoint, clinical document shape, or persistence implementation was changed.
