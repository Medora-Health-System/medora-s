# D4SEC.1C.2A preimplementation audit — audit read isolation and redaction

## Scope and P0 finding

The current-main audit found one customer audit endpoint, `GET /admin/audit/events`, consumed by the facility Admin Audit page. The controller derived a facility from request state/header and called `AdminAuditService.listEvents` without an authoritative service-layer membership check. `RolesGuard` was the only gate, so the read was not independently bound to the authenticated actor and exact selected tenant at the query boundary.

The service did reapply `facilityId` in its Prisma `findMany` alongside date, cursor, actor, encounter, action, entity, and preset filters. Its opaque cursor contains only `createdAt` and audit ID; it does not carry a facility. This prevented a cursor from directly selecting a tenant, but possession of a cursor was not an authorization decision and could not compensate for the missing authoritative scope assertion.

The response projected `actor.userId`, actor name/email fallback, facility ID, entity ID, encounter ID, and a metadata allowlist. It joined `User` including email. Thus a platform actor's stable ID, name, or email could reach the customer UI. No direct audit-record-by-ID route and no separate enterprise audit read endpoint were found. Internal storage uses nullable `AuditLog.userId` and a `User` FK and must remain unchanged.

## Planned narrow remediation

1. Reuse `assertFacilityAdminFacilityScope` immediately adjacent to the facility-scoped audit query. It grants ordinary access only for an active ADMIN `UserRole` at the exact active facility, and grants bypass only through `resolvePlatformAuthority`.
2. Pass authenticated `req.user.userId` into that boundary and reject missing identity/facility context. Reject unknown query keys so a client-supplied `facilityId`, `userId`, or alternate pagination parameter cannot be silently interpreted.
3. Return one customer projection without actor User ID or email. Resolve platform attribution by immutable User.id through the existing platform-authority resolver and label it `Medora Platform Administration`; label null actors `System`; show facility actors by name or the neutral `Facility user` fallback.
4. Keep facility scope as an unconditional Prisma predicate around every cursor and filter predicate. Keep the metadata allowlist and avoid selecting IP, user agent, credentials, tokens, secrets, or authorization material.

## Data assessment and stop conditions

No Prisma schema, migration, seed, audit-write, FK, or storage-semantic change is required. D4SEC.1A and D4SEC.1C.1 are reused without weakening. Staff capability/persona classification, actor-FK immutability, and broader audit certification remain deferred to D4SEC.1C.2B+.
