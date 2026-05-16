-- Phase 15F-A: CARE / procedure effective clinical time (separate from system documented time)

ALTER TYPE "AuditAction" ADD VALUE 'CARE_PROCEDURE_EFFECTIVE_TIME_ADJUSTED';

ALTER TABLE "OrderItem" ADD COLUMN "documentedCompletedAt" TIMESTAMP(3),
ADD COLUMN "effectiveClinicalAt" TIMESTAMP(3),
ADD COLUMN "effectiveClinicalAtSetAt" TIMESTAMP(3),
ADD COLUMN "effectiveClinicalAtSetByUserId" TEXT,
ADD COLUMN "effectiveClinicalAtReason" TEXT,
ADD COLUMN "effectiveClinicalAtVersion" INTEGER NOT NULL DEFAULT 0;
