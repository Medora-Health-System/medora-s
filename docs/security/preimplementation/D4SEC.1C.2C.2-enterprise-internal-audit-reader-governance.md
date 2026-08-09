# D4SEC.1C.2C.2 preimplementation decision

## Approved design

The repository audit is `GO` for a no-migration/no-seed implementation. Add `GET /platform/audit/events` as a distinct authenticated namespace. Do not add roles, grants, email rules, facility membership, web UI, export, retention execution, or D4SEC.1C.3 capability structures.

Authorization occurs inside the enterprise service, adjacent to the query, by calling `resolvePlatformAuthority(prisma, req.user.userId)`. The JWT establishes the caller's immutable User.id only. The resolver's active User + capability flag + active database role-assignment conjunction is the sole bridge. `MEDORA_SUPER_ADMIN`, `canCreateFacilities`, email, facility headers, supplied filters and cursors independently grant nothing.

## Data contract and controls

Return ID, timestamp, action, normalized event/outcome/severity/source operation when safely represented, immutable actor ID plus safe name/current active-state context, facility ID plus safe name/current active-state context, entity type/ID, and allowlisted semantic evidence. Names and active flags interpret retained parent records but do not replace immutable IDs. System and global events have explicit neutral representations. Inactive records remain readable.

Raw metadata is forbidden. A centralized allowlist omits unknown values, nested arbitrary objects, secret/credential markers and clinical/PHI markers case-insensitively. This is intentionally not claimed as a universal PHI classifier. Patient linkage and request IP/user-agent are not projected.

Support exact date range (default seven days; maximum 366), facility ID, actor User.id, `AuditAction`, entity type/ID, normalized outcome and severity. Unknown controls fail strict validation. Pages default to 50 and cap at 100, ordered `(createdAt DESC,id DESC)`. Cursor scope includes the complete non-cursor query fingerprint, preventing reuse against another query.

A successful page appends exactly one `ENTERPRISE_AUDIT_ACCESSED` event through the authoritative security-admin adapter in the same Prisma transaction. The selected page is materialized before this append, preventing recursion; returned rows are never copied into evidence. Transaction-bound audit failure fails the successful read closed. Authenticated authority denial records one `ENTERPRISE_AUDIT_ACCESS_DENIED` through existing configurable AuditService behavior; unauthenticated traffic is stopped by JWT and is not logged to avoid noise.

Customer `GET /admin/audit/events` is unchanged. Export and destructive disposition remain deferred. Future D4SEC.1C.3 must introduce independently governed `AUDIT_VIEW`/`AUDIT_EXPORT`-style staff capabilities without weakening this boundary.
