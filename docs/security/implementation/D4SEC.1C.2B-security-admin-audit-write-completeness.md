# D4SEC.1C.2B implementation — security-admin audit writes

## Architecture

`logSecurityAdminAudit` is a semantic adapter over the existing `AuditService`; `AuditLog` remains the only authoritative store. It normalizes event, outcome, severity, source operation, denial reason, entity and safe evidence. `assertSecurityAuditMetadataSafe` recursively rejects forbidden keys (case-insensitive) before persistence. It does not redact silently.

The actor is always the authenticated `userId` passed from the controller/service boundary. Request bodies, headers, email, and target records cannot supply it. Facility-local events use the facility authorized by the mutation boundary. Global user, credential and MSPP events omit `facilityId`; global schema support is the existing nullable column.

## Successful coverage and atomicity

* Admin user create: user, facility roles, and one `ADMIN_USER_CREATED` event share a transaction.
* Existing-user profile: update and one `ADMIN_USER_GLOBAL_IDENTITY_CHANGED` event share a transaction.
* Facility roles: deactivate/reactivate/create, consequential global activation, and one `FACILITY_ROLES_CHANGED` event share a transaction. Evidence contains sorted before/after, assigned, and removed role codes.
* Global status: user/role changes and one `ADMIN_USER_GLOBAL_STATUS_CHANGED` event share a transaction.
* Password reset: password-hash update, refresh-token invalidation, active-session revocation, and one `ADMIN_USER_PASSWORD_RESET` event share a transaction. Evidence is boolean/count only.
* MFA reset: active-session revocation, MFA/refresh state clearing, and one `ADMIN_USER_MFA_RESET` event share a transaction. No MFA material is placed in metadata.
* Facility creation and initial owner ADMIN grant retain one atomic event, now normalized as `FACILITY_CREATED`.
* Facility activation/deactivation and one event share a transaction with semantic before/after.
* MSPP assignment creation and its `MSPP_AUTHORITY_GRANTED` event share a transaction. MSPP assignment patch and its changed/revoked event share a transaction.
* Existing facility care-profile and break-glass lifecycle audit transactions remain unchanged.

Passing `tx` to `AuditService.log` guarantees an audit failure is rethrown regardless of configured best-effort mode, causing Prisma rollback. Required services fail closed if their audit dependency is absent.

## Denial coverage

The D4SEC.1C.1 boundary now emits normalized `SECURITY_ADMIN_MUTATION_DENIED` rows for global mutation without platform authority, facility substitution/unauthorized actor, cross-tenant or inactive target, self-authority change, and protected platform principal. Stable reason codes are `GLOBAL_MUTATION_REQUIRES_PLATFORM_AUTHORITY`, `ACTOR_NOT_AUTHORIZED_FOR_FACILITY`, `CROSS_TENANT_TARGET`, `SELF_MEMBERSHIP_AUTHORITY_CHANGE`, and `PROTECTED_PLATFORM_PRINCIPAL`. Existing authorization results and tenant-safe response behavior are unchanged. Routine authentication and ordinary RBAC failures are not audited.

## Severity mapping

* **CRITICAL:** global status, administrator password/MFA reset, facility activation/deactivation.
* **HIGH:** user creation/global identity, facility authority changes, facility creation, MSPP grants/revokes, dangerous denials.
* **MEDIUM/routine:** existing operational domain events; this slice does not inflate them.

## Remaining deferrals

Actor-FK retention, the enterprise audit reader, retention policy, and other audit-lifecycle work remain D4SEC.1C.2C+. Employee capability architecture remains D4SEC.1C.3. These deferrals do not leave an unaudited security-admin mutation in the repository-grounded D4SEC.1C.2B inventory.

Prisma schema, migrations, and seeds are unchanged and unnecessary for implemented paths.

## Completion follow-up — MSPP onboarding and history reconciliation

The available repository has no local or remote `main` reference and no configured remote. Its base is merge commit `36ca9db` (PR #90), whose second parent is the D4SEC.1C.2A implementation commit `ca86cde`; therefore PR #90 content is present. `git log --all` contains no history for the requested parent-audit pathname. Within the repository history available to this worktree, the parent audit was never merged. No rebase or merge was attempted, and no history was fabricated.

`POST /admin/mspp-access/onboard` authenticates its actor in the controller and delegates to `AdminMsppAccessService.onboard`. For an existing user it updates first/last name and creates an MSPP assignment; for a new user it creates the hashed-credential user and creates an MSPP assignment. Both branches now place every database mutation plus exactly one `MSPP_AUTHORITY_GRANTED` (active) or `MSPP_AUTHORITY_ASSIGNMENT_CREATED_INACTIVE` audit row in one existing Prisma interactive transaction. An audit-write exception propagates and rolls the whole transaction back. Global MSPP authority does not invent a facility context. Evidence contains only immutable target ID, role, active state, user-created state, and geographic authority scope; it never contains email, password/hash, tokens, MFA material, authorization, API keys, or secrets.

The delegated-MSPP target boundary now records one `MSPP_AUTHORITY_MUTATION_DENIED` event with `PLATFORM_PRINCIPAL_PROTECTED` before preserving the existing `ForbiddenException`. Ordinary lack-of-MSPP-admin authorization remains unaudited to avoid authorization-noise flooding.

The complete MFA spec showed production-strength Argon2 cases taking up to approximately 10.3 seconds on this runner. A spec-only 15-second timeout replaces Jest's 5-second default; Argon2 configuration and runtime security behavior are unchanged. All 14 MFA service tests then passed.
