# D4SEC.1C.3 repository security audit

## Verdict

**UserRole is not safe for global Medora staff capabilities.** `UserRole.facilityId` is required, its uniqueness includes facility, and it joins `Facility`, `Department`, and the clinical/customer `Role` catalog. Reusing it would manufacture a tenant membership, permit the same supposed authority to vary by facility, and couple platform operations to clinical RBAC. The additive global model below is required.

## Audit inventory (pre-change baseline)

1. **User:** UUID `id` is authoritative; unique mutable email, password hash, active flag, `canCreateFacilities`, TOTP/recovery state, sessions and facility roles share the row.
2. **UserRole:** required `userId`, `roleId`, and `facilityId`, optional department, active flag, unique `(userId, roleId, facilityId)`; explicitly documented facility-scoped.
3. **Role:** a small `RoleCode` catalog used by facility assignments; not a permission catalog.
4. **Facility scope:** tenant records and most clinical authorization use facility membership/context. A client facility value is not global authority.
5. **D4SEC.1A:** `resolvePlatformAuthority` loads active User by id and requires both `canCreateFacilities` and an active DB `MEDORA_SUPER_ADMIN` assignment. Email is absent. Facility context is separately required for opted-in tenant routes.
6. **RolesGuard:** evaluates authenticated server-derived facility roles; this remains the clinical/customer domain and must not consume platform grants.
7. **Admin authorization:** controllers use JWT plus roles/platform-principal checks. Enterprise audit uses its service's platform-authority resolver.
8. **Global/local split:** User is global; UserRole and customer ADMIN are facility-local. D4SEC.1A is the only pre-existing deliberately global operational authority.
9. **canCreateFacilities:** defense-in-depth half of D4SEC.1A, not independently authoritative and not a general permission.
10. **MEDORA_SUPER_ADMIN:** a RoleCode assignment is also only half of D4SEC.1A and must never become a capability by string comparison.
11. **Sessions:** `AuthSession` is per User, revocable, expiring, token-hash based; access JWT validation reloads the User and active facility roles.
12. **MFA:** User has encrypted TOTP, hashed one-use recovery codes, enabled timestamp and `mfaLastVerifiedAt`; the current capability phase does not claim recent-MFA enforcement.
13. **Activation:** `User.isActive` is the account gate. JWT validation currently rejects a missing user; the capability resolver adds its own explicit active-user gate.
14. **Deletion/deactivation:** admin mutation boundaries favor deactivation; restrictive capability FKs preserve actor, target, classification and grant history if deletion is attempted.
15. **Security audit:** `logSecurityAdminAudit` writes semantic, critical `AuditLog` rows, rejects secret-like metadata keys, accepts a transaction client, and preserves immutable actor User.id.
16. **Platform endpoints:** facility bootstrap/operations, announcements, and governed enterprise audit exist; `/platform/staff` and `/platform/capabilities` did not.
17. **Customer admin:** facility users and security operations exist and remain role/facility scoped; they cannot bootstrap global capability grants.
18. **Staff concepts:** no authoritative Medora employee/staff classification existed.
19. **Functional roles:** implementation/support/billing/compliance are not durable global personas. Some admin controllers approximate functions via ADMIN/super-admin roles, creating future role-explosion pressure.
20. **Capability-like flags:** `canCreateFacilities` is the notable boolean; MFA and facility configuration flags are state/policy, not global capability grants.
21. **Seeds:** root seed is broad and can create demo/bootstrap identities. Therefore catalog definitions belong in the reviewed migration, not general seed; no user/profile/grant is seeded.
22. **Indexes/constraints:** UUID PKs, role uniqueness, UserRole composite uniqueness, active indexes, and restrictive audit actor relation are established conventions. A partial unique index is needed for one active capability grant.
23. **Role explosion:** adding every platform operation to RoleCode would conflate personas, tenant membership, and independently revocable permissions.
24. **Tenant risk:** trusting facility headers, facility ADMIN, or UserRole would allow tenant authority to cross into global operations.
25. **Clinical coupling:** any profile-to-UserRole mapping could accidentally enable patient/chart routes. Platform resolution must not query facility roles or any clinical model.

## Decision

Use a one-to-one `MedoraStaffProfile` keyed by User.id, global `PlatformCapability`, and attributed/revocable `PlatformCapabilityGrant`. No facility scope is included in D4SEC.1C.3: listed capabilities are global operational authorities, while tenant/clinical access remains exclusively governed by existing facility membership. Future support PHI access requires a separate purpose-bound, time-bound workflow.
