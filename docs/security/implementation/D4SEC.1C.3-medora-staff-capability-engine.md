# D4SEC.1C.3 implementation

## Delivered

One additive migration creates the staff/profile/grant schema, restrictive history-preserving FKs, indexes, partial active-grant uniqueness, and 24 deterministic catalog rows. It performs no identity inference/backfill and creates no profile or grant.

`resolvePlatformCapabilities` is the sole ordinary staff resolver. It queries by User.id, active User/profile, active unrevoked grants and active definitions. It deliberately does not select email, facility roles, role codes, `canCreateFacilities`, patients or clinical data.

`@RequirePlatformCapabilities` supports ANY/ALL and an explicit `allowPlatformPrincipal` policy. `PlatformCapabilitiesGuard` performs the D4SEC.1A override once, centrally. `@RequirePlatformPrincipal` makes bootstrap mutations override-only.

## API

* `GET /platform/staff` — `STAFF_VIEW` or explicit principal override.
* `GET /platform/staff/:id` — same; returns classification and historical grants, no clinical data.
* `GET /platform/capabilities` — `STAFF_VIEW` or `STAFF_GRANT_CAPABILITIES`, or explicit principal override.
* `POST /platform/staff/:id/classification` — principal only; active target, no self-classification, audited `MEDORA_STAFF_CLASSIFIED`.
* `POST /platform/staff/:id/capabilities` — principal only; strict DTO, active classified target/definition, no self-grant, duplicate active grant returns deterministically with `idempotent: true` and no duplicate audit row.
* `DELETE /platform/staff/:id/capabilities/:code` — principal only; route target/code are authoritative, strict reason body; revoke updates the exact active grant and is immediately excluded by resolver.

Successful grants/revokes and classification write one critical audit event in the same transaction. Denied self-grant, invalid target/definition and missing-revoke paths emit safe semantic denied events. Evidence includes actor attribution through AuditLog, target id, capability code, result/reason and optional ticket; no credentials, tokens, MFA material or PHI.

## Boundaries and deferrals

Platform capabilities do not create UserRole, do not satisfy RolesGuard, and cannot supply facility context. There is no new patient/encounter/chart route or query. Profile deactivation endpoint, staff account provisioning, persona templates/delegation, recent-MFA enforcement, dual approval and purpose-bound support/PHI access are D4SEC.1C.4+ work.

## Operations

Catalog delivery is migration-backed and therefore identical locally and in production. Local: `npm run prisma:migrate --workspace=@medora/api`. Production: `npm exec --workspace=@medora/api prisma migrate deploy`. No seed is required or changed.
