# D4SEC.1C.2C.1 — Audit integrity and historical attribution implementation

## Scope and result

This slice implements only the integrity/attribution foundation approved by the D4SEC.1C.2C audit. It does not implement an internal reader, retention executor, export, employee capability, Platform Admin UI, or D4SEC.1C.2C.2.

## Implemented controls

* `AuditLog.userId` and `facilityId` remain nullable so legacy, system, and global events migrate without invented attribution.
* Their Prisma relations now explicitly use `onDelete: Restrict`. Deactivation (`isActive=false`) does not affect either FK; destructive parent deletion is rejected when attributed history exists.
* Migration `20261101120000_d4sec_1c2c1_audit_attribution_integrity` performs orphan preflights using only immutable IDs, then replaces the two `SET NULL` constraints with `RESTRICT`. It performs no AuditLog data mutation.
* The existing `AuditService` create contract and D4SEC.1C.2B helper are unchanged. A focused architecture test prevents production `src` from introducing `AuditLog.update`, `updateMany`, `delete`, or `deleteMany` calls and continues to verify create-only storage separately through existing suites.
* `clearPatientData.ts` no longer deletes any audit row. It is now gated to `NODE_ENV=development|test`, requires `CONFIRM_RESET=true`, requires the D4SEC confirmation phrase, and rejects every non-loopback database hostname. Audit rows survive; existing nullable clinical references follow existing FK semantics as local fixtures are cleared.

## Migration safety

Existing null values remain null. Existing non-null values must already resolve under the old active FKs; an explicit preflight nevertheless fails before constraint replacement if drift is present. No `NOT NULL`, row rewrite, actor/facility fabrication, email lookup, or destructive SQL is present. PostgreSQL/Prisma migration transaction failure preserves the old constraints. Rollback after successful deployment is a reviewed forward fix, never restoration of attribution-erasing `SET NULL` behavior.

Local command: `npm run prisma:migrate --workspace=@medora/api`.

Production command, only after merge and explicit authorization: `npm run migrate:deploy --workspace=@medora/api`.

Neither command was run against production. No seed is needed or changed.

## Boundary and residual scope

The application runtime remains create-only by implementation inventory and focused regression. This slice does not add a database-wide AuditLog update trigger because existing patient/encounter/order `SET NULL` FKs perform database-managed link updates during governed source-record lifecycle; comprehensive row immutability, tamper-evident digests, general evidence schemas, retention/legal hold, and privileged access belong to D4SEC.1C.2C.2 or later approved slices. Actor and facility attribution, however, can no longer be nulled by parent deletion.
