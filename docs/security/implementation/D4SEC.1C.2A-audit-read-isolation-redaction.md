# D4SEC.1C.2A implementation — audit read isolation and redaction

## Implemented authorization rule

`GET /admin/audit/events` now passes authenticated `req.user.userId`, the selected facility, and validated filters to `AdminAuditService.listCustomerEvents`. Before any audit query, the service verifies that the exact selected facility is active, then calls the existing `assertFacilityAdminFacilityScope` policy gate. An ordinary principal must have an active `UserRole` whose role is `ADMIN` at that facility. Failure is deterministic `403 Forbidden`. An authoritative platform principal may bypass membership only when the existing immutable-User.id `resolvePlatformAuthority` decision grants access; platform authority does not bypass active-facility validation.

Empty facility context is `400`; missing authenticated identity is `403`. The strict query DTO rejects unknown controls, including substituted `facilityId`, `userId`, and `page`. There are no facility path parameters and no direct audit-log ID read endpoint in current scope.

## Cursor and filter isolation

The Prisma `where` always begins with the authorized `facilityId`. Cursor ordering predicates and supported actor, encounter/entity, action, preset, and date filters are composed beneath that tenant predicate. A cursor contains timestamp plus row ID only and is never treated as authority. Consequently, a Facility A cursor used while authorized for Facility B can at most alter the position inside B's already-scoped stream; it cannot return A rows. Actor and entity-related filters likewise cannot remove or replace facility scope.

## Customer attribution projection

The response no longer contains `actor.userId`, and the actor join no longer selects email. Authoritatively resolved platform actors render as `Medora Platform Administration`, null actors as `System`, and ordinary facility actors as their name or `Facility user`. Platform names, platform-principal email, internal IDs, and `support@medoras.com` are therefore not customer response inputs.

Metadata remains an explicit scalar allowlist. The read does not select IP or user agent, and no password/hash, refresh/session token, MFA secret, recovery code, authorization header, or API key is newly returned. The change does not broaden PHI.

## Internal attribution preservation

No write path, Prisma model, migration, or stored record was changed. `AuditLog.userId`, its actor FK, entity IDs, facility IDs, and original metadata remain exact. The service selects the exact internal `userId` solely to authoritatively classify and map the actor, then omits it from the customer projection.

## Frontend

The Admin Audit API type now models only `actor.displayName` and `actor.roleHint`. The existing UI already renders those fields and did not use raw actor ID, so no dashboard redesign was needed.

## Deferred work

Internal staff capabilities/personas, audit actor-FK immutability, a dedicated enterprise audit UI/API, storage lifecycle policy, and all remaining full D4SEC.1C.2 certification work are D4SEC.1C.2B+ and were not introduced here.
