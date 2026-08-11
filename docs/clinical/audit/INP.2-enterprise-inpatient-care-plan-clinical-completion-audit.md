# INP.2 enterprise inpatient care-plan completion audit

## Verdict

**NOT CERTIFIED — VALIDATION STOP.** The approved persistence foundation is implemented, but local migration deployment and the complete 76-case certification matrix could not be executed in this container because the Docker CLI is unavailable. Overview/Summary/chart/export adapters also require follow-up before merge. Do not merge.

Implementation evidence: INP.2 has one relational aggregate and one Nest mutation owner. The legacy `admissionSummaryJson.carePlan` projection is returned only as `LEGACY_READ_ONLY`; new writes never target it.

## Guard execution proof

`EncounterCarePlanController` declares `@UseGuards(AuthGuard("jwt"), RolesGuard)`. Nest executes controller guards in declaration order: Passport establishes the authenticated principal, then `RolesGuard` resolves an active facility membership and stamps the facility role. The service subsequently scopes the encounter and plan by authenticated facility, patient, and route encounter before applying its discipline rules. No global `APP_GUARD` RolesGuard remains in `AppModule`; therefore the formerly reported pre-authentication global-guard defect is not present on this baseline.

Order: authentication → active facility membership/route role → encounter/patient scope → care-plan capability and discipline policy.

## Boundaries

Activation requires `Encounter.type = INPATIENT`; Emergency and non-inpatient/Observation activation are denied. Care-plan DTOs expose no order, MAR, diagnosis, problem-list, result acknowledgement, restraint/isolation, discharge, or encounter-closure commands. Clinical events are limited to activation, review, completion, and discontinuation.
