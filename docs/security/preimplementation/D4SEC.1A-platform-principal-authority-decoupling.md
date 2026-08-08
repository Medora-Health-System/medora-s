# D4SEC.1A — Platform principal authority decoupling: preimplementation

## Critical finding and old authority inventory

The prior runtime authorization key was the normalized literal `atranchant@medora.local`. The helper in `auth/platform-principal.ts` was consumed by `/auth/me` (including a synthetic role), `RolesGuard`'s opted-in facility-context exception, facility creation/list/language/activation/billing administration, MSPP administration and target protection, and public-health identity projection. Those are authorization dependencies, not merely references.

Historical migrations and development seed fixtures also mention that address. `docs/OPS.md` describes the superseded behavior. These retained historical/documentary strings are not runtime decisions and must not be used for D4SEC.1B recovery.

## Existing authoritative state assessment

No parallel identity or authentication system is needed. `User.id` is immutable identity. The existing active `UserRole` assignment to `MEDORA_SUPER_ADMIN` is the affirmative authority assignment. `User.canCreateFacilities` is retained as a unique, defense-in-depth capability bit. Requiring both prevents either an ordinary facility role mutation or a stray capability bit from independently creating platform authority.

The immediate rule is therefore: existing user + active account + `canCreateFacilities = true` + at least one active database `MEDORA_SUPER_ADMIN` assignment. Email, username, display name, and client input are excluded.

## Threat and containment inventory

A facility ADMIN sharing a facility with the platform principal could reach direct APIs for profile/email, roles, global status, password, MFA, and billing identity. Server-side target classification must occur before each write; hiding UI controls is insufficient. Customer facility user lists should omit the authoritative platform principal.

Tenant clinical/customer data remains facility-bound. Only routes explicitly decorated for the platform-principal exception may use it, and those routes must continue to require and validate an active facility context.

## Database and production constraints

No schema migration is required. The required immutable ID, role assignment, active flags, and defense-in-depth flag already exist. No production seed, repair, email change, user mutation, deployment, or merge is part of D4SEC.1A.
