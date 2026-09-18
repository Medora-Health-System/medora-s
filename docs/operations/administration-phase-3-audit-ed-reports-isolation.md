# Administration Phase 3 — Audit log and ED operational reports

## Production certification target

Phase 3 certifies the two read-heavy Administration surfaces that can expose operational or patient-linked information:

- Operations audit: `/app/admin/audit` → `GET /admin/audit/events`
- ED operational reports: `/app/reports` → `GET /reports/ed/*`

The governing rule is the same as Phase 1: a facility identifier selects context; it never creates authority.

## Operations audit

The customer audit path already enforces authorization in `AdminAuditService.listCustomerEvents`, adjacent to the `AuditLog` query:

1. selected facility must exist and be active;
2. `assertFacilityAdminFacilityScope` authorizes the actor for that exact facility;
3. every base audit predicate contains `facilityId`;
4. cursor, actor, encounter, entity, action, preset, count, and pagination filters are applied around that facility predicate;
5. actor projection excludes email, IP, user agent, authentication material, and raw sensitive metadata;
6. platform actors are projected with neutral customer-facing attribution.

Phase 3 refreshes the isolation regression to match the current count/pagination implementation.

## ED operational reports — repaired authority gap

Phase 1 identified that the report controller selected a facility but did not establish facility-admin membership adjacent to the report call. Role middleware alone is insufficient because a role plus a client-selected `x-facility-id` must never become cross-facility authority.

Phase 3 adds `assertReportScope` in `ReportsController`. Before JSON generation or CSV streaming, every ED report now calls `assertFacilityAdminFacilityScope(prisma, actorUserId, facilityId)`.

This applies to:

- door-to-EKG;
- door-to-provider;
- door-to-door;
- medication-administration.

Cross-facility requests fail before the report service is invoked.

## Query isolation

The primary Encounter predicates were already facility-scoped, and secondary order/event queries also include the selected facility where appropriate.

One enrichment gap was found: `loadMrnMap` looked up Patient rows only by patient ID. Even though those IDs originate from already facility-scoped Encounter rows, Phase 3 applies defense in depth and now requires both `Patient.id` and `Patient.facilityId`. This prevents MRN enrichment from depending solely on upstream ID provenance.

## CSV exports and evidence

CSV report generation remains date-bounded and facility-scoped. Existing `ED_REPORT_EXPORT` audit evidence records actor, facility, report type, date range, row count, and format. Phase 3 does not expand the export payload or introduce a global audit export.

## Regression coverage

Added coverage proves:

- exact-facility ADMIN authorization occurs before report execution;
- `x-facility-id` is context rather than authority;
- cross-facility report requests are denied before report service calls;
- MRN enrichment contains a facility predicate;
- audit pagination/filter regression retains facility isolation.

## Non-goals

No clinical workflow, Application Modules, Revenue Cycle, internal Medora billing, platform audit, or report metric semantics are changed in this phase.
