# Medora Patient Portal security invariants

This module is a separate patient security boundary. It must not weaken or reuse staff authorization semantics.

## Non-negotiable invariants

- Do not add `PATIENT` to staff `RoleCode`.
- Do not create `UserRole` rows for patient portal accounts.
- Do not modify the existing staff JWT principal contract to carry patient identities.
- Patient routes use a distinct Passport strategy (`patient-portal-jwt`).
- Patient principals are attached to `req.patientPrincipal`, not `req.user`.
- Patient facility access is derived from a verified, active portal link; client-supplied country, role, or patient ownership is never authoritative.
- Clinical reads must constrain queries by both authorized `patientId` and `facilityId` in the database predicate.
- Patient IDs are resolved server-side from verified links and are not trusted from FlutterFlow request state.
- Existing staff `RolesGuard`, platform-principal behavior, break-glass behavior, and facility-isolation tests remain unchanged.
- Existing staff controllers (`/patients`, `/encounters`, `/orders`, `/appointments`, `/registration`, `/admin`) remain staff-only.
- Patient APIs live under `/patient/v1` and return patient-safe projections, never raw Prisma clinical records.
- `globalMrn` may assist reconciliation but is never sufficient authentication or authorization proof.
- Name + date of birth alone must never auto-link a portal account to a clinical patient.
- Patient refill and appointment actions are request workflows in v1; they do not directly mutate authoritative prescriptions or provider schedules.
- Cross-patient and cross-facility misses should return non-enumerating denial semantics (prefer 404 for inaccessible resource IDs after an authorized facility context, 403 for missing facility link).

## Regression gate

The existing auth, RBAC, patient, encounter, order, result, appointment, and facility-isolation suites must continue to pass without weakening their assertions.
