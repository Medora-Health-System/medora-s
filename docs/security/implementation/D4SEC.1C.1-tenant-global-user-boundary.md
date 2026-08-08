# D4SEC.1C.1 implementation

## Boundary enforcement

`assertFacilityAdminMayMutateUser` is the authoritative target-mutation gate. It first recognizes platform authority through the D4SEC.1A `resolvePlatformAuthority` invariant. Otherwise it rejects every global identity, security, or billing mutation. Facility-local mutation requires an active ADMIN membership for the actor at the exact facility, an existing target membership there, a non-self target, and a non-platform target. Tenant-scoped missing targets return a non-enumerating not-found response.

`assertFacilityAdminFacilityScope` independently validates list, create, and billing-read facility scope so a substituted JWT/header facility cannot expand access. Body assignments and departments retain exact-facility validation. Role schemas continue to exclude platform/operator roles, and the service retains an explicit `MEDORA_SUPER_ADMIN` rejection.

## Shared-user behavior

A Facility A ADMIN can update only Facility A `UserRole` rows for an ordinary shared user. Facility B/C rows are untouched. It cannot change shared `User` identity, global activation, password, MFA/session state, or billing credential identity. Platform-authorized administration retains existing functionality.

## Endpoint changes

- `GET /admin/users`: actor facility authorization is now checked in the service.
- `POST /admin/users`: actor facility authorization is now checked before creating an ordinary account.
- `PATCH /admin/users/:id`: global identity gate.
- `PATCH /admin/users/:id/roles`: facility-local target gate and self-escalation denial.
- `PATCH /admin/users/:id/status`: global identity gate.
- `GET /admin/users/:id/billing-identity`: actor facility authorization plus existing target scoping.
- `PATCH /admin/users/:id/billing-identity`: global billing gate.
- `PATCH /admin/users/:id/password`: global security gate.
- `POST /admin/mfa/reset`: global security gate before MFA/session writes.

## Compatibility and deployment assessment

D4SEC.1A is not weakened: platform authority still requires its existing authoritative database state and no email-based authority logic was added. No Prisma schema, migration, local/production seed, production-data operation, deployment, or support-account change is part of this implementation.

Professional credential governance is deferred to D4SEC.1C.2; authoritative Medora staff classification/capabilities to D4SEC.1C.3; narrowly governed support password/MFA recovery to D4SEC.1C.5.
