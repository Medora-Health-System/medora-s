-- Medication order edit / discontinue lifecycle (MEDUI.ORDERS.MEDICATION_ORDER_EDIT_AND_DISCONTINUE_LIFECYCLE.1)

CREATE TYPE "MedicationOrderLifecycleStatus" AS ENUM (
  'ACTIVE',
  'ON_HOLD',
  'DISCONTINUED',
  'COMPLETED',
  'EXPIRED',
  'SUPERSEDED',
  'CANCELED_ENTERED_IN_ERROR'
);

ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'DISCONTINUED';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'ON_HOLD';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'RESUMED';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'MODIFIED';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'SUPERSEDED';

ALTER TABLE "OrderItem"
  ADD COLUMN "medicationLifecycleStatus" "MedicationOrderLifecycleStatus",
  ADD COLUMN "medicationLifecycleAt" TIMESTAMP(3),
  ADD COLUMN "medicationLifecycleByUserId" TEXT,
  ADD COLUMN "medicationLifecycleReason" TEXT,
  ADD COLUMN "medicationLifecycleNote" TEXT,
  ADD COLUMN "replacesOrderItemId" TEXT;

CREATE INDEX "OrderItem_medicationLifecycleStatus_idx" ON "OrderItem"("medicationLifecycleStatus");
CREATE INDEX "OrderItem_replacesOrderItemId_idx" ON "OrderItem"("replacesOrderItemId");

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_replacesOrderItemId_fkey"
  FOREIGN KEY ("replacesOrderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
