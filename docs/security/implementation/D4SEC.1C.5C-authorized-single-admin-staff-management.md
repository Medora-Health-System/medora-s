# D4SEC.1C.5C — Implementation

`POST /platform/staff/:id/provision` now requires `STAFF_PROVISION` (with the existing Platform Principal override), recent session-bound MFA, and the strict canonical persona DTO. The service independently re-resolves principal/capability authority, refuses self mutation, missing/inactive targets, and every existing staff profile, then creates the profile, persona-derived non-critical grants, lifecycle record, and required audit in one transaction.

The success audit contains actor attribution through `AuditLog.userId` and evidence containing target, profile entity ID, old/new persona and lifecycle state, capabilities added/revoked, reason, optional ticket/reference, and result. Guard authorization/MFA denials use the same critical audit policy. No secrets or session assertions are evidence.

The staff page calls the direct endpoint, repeats automatically only after same-session MFA step-up, refreshes its eligible/staff state, and confirms success. Known codes are rendered with actionable English and French messages. Canonical values are not translated in transport/storage.

The explicit dual-control table now marks staff provisioning false and keeps manual CRITICAL/root-equivalent capability grants, facility activation, and MFA reset true. The privileged request service refuses operations not explicitly dual-controlled. Existing Platform Principal resolution is unchanged and remains sufficient for direct ordinary administration.

Prisma schema changed: NO. Migration required: NO. Seed required: NO.
