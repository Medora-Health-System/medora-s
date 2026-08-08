# D4SEC.1A certification

## Verdict

**PASS FOR CODE REVIEW; PRODUCTION RECOVERY NOT AUTHORIZED.** Platform authorization no longer consumes an email address. Production certification remains conditional on deployment and the D4SEC.1B prerequisites.

## Evidence matrix

| Requirement | Evidence |
|---|---|
| Email change preserves authority | Pure resolver has no email input; regression test uses immutable state |
| Historical email grants nothing | Resolver query does not select email; regression test supplies the historical address with no authoritative state and is denied |
| Active authoritative operator works | Resolver and RolesGuard focused tests |
| Inactive or incomplete state denied | Resolver matrix and RolesGuard test |
| Facility context retained | RolesGuard missing/invalid facility and non-opted-in route tests |
| Profile/email, password, status, roles, billing protected | Parameterized `AdminUsersService` regression tests and pre-write server assertion |
| MFA protected | `MfaService.adminReset` pre-write authoritative target assertion |
| Raw API bypass prevented | Protection is in services invoked by controllers, not UI; controller DTOs cannot bypass the service assertions |
| Ordinary facility administration retained | Existing admin-user creation/update tests |
| Specialized roles not broadened | Resolver recognizes only `MEDORA_SUPER_ADMIN`; existing role checks remain unchanged |
| Audit safety | Denial metadata contains IDs and mutation category only |
| Schema migration | Not required |
| Production state | Not read or changed |

## Residual risks

The current schema models the global role through facility-shaped `UserRole` rows. D4SEC.1A deliberately reuses this authoritative state; a future governance phase may model global assignments explicitly. A database operator can still alter both role and capability state, which must remain privileged and audited operational access. Historical migration and documentation strings remain searchable but are not executable authorization. Broader internal-staff hiding/capability separation is deferred to D4SEC.1C.
