-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CHART_OPEN';
ALTER TYPE "AuditAction" ADD VALUE 'TRIAGE_SAVE';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_ACK';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_START';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_COMPLETE';
ALTER TYPE "AuditAction" ADD VALUE 'RESULT_VERIFY';
ALTER TYPE "AuditAction" ADD VALUE 'CRITICAL_FLAG';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'DRAFT';
ALTER TYPE "OrderStatus" ADD VALUE 'SIGNED';
ALTER TYPE "OrderStatus" ADD VALUE 'ACKNOWLEDGED';
ALTER TYPE "OrderStatus" ADD VALUE 'RESULTED';

-- CreateTable
CREATE TABLE "Triage" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "onsetAt" TIMESTAMP(3),
    "esi" INTEGER,
    "vitalsJson" JSONB,
    "strokeScreen" JSONB,
    "sepsisScreen" JSONB,
    "triageCompleteAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Triage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "resultData" JSONB,
    "resultText" TEXT,
    "criticalValue" BOOLEAN NOT NULL DEFAULT false,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "acknowledgedByProviderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Triage_encounterId_key" ON "Triage"("encounterId");

-- CreateIndex
CREATE INDEX "Triage_facilityId_idx" ON "Triage"("facilityId");

-- CreateIndex
CREATE INDEX "Triage_encounterId_idx" ON "Triage"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_orderItemId_key" ON "Result"("orderItemId");

-- CreateIndex
CREATE INDEX "Result_facilityId_idx" ON "Result"("facilityId");

-- CreateIndex
CREATE INDEX "Result_orderItemId_idx" ON "Result"("orderItemId");

-- CreateIndex
CREATE INDEX "Result_criticalValue_idx" ON "Result"("criticalValue");

-- AddForeignKey
ALTER TABLE "Triage" ADD CONSTRAINT "Triage_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Triage" ADD CONSTRAINT "Triage_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
