-- CreateEnum
CREATE TYPE "OrderItemLifecycleState" AS ENUM (
  'ORDERED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'COMPLETED',
  'REVIEWED',
  'CANCELLED'
);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "lifecycleState" "OrderItemLifecycleState" NOT NULL DEFAULT 'ORDERED';

-- Backfill from legacy `status` (most specific first)
UPDATE "OrderItem" SET "lifecycleState" = 'CANCELLED' WHERE "status" = 'CANCELLED';
UPDATE "OrderItem" SET "lifecycleState" = 'REVIEWED' WHERE "status" = 'VERIFIED';
UPDATE "OrderItem" SET "lifecycleState" = 'COMPLETED' WHERE "status" IN ('COMPLETED', 'RESULTED');
UPDATE "OrderItem" SET "lifecycleState" = 'IN_PROGRESS' WHERE "status" = 'IN_PROGRESS';
UPDATE "OrderItem" SET "lifecycleState" = 'ACKNOWLEDGED' WHERE "status" = 'ACKNOWLEDGED';
UPDATE "OrderItem" SET "lifecycleState" = 'ORDERED' WHERE "status" IN ('PLACED', 'PENDING', 'DRAFT', 'SIGNED');

CREATE INDEX "OrderItem_lifecycleState_idx" ON "OrderItem"("lifecycleState");
