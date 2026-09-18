# Administration Phase 5 — Enterprise Workflow dashboard hardening

## Scope

Phase 5 certifies the Administration Enterprise Workflow dashboard:

`/app/admin/enterprise-workflow` → `GET /hospital-care/enterprise-workflow/admin/dashboard` → exact facility administration authority → hospital census → facility-scoped Encounter workflow documents → server aggregate.

This phase does not redesign the workflow engine or alter clinical task behavior.

## Administrative authority repair

The dashboard route previously allowed `ADMIN`, `PROVIDER`, and `RN`. That mixed a facility Administration aggregate with clinical worklist authority. Provider and RN users already have purpose-built clinical workflow/worklist surfaces.

The Administration aggregate is now limited to the existing facility/platform admin role set and revalidates the authenticated actor with `assertFacilityAdminFacilityScope` for the exact JWT facility before aggregation.

This preserves platform authority through the canonical authority resolver and prevents a role claim alone from becoming facility authority.

## Facility isolation audit

Workflow Encounter loading already uses `{ id: encounterId, facilityId }`. The administration scanner obtains the hospital census for the selected facility and re-queries every census encounter with both encounter ID and facility ID before reading its orchestration document.

The aggregate receives the same facility ID and emits it in `EnterpriseWorkflowAdminDashboardV1`.

## Completeness defect repaired

The scanner intentionally caps workflow document enrichment at `CENSUS_SCAN_LIMIT = 120`. Before Phase 5, the Administration dashboard silently aggregated the first 120 census rows and could present those numbers as available even when the facility census contained more than 120 patients.

For an enterprise administration dashboard, a partial aggregate must not look authoritative.

Phase 5 therefore requires a complete census for the Administration aggregate. If the census exceeds the bounded scan limit, the service uses the existing `sourceUnavailable` contract and returns metrics as `UNAVAILABLE` rather than falsely reporting partial counts. Clinical department worklist behavior remains unchanged.

## Failure semantics

The dashboard already distinguishes unavailable data from zero. Phase 5 preserves that contract. Source failures and now bounded-scan incompleteness produce unavailable metrics rather than fabricated zeros.

## Regression evidence

Tests prove:

- exact active facility ADMIN authority is revalidated before aggregation;
- foreign-facility access is denied before the orchestration service executes;
- an administration census above the safe scan bound produces UNAVAILABLE metrics rather than partial available counts.

## Non-goals

No workflow definitions, task completion/reassignment behavior, escalation behavior, clinical rules, Application Modules, Revenue Cycle, or internal Medora billing are changed.
