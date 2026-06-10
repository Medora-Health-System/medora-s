-- M1.8B.7G — dormant MedicationDoseInstance persistence (no dose generation, no MAR reads)

-- AlterTable
ALTER TABLE "MedicationAdministration" ADD COLUMN "medicationDoseInstanceId" TEXT;

-- CreateTable
CREATE TABLE "MedicationDoseInstance" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "medicationOrderScheduleId" TEXT NOT NULL,
    "doseSequenceNumber" INTEGER NOT NULL,
    "doseKind" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "dueWindowStartAt" TIMESTAMP(3) NOT NULL,
    "dueWindowEndAt" TIMESTAMP(3) NOT NULL,
    "overdueAt" TIMESTAMP(3),
    "doseStatus" TEXT NOT NULL,
    "scheduleClassificationSnapshot" TEXT NOT NULL,
    "frequencySnapshotJson" JSONB NOT NULL,
    "medicationCatalogSnapshotJson" JSONB NOT NULL,
    "orderedDoseSnapshotJson" JSONB NOT NULL,
    "infusionSessionId" TEXT,
    "responseDueAt" TIMESTAMP(3),
    "terminalMedicationAdministrationId" TEXT,
    "missedReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationDoseInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicationDoseInstance_terminalMedicationAdministrationId_key" ON "MedicationDoseInstance"("terminalMedicationAdministrationId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationDoseInstance_medicationOrderScheduleId_doseSequenceNumber_key" ON "MedicationDoseInstance"("medicationOrderScheduleId", "doseSequenceNumber");

-- CreateIndex
CREATE INDEX "MedicationDoseInstance_facilityId_encounterId_doseStatus_scheduledAt_idx" ON "MedicationDoseInstance"("facilityId", "encounterId", "doseStatus", "scheduledAt");

-- CreateIndex
CREATE INDEX "MedicationDoseInstance_orderItemId_idx" ON "MedicationDoseInstance"("orderItemId");

-- CreateIndex
CREATE INDEX "MedicationDoseInstance_infusionSessionId_idx" ON "MedicationDoseInstance"("infusionSessionId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_medicationDoseInstanceId_idx" ON "MedicationAdministration"("medicationDoseInstanceId");

-- AddForeignKey
ALTER TABLE "MedicationDoseInstance" ADD CONSTRAINT "MedicationDoseInstance_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDoseInstance" ADD CONSTRAINT "MedicationDoseInstance_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDoseInstance" ADD CONSTRAINT "MedicationDoseInstance_infusionSessionId_fkey" FOREIGN KEY ("infusionSessionId") REFERENCES "InfusionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDoseInstance" ADD CONSTRAINT "MedicationDoseInstance_medicationOrderScheduleId_fkey" FOREIGN KEY ("medicationOrderScheduleId") REFERENCES "MedicationOrderSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDoseInstance" ADD CONSTRAINT "MedicationDoseInstance_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDoseInstance" ADD CONSTRAINT "MedicationDoseInstance_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDoseInstance" ADD CONSTRAINT "MedicationDoseInstance_terminalMedicationAdministrationId_fkey" FOREIGN KEY ("terminalMedicationAdministrationId") REFERENCES "MedicationAdministration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_medicationDoseInstanceId_fkey" FOREIGN KEY ("medicationDoseInstanceId") REFERENCES "MedicationDoseInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
