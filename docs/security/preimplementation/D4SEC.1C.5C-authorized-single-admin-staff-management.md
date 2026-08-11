# D4SEC.1C.5C — Authorized single-administrator staff management

## Decision
Ordinary Medora Staff provisioning is a **one-person, capability-authorized operation**. The authenticated actor must be an active Platform Principal or active Medora Staff member resolving `STAFF_PROVISION`, and must have recent MFA assurance bound to the current session. MFA is assurance, not approval.

## Intended call chain
`POST /platform/staff/:userId/provision` → JWT → `PlatformCapabilitiesGuard` → Platform Principal or active-grant resolver → recent session MFA → strict persona/lifecycle DTO → `PlatformStaffService` target validation → one Prisma transaction → profile → persona grants → lifecycle event → critical immutable audit → response.

No `PrivilegedActionRequest` belongs in that chain. Identity is read from authoritative `User.id`, `email`, `firstName`, `lastName`, `isActive`, and `mfaEnabled`; neither username nor credentials/session material is projected.

## Governance boundary
The explicit `OPERATION_POLICY` is authoritative. Ordinary `STAFF_PROVISION` is direct. CRITICAL manual capability grants, facility activation changes, and MFA resets remain independent-approval operations. Creating/replacing Platform Principal authority, root-equivalent grants, capability bypasses, audit/security-control disablement, and protected invariant changes are never implicitly made direct. Unknown operations have no route and therefore fail closed.

Persona codes remain `IMPLEMENTATION`, `SUPPORT`, `BILLING_OPERATIONS`, `COMPLIANCE_SECURITY`, and `PLATFORM_OPERATIONS`; templates are reused and no role system is added. Clinical authorization, facility roles, MSPP roles, and patient-care authorization are out of scope.

Prisma schema changed: NO  
Migration required: NO  
Seed required: NO
