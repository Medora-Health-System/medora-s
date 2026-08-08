# D4SEC.1C.1 pre-implementation audit

## Finding and invariant

`UserRole` is facility-local (`facilityId`, `roleId`, `departmentId`, `isActive`), while the `User` row is shared. The admin API previously checked target co-membership but then allowed a facility ADMIN to update shared identity, password, MFA, and billing fields. `User.isActive` is global, although status disable already avoided clearing it while another active membership remained. Facility identifiers can originate in JWT context or a header; consequently every service operation must independently prove the actor's active ADMIN membership.

## Mutation classification matrix

| Class | Repository fields / operations | Facility ADMIN policy |
|---|---|---|
| A — facility-local | `UserRole.facilityId`, `roleId`, `departmentId`, `isActive` | Allowed only for the actor's authoritatively verified facility and an existing target membership; self-mutation denied. |
| B — global identity | `User.email`, `firstName`, `lastName`, `isActive` | Platform authority required. New-user creation remains permitted because it creates a new, single-facility ordinary account. |
| C — global security | `passwordHash`, `refreshTokenHash`, MFA secret/enabled/recovery/timestamp fields, `AuthSession` revocation | Platform authority required. |
| D — global billing/credential identity | `billingNpi`, `billingTaxonomyCode`, `billingNameOverride` | Platform authority required for an existing user. |
| Protected platform authority | `canCreateFacilities`, active `MEDORA_SUPER_ADMIN` assignment | Existing D4SEC.1A authority resolver remains authoritative; tenant mutation denied. |

## Endpoints and paths audited

`GET/POST /admin/users`, `PATCH /admin/users/:id`, `PATCH /admin/users/:id/roles`, `PATCH /admin/users/:id/status`, `GET/PATCH /admin/users/:id/billing-identity`, `PATCH /admin/users/:id/password`, and `POST /admin/mfa/reset` were audited. Searches also covered password/session writes, profile and status updates, billing identity, role/facility/department assignments, MFA fields, and the Prisma/shared role definitions.

## Threat cases

Path/body/header facility substitution, direct other-tenant IDs, shared users, self-role edits, department substitution, global deactivation, login rename, password reset, MFA reset, billing edits, and platform-role assignment were considered. Multiple memberships are evaluated against the exact requested facility; global mutations do not become permissible through any membership count.

No schema or seed change is required. D4SEC.1C.2 policy refinement, D4SEC.1C.3 staff/capability classification, and D4SEC.1C.5 support recovery capabilities are explicitly deferred.
