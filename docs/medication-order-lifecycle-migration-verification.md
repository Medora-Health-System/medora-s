# Medication order lifecycle — migration verification

Migration: `apps/api/prisma/migrations/20260910150000_medication_order_lifecycle/migration.sql`

## Schema alignment

- `MedicationOrderLifecycleStatus` enum matches `schema.prisma` `OrderItem.medicationLifecycleStatus`.
- Nullable lifecycle columns on `OrderItem`; no default at DB level.
- Application resolves `null` → **ACTIVE** via `resolveMedicationOrderLifecycleStatus()`.
- `replacesOrderItemId` FK uses `ON DELETE SET NULL` (non-destructive).
- New `OrderEventType` values added with `IF NOT EXISTS` (idempotent).

## Production safety

| Check | Result |
|-------|--------|
| Destructive DDL (DROP/TRUNCATE) | None |
| NOT NULL on existing rows | None — all new columns nullable |
| Legacy rows without lifecycle | Remain `NULL`; treated as ACTIVE in app |
| Index creation | Non-blocking additive indexes |
| FK to self (`replacesOrderItemId`) | SET NULL on delete |

## Rollback plan

1. Deploy previous application version (ignores lifecycle columns).
2. Optional SQL rollback (only if no lifecycle data must be preserved):

```sql
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_replacesOrderItemId_fkey";
DROP INDEX IF EXISTS "OrderItem_replacesOrderItemId_idx";
DROP INDEX IF EXISTS "OrderItem_medicationLifecycleStatus_idx";
ALTER TABLE "OrderItem"
  DROP COLUMN IF EXISTS "replacesOrderItemId",
  DROP COLUMN IF EXISTS "medicationLifecycleNote",
  DROP COLUMN IF EXISTS "medicationLifecycleReason",
  DROP COLUMN IF EXISTS "medicationLifecycleByUserId",
  DROP COLUMN IF EXISTS "medicationLifecycleAt",
  DROP COLUMN IF EXISTS "medicationLifecycleStatus";
-- Enum values on OrderEventType cannot be removed in PostgreSQL without type recreation.
-- MedicationOrderLifecycleStatus enum drop only if no column references it.
```

3. Re-run `prisma migrate deploy` after restoring migration folder if re-applying.

## Local verification commands

```bash
pnpm --filter @medora/api exec prisma migrate deploy
# or dev:
pnpm --filter @medora/api exec prisma migrate dev
pnpm --filter @medora/api exec prisma validate
```

## Legacy row compatibility test

After migration, existing `OrderItem` rows with `medicationLifecycleStatus IS NULL` must:

- Appear as ACTIVE in UI and MAR actionability helpers.
- Accept discontinue/hold/edit lifecycle mutations.
- Not require backfill.
