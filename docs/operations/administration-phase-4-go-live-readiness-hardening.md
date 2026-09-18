# Administration Phase 4 — Go-Live Readiness production hardening

## Scope

Phase 4 certifies the facility Go-Live Readiness chain:

`/app/admin/go-live` → `GET /admin/go-live-readiness` → exact facility authority → `GoLiveReadinessService` → clinical/report/audit dependencies.

Internal Medora billing remains out of scope.

## Authority repair

The route previously selected `req.user.facilityId || x-facility-id` and relied on role middleware before invoking the readiness service. As established in Phase 1 and repaired for reports in Phase 3, facility selection is context rather than authorization.

The controller now calls `assertFacilityAdminFacilityScope` for the authenticated actor and exact selected facility before any readiness dependency executes. A foreign `x-facility-id` cannot create access.

## Dependency audit

The readiness service derives facility state from:

- open ED / urgent-care encounters;
- encounter orders and order items;
- triage vitals;
- clinical VITALS_RECORDED events;
- door-to-provider report;
- door-to-door report;
- medication-administration report;
- latest external billing export evidence;
- recent external billing automation failures;
- recent critical operational audit events;
- environment-level operational alert and external-export configuration flags.

Clinical encounter/order/vitals/event queries already carry `facilityId`. Phase 3 hardened the report dependencies and MRN enrichment.

## Cross-facility evidence leak repaired

The external billing failure readiness check queried the previous 48 hours across **all facilities**, while the Go-Live page is a facility-scoped surface. That could make Facility A appear blocked because Facility B had an automation failure and exposed cross-tenant operational state.

Phase 4 adds `facilityId` to that AuditLog predicate and relabels the check as “this facility.” The latest export and critical-event queries were already facility-scoped.

This is readiness isolation only; it does not modify internal billing or billing calculations.

## Regression evidence

Tests now prove:

- active exact-facility authority is established before snapshot computation;
- a browser facility header is not authority;
- foreign-facility access is denied before readiness service execution;
- all AuditLog dependencies used by the facility snapshot carry the selected facility;
- report dependencies receive the same facility.

## Status semantics

The existing readiness model remains conservative: `ready`, `attention`, or `blocked`, derived from pass/warn/fail checks. Phase 4 does not fabricate missing metrics or change clinical threshold semantics.

## Non-goals

No Application Modules, clinical rules, workflow engine, Revenue Cycle workflow, internal Medora billing, or platform-wide go-live adapter behavior is changed.
