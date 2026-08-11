# D4SEC.1C.5C — Staff-management audit

## Current call chain and root cause
D4SEC.1C.4B supplied a principal-only direct lifecycle endpoint and atomic service. D4SEC.1C.4C then classified `STAFF_PROVISION` in `OPERATION_POLICY` with `dualControl: true` and added a second transactional provisioning adapter inside `PrivilegedActionService`. D4SEC.1C.5/5A wired the staff form to `platformPrivilegedActionsApi.create`, producing `PrivilegedActionRequest`; approve required another active holder of `PRIVILEGED_ACTION_APPROVE`, requester/target independence, two recent session assurances, and later execution. D4SEC.1C.5B only resolved initial-approver bootstrap deadlock. Thus the UI deliberately bypassed the existing direct endpoint, while that endpoint and service still required Platform Principal.

## Reuse findings
The schema already has authoritative `User`, unique `MedoraStaffProfile.userId`, persona enum, capability catalog/grants, lifecycle events, privileged requests, and critical `AuditLog`; no schema change is justified. `PlatformCapabilitiesGuard`, `resolvePlatformAuthority`, `resolvePlatformCapabilities`, persona templates, session-bound MFA, transactions, and `logSecurityAdminAudit` are reused.

## Risk findings
Provisioning validation and evidence can be atomic in the existing service because the critical audit accepts the Prisma transaction. A failed audit rejects the transaction. Guard denials now emit the existing immutable denial event before returning canonical `STAFF_PROVISION_FORBIDDEN`; stale MFA remains `RECENT_SESSION_MFA_REQUIRED`. Target inactivity and duplication return stable safe codes.

The direct provision path never writes `PrivilegedActionRequest`. The legacy privileged service rejects an attempt to submit a non-dual-control `STAFF_PROVISION` request with `OPERATION_REQUIRES_DIRECT_MUTATION`, preventing accidental regression. CRITICAL manual grants remain routed to dual control; non-critical grants and authority-reducing revocations are direct under their respective capabilities.
