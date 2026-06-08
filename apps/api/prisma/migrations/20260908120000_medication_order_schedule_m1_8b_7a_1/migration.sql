-- M1.8B.7A.1 — dormant MedicationOrderSchedule persistence (no backfill)

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "frequencyCode" TEXT;

-- CreateTable
CREATE TABLE "MedicationOrderSchedule" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "frequencyCode" TEXT NOT NULL,
    "catalogVersion" INTEGER NOT NULL,
    "frequencySnapshotJson" JSONB NOT NULL,
    "medicationCatalogSnapshotJson" JSONB NOT NULL,
    "scheduleClassification" TEXT NOT NULL,
    "scheduleStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersededByScheduleId" TEXT,
    "supersededAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancelReason" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationOrderSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicationOrderSchedule_facilityId_idx" ON "MedicationOrderSchedule"("facilityId");

-- CreateIndex
CREATE INDEX "MedicationOrderSchedule_encounterId_idx" ON "MedicationOrderSchedule"("encounterId");

-- CreateIndex
CREATE INDEX "MedicationOrderSchedule_orderId_idx" ON "MedicationOrderSchedule"("orderId");

-- CreateIndex
CREATE INDEX "MedicationOrderSchedule_orderItemId_idx" ON "MedicationOrderSchedule"("orderItemId");

-- CreateIndex
CREATE INDEX "MedicationOrderSchedule_scheduleStatus_idx" ON "MedicationOrderSchedule"("scheduleStatus");

-- CreateIndex
CREATE INDEX "MedicationOrderSchedule_scheduleClassification_idx" ON "MedicationOrderSchedule"("scheduleClassification");

-- CreateIndex
CREATE INDEX "OrderItem_frequencyCode_idx" ON "OrderItem"("frequencyCode");

-- One ACTIVE schedule per order item (hospital-grade invariant)
CREATE UNIQUE INDEX "MedicationOrderSchedule_one_active_per_order_item"
ON "MedicationOrderSchedule"("orderItemId")
WHERE "scheduleStatus" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "MedicationOrderSchedule" ADD CONSTRAINT "MedicationOrderSchedule_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSchedule" ADD CONSTRAINT "MedicationOrderSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSchedule" ADD CONSTRAINT "MedicationOrderSchedule_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSchedule" ADD CONSTRAINT "MedicationOrderSchedule_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSchedule" ADD CONSTRAINT "MedicationOrderSchedule_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSchedule" ADD CONSTRAINT "MedicationOrderSchedule_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSchedule" ADD CONSTRAINT "MedicationOrderSchedule_supersededByScheduleId_fkey" FOREIGN KEY ("supersededByScheduleId") REFERENCES "MedicationOrderSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSchedule" ADD CONSTRAINT "MedicationOrderSchedule_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
