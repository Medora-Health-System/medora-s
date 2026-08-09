# D4SEC.1C.2C.1 — Audit integrity and historical attribution preimplementation gate

**Base:** `081cf6d` (merged PR #91), with the governing D4SEC.1C.2C audit at `docs/security/audit/D4SEC.1C.2C-audit-integrity-retention-enterprise-access-audit.md`.

## Current schema and lifecycle evidence

`AuditLog` has UUID `id`, database-default `createdAt`, nullable `userId`, `facilityId`, `patientId`, `encounterId`, and `orderId`, nullable `ip`, `userAgent`, `entityId`, and JSON `metadata`, and required `entityType`/`AuditAction`. It has indexes on user, facility, timestamp, and encounter; no update timestamp or uniqueness beyond its primary key.

The initial migration created `AuditLog_userId_fkey` and `AuditLog_facilityId_fkey` as `ON DELETE SET NULL ON UPDATE CASCADE`. Consequently, a destructive User or Facility deletion can silently erase historical attribution. Nulls are also legitimate for legacy/system/global rows, so neither scalar can safely become `NOT NULL` and this slice does not attempt that conversion.

Repository search found no production controller/service User deletion, Facility deletion, or `AuditLog.update`, `updateMany`, `delete`, or `deleteMany`. Test teardown deletes synthetic users/facilities. Existing restrictive relationships often already prevent those fixture deletions when dependent domain data remains. Operational lifecycle uses `User.isActive` and `Facility.isActive`; deactivation updates the parent without touching audit FKs.

The exceptional `apps/api/scripts/clearPatientData.ts` path previously called `tx.auditLog.deleteMany` for rows linked to a patient, encounter, or order. A single `CONFIRM_RESET=true` flag and arbitrary `DATABASE_URL` allowed execution, so it was capable of erasing production audit history if invoked with production credentials.

## Proposed implementation and migration

1. Keep both FK scalars nullable to preserve legitimate and unknown legacy state.
2. Add explicit Prisma `onDelete: Restrict` to only the AuditLog `User` and `Facility` relations.
3. In exactly one migration, perform immutable-ID-only orphan preflight checks, fail the transaction if either is found, then replace only those two constraints with `ON DELETE RESTRICT ON UPDATE CASCADE`.
4. Do not update, delete, backfill, fabricate, or identify any audit relationship. Email is absent from both migration and model.
5. Preserve the existing create-only `AuditService` API and all clinical/billing/compliance/security-admin create paths. Add a focused static regression boundary that rejects production `src` calls to AuditLog mutation/deletion operations.
6. Remove audit deletion from `clearPatientData`; require development/test mode, both explicit confirmations, and a loopback database hostname. Existing nullable clinical FKs may clear fixture links, but the authoritative audit row survives.

## Existing-row compatibility proof

The change is safe for null rows because nullable columns and existing null values remain unchanged. It is safe for valid non-null rows because they already satisfy the active FK constraints. The immutable-ID preflight is defensive against drift or manually disabled constraints. It neither logs sensitive values nor repairs data. If an orphan exists, the `DO` block raises before either FK is dropped; Prisma migration runs the SQL transactionally, so the database retains its prior constraints.

No production data was inspected. Deployment must separately run reviewed, read-only counts on the target under explicit authorization. If they show an orphan, deployment is **NO-GO** pending ID-based provenance investigation; never use email or guess an actor/facility.

## Rollback and failure behavior

Failure before commit leaves both previous constraints in place. After successful deployment, rollback is forward-fix: do not restore `SET NULL`, because doing so reopens attribution loss. If application code attempts destructive User/Facility deletion, PostgreSQL rejects it while deactivation continues to work. An emergency restore can lose post-backup audits and therefore requires incident reconciliation; it is not a schema rollback strategy.

Local migration creation/application command: `npm run prisma:migrate --workspace=@medora/api`. Production command only after merge and explicit authorization: `npm run migrate:deploy --workspace=@medora/api`. The production command is documented, not executed. No seed is required.

## Gate verdict

**GO for the narrow implementation.** Current FK enforcement proves valid non-null rows, nullable legacy rows remain untouched, and the migration fails rather than inventing identity. Scope excludes employee capabilities, enterprise audit reading/export, general metadata redesign, audit retention, and D4SEC.1C.2C.2.
