# D4SEC.1A — Platform principal authority decoupling: implementation

## Authority source

`resolvePlatformAuthority(store, userId)` is the sole runtime platform-principal resolver. It selects no email and grants only for an active `User` with both `canCreateFacilities` and an active `MEDORA_SUPER_ADMIN` `UserRole`. Its pure state resolver makes fail-closed behavior testable. `resolvePlatformPrincipalAccess` adds, rather than removes, the explicit facility-context condition for opted-in tenant routes.

The resolver now controls `/auth/me`, synthetic platform role projection, facility platform operations, RolesGuard exception paths, MSPP platform administration/protection and public-health identity projection. A changed email cannot remove authority; a reused historical email has no effect.

## Protected mutations

`AdminUsersService` classifies the target and actor from authoritative state before profile/email PATCH, password reset, global status activation/deactivation, role mutation, or billing identity PATCH. A non-platform actor receives HTTP 403 for a protected target. Facility creation and role updates also reject attempts to assign `MEDORA_SUPER_ADMIN` through facility administration. Customer facility list queries omit users meeting the authoritative platform rule.

`MfaService.adminReset` independently performs the same target/actor classification before clearing MFA or sessions. Denials are recorded with `AuditService` as a critical, PHI-safe `PLATFORM_PRINCIPAL_PROTECTION` event containing only actor ID, target ID, and mutation category. No passwords, hashes, MFA material, refresh tokens, or recovery codes are logged.

Generalized projection/removal of all future `MEDORA_INTERNAL` identities remains deferred to D4SEC.1C; this phase contains `MEDORA_SUPER_ADMIN`.

## Tenant-context preservation

`RolesGuard` still requires authentication and a facility ID before its normal membership checks. Its platform exception is available only to explicitly opted-in routes declaring `MEDORA_SUPER_ADMIN`; after authoritative resolution it verifies the selected facility is active. It does not broaden medication roles, MSPP roles, or ordinary facility roles.

## Seed and migration findings

The TypeScript demo fixture creates a named development principal and explicitly assigns both authoritative states; its email is fixture/login data, not an authorization condition. `admin@medora.local` remains a facility ADMIN with `canCreateFacilities = false`; stale generated `seed.js` was aligned. Historical migrations contain the old one-time email backfill and are immutable migration history, not deployed authorization logic. No seed is required or permitted for production recovery.

Review remediation adds `20261030120000_d4sec_1a_platform_authority_backfill`. Existing installations can have the unique persisted `canCreateFacilities` principal without a `MEDORA_SUPER_ADMIN` row because the role was introduced later. The migration selects that same immutable `User.id` without selecting email, upserts the role catalog row, and idempotently assigns it at the lexicographically first **existing active facility membership**. It does not create a user or invent facility access. If the capability principal has no active existing membership, deployment fails with an instruction for an approved `User.id`-based controlled repair rather than guessing authority.

- Local development migration: `npm run prisma:migrate --workspace=@medora/api`
- Production deployment migration, only after approval/backups and the prerequisite query has been reviewed: `npm run migrate:deploy --workspace=@medora/api`

D4SEC.1A remediation did **not** run either command against production.

## Independent facility-role authorization

`RolesGuard` loads every accepted active membership, sorts it deterministically, and prefers an accepted ordinary facility role. Only a `MEDORA_SUPER_ADMIN`-only authorization path invokes platform authority resolution. Thus a stale platform assignment cannot revoke an independently valid `ADMIN` (or other route-accepted) membership, while an invalid platform assignment alone remains denied and unrelated roles cannot rescue it.

## D4SEC.1B production recovery dependency

Before changing the production contact email to `support@medoras.com`: deploy and verify this D4SEC.1A code; identify the intended immutable `User.id`; verify that exact active row has `canCreateFacilities = true` and an active `MEDORA_SUPER_ADMIN` assignment; verify no other row meets both conditions; test `/auth/me` and platform operations with explicit facility context; retain rollback and audit evidence. Only then may an approved, separately audited D4SEC.1B procedure change the email. Do not create a new authority row by email.
