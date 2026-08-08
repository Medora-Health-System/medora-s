# D4SEC.1C.1 certification

## Security verdict

**PASS subject to the recorded validation results.** Tenant-local ADMIN authority is contained to facility-local membership data. Global identity, account status, password/session/MFA, and billing identity changes require authoritative platform authority.

## Certification cases

The implementation covers tenant-scoped listing/direct lookup, other-facility mutation denial, deterministic shared-user handling, local role preservation, global status/email/password/MFA/billing denial, platform role/principal protection, self-escalation denial, facility/body/header/department substitution failure, and legitimate ordinary local role administration. D4SEC.1A's database-backed platform-principal resolver remains in use; no email allowlist or email-derived authority was introduced.

## Migration and seed

Prisma migration: not required. Local migration: not required. Production migration: not required. Local seed: not required. Production seed: not required.

## Residual risk and deferrals

Existing global fields remain structurally shared, so future legitimate customer workflows need explicit governance rather than restoration of tenant writes. Professional credential ownership is deferred to D4SEC.1C.2. Medora employee classification and capability grants are deferred to D4SEC.1C.3. Governed support recovery is deferred to D4SEC.1C.5. This phase adds no capability table, employee role, or staff classification.

No production data was accessed or changed, and no merge or deployment was performed.
