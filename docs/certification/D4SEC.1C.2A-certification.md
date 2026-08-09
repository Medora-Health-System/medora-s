# D4SEC.1C.2A certification — audit read isolation and redaction

## Verdict

**GO for the D4SEC.1C.2A P0 slice only.** This is not a certification of the complete D4SEC.1C.2 program.

## Evidence matrix

| Requirement | Evidence |
|---|---|
| Facility A active ADMIN reads A | Focused service test asserts exact membership predicate and successful projection. |
| A cannot read B; substituted header context | Cross-tenant request reaches the same exact-facility assertion and fails `403`. |
| Query/path substitution | Strict DTO rejects unknown facility/user/page inputs; no facility path route exists. |
| Inactive membership/facility; non-ADMIN | Shared policy predicate requires active membership, ADMIN role, and active facility; focused denial cases cover each state. |
| Platform access | Existing `resolvePlatformAuthority` bypass is exercised; no email authority is introduced. |
| Platform identity redaction | Projection test proves no actor User.id or secret/email value and neutral platform label. |
| Internal exact attribution | Test fixture/source row retains exact platform actor User.id; schema and writes are unchanged. |
| Cursor/filter isolation | Focused test inspects Prisma `where` and proves facility predicate remains alongside cursor, actor, encounter/entity filters. |
| Direct lookup | Audit found no direct audit-log ID endpoint. |
| Empty/invalid context | Controller tests prove missing facility and identity fail closed. |
| Secret/PHI safety | Actor email/IP/user-agent are not selected; metadata remains allowlisted; projection test excludes auth material. |
| Existing UI | Frontend contract removes raw actor ID while retaining the fields the current table renders. |

## Schema, migration, and seed assessment

- Prisma schema: unchanged / not required.
- Local migration: not required and not created.
- Production migration: not required and not created.
- Local seed: not required and not run.
- Production seed: not required and not run.
- Production data: not accessed or changed.

## Residual risk and deferrals

The current codebase has no dedicated internal enterprise audit reader; the authoritative database record remains available for a future explicitly authorized internal projection. Exact staff-category labels cannot be introduced before D4SEC.1C.3, so all authoritative platform actors share one neutral label. Actor-FK immutability and remaining audit lifecycle/certification work remain D4SEC.1C.2B+.

No deployment or merge is part of this certification.
