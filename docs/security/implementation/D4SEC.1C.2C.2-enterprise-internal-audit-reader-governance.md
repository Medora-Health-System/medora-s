# D4SEC.1C.2C.2 implementation

## Runtime boundary

`PlatformAuditModule` registers `GET /platform/audit/events`. The controller uses JWT authentication and strict Zod query validation. It deliberately does not use facility-role authorization; `PlatformAuditService` re-resolves the authenticated User.id with authoritative D4SEC.1A `resolvePlatformAuthority` before constructing any query.

The customer reader remains `GET /admin/audit/events` with exact active-facility ADMIN authorization, tenant predicate and platform-actor neutralization. No customer code or response contract was changed.

## Projection and history

The enterprise projection provides:

- audit `id`, ISO `timestamp`, `action`;
- allowlisted `event`, `outcome`, `severity`, `sourceOperation`, and semantic `evidence`;
- actor `{ userId, displayName, isActive, attribution }`, or neutral System representation;
- facility `{ facilityId, displayName, isActive }`, or neutral Global representation;
- entity `{ type, id }`.

Relations are loaded without `isActive` predicates, so deactivated actors and inactive facilities retain attribution. No current membership is required. Active state is context, not authority or historical truth. Null actor/facility rows remain visible. Facility filters also do not require an active Facility.

`projectEnterpriseAuditMetadata` is a centralized fail-closed allowlist. It excludes secret, password, credential, token, Authorization/API key, MFA secret/recovery and patient/clinical/narrative markers case-insensitively. It omits arbitrary/nested legacy metadata and does not project patientId, encounterId, orderId, IP or user-agent. This minimizes PHI without falsely claiming universal classification.

## Search and auditing

Supported filters are ISO timestamp range, facility UUID, actor UUID, action enum, entity type, entity ID, normalized outcome and severity. Default window is seven days, maximum window 366 days. Limit defaults to 50 and is capped at 100. Ordering is deterministic newest-first by timestamp then ID. The stateless opaque cursor carries the resolved effective `from`/`to` timestamps and a SHA-256 fingerprint over those timestamps plus every normalized filter and the page limit. On a follow-up that omits dates, the server reuses the carried window, reconstructs the effective scope from the request, and validates it against the fingerprint; changed filters/limit, malformed payloads, and explicit date mismatches are rejected. Filters, identifiers, and cursor possession never participate in authorization.

Each successful page selection is followed by one transaction-bound `VIEW`/`EnterpriseAuditReader` row with semantic event `ENTERPRISE_AUDIT_ACCESSED`, high severity, success outcome, operation, access scope, filter classes, facility-filter/cursor booleans and result count. It contains no returned records or PHI. Selection precedes insertion, so the access event cannot enter its own result and no read hook exists to recurse. A transaction-bound write failure aborts the read.

An authenticated failed platform-authority decision emits `ENTERPRISE_AUDIT_ACCESS_DENIED` with the resolver reason and no supplied identifiers. It follows existing AuditService configured failure semantics (best effort by default; fail closed when configured for critical writes), so denial-audit storage failure does not grant access and the denial still returns 403. Unauthenticated requests are rejected before service invocation and intentionally not persisted.

## Deferred governance

No export endpoint exists or was added. Future governed export requires its own D4SEC.1C.3 capability, purpose/ticket, bounded same projection, artifact encryption/hash/expiry, download audit and PHI/retention policy. No retention executor, deletion, legal-hold table or archive was added. Routine destructive deletion remains prohibited; legal hold must override future disposition and archive verification/approval is prerequisite. D4SEC.1C.3 was not started.
