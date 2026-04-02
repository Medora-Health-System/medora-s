-- CreateTable
CREATE TABLE "MedicationAdministration" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "administeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administeredByUserId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicationAdministration_facilityId_idx" ON "MedicationAdministration"("facilityId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_patientId_idx" ON "MedicationAdministration"("patientId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_encounterId_idx" ON "MedicationAdministration"("encounterId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_orderItemId_idx" ON "MedicationAdministration"("orderItemId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_administeredAt_idx" ON "MedicationAdministration"("administeredAt");

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_administeredByUserId_fkey" FOREIGN KEY ("administeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
