# Medora Patient Portal security invariants

This module is a separate patient security boundary. It must not weaken or reuse staff authorization semantics.

## Non-negotiable invariants

- Do not add `PATIENT` to staff `RoleCode`.
- Do not create `UserRole` rows for patient portal accounts.
- Do not modify the existing staff JWT principal contract to carry patient identities.
- Patient routes use a distinct Passport strategy (`patient-portal-jwt`).
- Patient principals are copied to `req.patientPrincipal`; patient route code must not consume the staff `req.user` contract.
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

## Feature flag

The module is registered by `AppModule` only when:

```text
PATIENT_PORTAL_ENABLED=true
```

When the flag is absent/false, existing Medora boot and staff workflows do not instantiate the patient portal module.

When enabled, these dedicated secrets are required and must not equal the staff JWT secrets:

```text
PATIENT_PORTAL_JWT_ACCESS_SECRET=<independent high-entropy secret>
PATIENT_PORTAL_JWT_REFRESH_SECRET=<different independent high-entropy secret>
PATIENT_PORTAL_TOKEN_ISSUER=medora-patient
PATIENT_PORTAL_JWT_ACCESS_TTL=15m
PATIENT_PORTAL_JWT_REFRESH_TTL=30d
PATIENT_PORTAL_AUDIT_FAILURE_MODE=fail_closed
```

## Implemented foundation on this branch

- isolated patient account/session persistence migrations
- facility-issued one-time activation persistence
- independent patient JWT access + rotating refresh-token service
- separate patient Passport strategy
- patient auth guard and facility-link guard
- facility activation issuance for existing FRONT_DESK/ADMIN staff
- patient activation endpoint that verifies portal password + one-time facility code
- server-derived organization list
- patient-scoped visit reads
- patient-scoped appointment reads
- separate patient-actor audit trail

## Current rollout state

This branch is intentionally feature-flagged and should not be enabled in an environment until:

1. both patient portal migrations are deployed;
2. dedicated portal JWT secrets are configured;
3. Prisma schema parity for the new portal tables is completed;
4. focused patient-portal tests and the existing auth/RBAC/facility-isolation suites are green.

## Regression gate

The existing auth, RBAC, patient, encounter, order, result, appointment, and facility-isolation suites must continue to pass without weakening their assertions.
