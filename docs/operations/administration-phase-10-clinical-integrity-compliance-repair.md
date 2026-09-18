# Administration Phase 10 — Clinical mutation and data-integrity gate

Phase 10 starts from merged Phase 9 and opens the clinical/data-integrity program with a production defect visible in the Administration Audit Completeness & Compliance surface.

## Production incident repaired

The compliance dashboard returned HTTP 500 while aggregating MAR audit completeness. The service used a hand-written raw SQL query against `MedicationAdministration` / `AuditLog`. This path was brittle against the deployed Prisma/schema contract and bypassed the repository's typed relation semantics.

The MAR audited count now uses the Prisma `medicationAdministration.count` relation predicate, requiring:
- the selected `facilityId`;
- the seven-day creation window;
- a related audit row with `AuditAction.CREATE`;
- entity type `MEDICATION_ADMINISTRATION`;
- the same exact `facilityId`.

This removes the raw SQL failure path and keeps the aggregate on the same typed data-access layer as the rest of the service.

## Facility-isolation repair carried into compliance

Phase 9 removed null/global automated-export audit evidence from Export Monitoring and System Health. The compliance service still retained the old OR predicate and therefore could admit `facilityId = null` automation evidence into every facility's compliance metrics.

Compliance export evidence now requires exact `facilityId`, so audit coverage and failed-export rates cannot be contaminated by another/global bucket.

## Regression evidence

A focused Phase 10 spec verifies:
- MAR audited counts are produced through the Prisma relation predicate;
- the MAR audit relation itself is facility-scoped;
- export count evidence is exact-facility only;
- export failure-scan evidence is exact-facility only;
- the former null-facility OR fallback is absent.

## Continuing Phase 10

This PR deliberately repairs the live Administration failure first and establishes the typed/facility-local aggregate baseline. The remaining clinical mutation review continues across transactional state transitions, concurrency/idempotency, encounter/patient/order/MAR ownership checks, and ROI transition races.

No Application Modules behavior, clinical rule semantics, or internal Medora billing behavior is changed.
