# Administration Phase 2 — Users, access, and MFA/security hardening

## Production decision

Facility administration owns **facility membership**. It does not own the shared global User identity or global credentials.

### Facility ADMIN may
- list users who have membership at the active authorized facility;
- create a new user whose initial assignments are constrained to that facility;
- manage facility roles/professions/departments;
- disable or restore that user's **membership/access at the active facility**.

### Facility ADMIN may not
- edit an existing user's global name/email identity;
- reset an existing user's global password;
- reset MFA;
- assign MEDORA_SUPER_ADMIN/platform authority;
- mutate a user at another facility;
- turn a facility header into authorization.

### Platform/security operations
Global identity and credential recovery remain platform-authorized. MFA recovery is CRITICAL and must use the existing governed platform privileged-action workflow (`MFA_RESET`) with recent session MFA, immutable target scope, distinct approval, execution-time authority revalidation, session revocation, and security audit evidence.

The legacy direct `POST /admin/mfa/reset` endpoint is retained only as a fail-closed compatibility boundary; it no longer performs MFA mutation. The facility Administration dashboard no longer advertises that unsafe/dead recovery path.

## Corrected functional mismatch

The Users UI describes Activate/Deactivate as facility access. The service previously classified `updateStatus` as `GLOBAL_IDENTITY`, which correctly caused ordinary facility ADMIN to be denied before the facility-local access transaction could run. Phase 2 changes that authorization classification to `FACILITY_MEMBERSHIP`.

The mutation remains constrained by `assertFacilityAdminMayMutateUser`:
- actor must have active ADMIN authority at the exact facility;
- target must have active membership at that facility;
- self-authority mutation is denied;
- platform principals remain protected;
- cross-tenant targets remain tenant-safe denied/not-found.

Deactivation disables roles only at the selected facility and sets global `User.isActive=false` only when no active memberships remain. Restoration reactivates the selected facility membership. The audit event is now named `FACILITY_USER_ACCESS_CHANGED` to match the operation.

## UI authority alignment

Ordinary facility ADMIN no longer receives controls for global profile editing or global password reset. Those server operations were already denied by the global mutation boundary; hiding them removes a misleading production UI without weakening backend enforcement.

## Internal billing

Internal Medora billing is unchanged and remains outside this administration production program.
