-- Phase 15F-C: Lab / radiology effective clinical timestamps (documented times preserved)

ALTER TYPE "AuditAction" ADD VALUE 'LAB_TIME_ADJUSTED';
ALTER TYPE "AuditAction" ADD VALUE 'RADIOLOGY_TIME_ADJUSTED';

ALTER TABLE "OrderItem" ADD COLUMN "documentedCollectedAt" TIMESTAMP(3),
ADD COLUMN "effectiveCollectedAt" TIMESTAMP(3),
ADD COLUMN "effectiveCollectedAtSetAt" TIMESTAMP(3),
ADD COLUMN "effectiveCollectedAtSetByUserId" TEXT,
ADD COLUMN "effectiveCollectedAtReason" TEXT,
ADD COLUMN "effectiveCollectedAtVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "documentedReceivedAt" TIMESTAMP(3),
ADD COLUMN "effectiveReceivedAt" TIMESTAMP(3),
ADD COLUMN "effectiveReceivedAtSetAt" TIMESTAMP(3),
ADD COLUMN "effectiveReceivedAtSetByUserId" TEXT,
ADD COLUMN "effectiveReceivedAtReason" TEXT,
ADD COLUMN "effectiveReceivedAtVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "documentedPerformedAt" TIMESTAMP(3),
ADD COLUMN "effectivePerformedAt" TIMESTAMP(3),
ADD COLUMN "effectivePerformedAtSetAt" TIMESTAMP(3),
ADD COLUMN "effectivePerformedAtSetByUserId" TEXT,
ADD COLUMN "effectivePerformedAtReason" TEXT,
ADD COLUMN "effectivePerformedAtVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Result" ADD COLUMN "effectiveResultedAt" TIMESTAMP(3),
ADD COLUMN "effectiveResultedAtSetAt" TIMESTAMP(3),
ADD COLUMN "effectiveResultedAtSetByUserId" TEXT,
ADD COLUMN "effectiveResultedAtReason" TEXT,
ADD COLUMN "effectiveResultedAtVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "effectiveFinalizedAt" TIMESTAMP(3),
ADD COLUMN "effectiveFinalizedAtSetAt" TIMESTAMP(3),
ADD COLUMN "effectiveFinalizedAtSetByUserId" TEXT,
ADD COLUMN "effectiveFinalizedAtReason" TEXT,
ADD COLUMN "effectiveFinalizedAtVersion" INTEGER NOT NULL DEFAULT 0;
