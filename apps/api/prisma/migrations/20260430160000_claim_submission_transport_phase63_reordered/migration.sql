-- Phase 6.3 (reordered): BillingEvent.updatedAt — drop database default so Prisma @updatedAt controls bumps.
-- Safe after 20260425120000_billing_event_ledger (BillingEvent exists).
-- Idempotent: only drops default when present; no-ops if table missing or default already absent.

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'BillingEvent'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'BillingEvent'
      AND column_name = 'updatedAt'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "BillingEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END
$migration$;
