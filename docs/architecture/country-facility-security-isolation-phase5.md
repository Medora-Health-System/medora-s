# MEDORA Phase 5 — Security & Data Isolation Hardening

Phase 5 certifies that country/facility configuration does not become a tenant-access shortcut and begins fail-closed clinical module enforcement at protected API boundaries.

## Authority separation

Medora keeps four different concepts separate:

1. **Country policy** — what a jurisdiction permits or requires.
2. **Facility configuration** — what an individual facility enables within that policy.
3. **Facility membership / clinical role** — which exact facility a user may enter.
4. **Platform capability** — corporate operational authority; it does not become clinical membership.

A country is not a tenant credential. Membership in Facility A never authorizes Facility B merely because both facilities are in the United States, Dominican Republic, or Haiti.

## Exact-facility isolation

`RolesGuard` continues to resolve the requested facility and queries an active `UserRole` for that exact `facilityId`. Phase 5 adds explicit regression evidence for same-country peer facilities.

The existing platform-principal exception remains restricted to routes that explicitly opt in to platform-principal-with-facility-context. Ordinary clinical routes are not widened.

## Clinical capability fail-closed boundaries

Phase 5 extends the server-side effective capability authority into high-risk clinical surfaces:

- Pharmacy dispense APIs assert the effective `pharmacy` module.
- Diagnostic result APIs resolve the facility-scoped order item and assert `laboratory` for `LAB_TEST` or `radiology` for `IMAGING_STUDY`.
- Country policy and facility configuration are therefore evaluated server-side before those enabled/disabled module workflows proceed.

Existing database predicates remain facility-scoped; the capability check is additive and does not replace tenant predicates or RBAC.

## Country-scoped Medora Staff

Phase 1 correctly identified that `MedoraStaffProfile` and `PlatformCapabilityGrant` are global corporate authority and contain no country scope. Phase 5 does **not** silently reinterpret those global capabilities as country-scoped authority.

This is intentional: country policy governs product/workflow availability, while clinical tenant access remains exact-facility membership. Introducing an `allowedCountries` field into global capability grants would change the established D4SEC.1C.3 security model and is not necessary for clinical country/facility isolation.

If Medora later needs delegated corporate operators who may administer only a subset of countries, that should be a separately governed platform-administration scope, not a clinical `UserRole` or facility feature override.

## Database

No Prisma schema change is required for this Phase 5 hardening increment. No migration is required.
