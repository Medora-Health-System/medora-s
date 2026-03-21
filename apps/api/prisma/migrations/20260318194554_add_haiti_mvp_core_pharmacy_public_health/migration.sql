-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('ACTIVE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('RECEIPT', 'DISPENSE', 'ADJUSTMENT', 'WASTE');

-- CreateEnum
CREATE TYPE "DiseaseCaseStatus" AS ENUM ('SUSPECTED', 'CONFIRMED', 'RULED_OUT');

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "DiagnosisStatus" NOT NULL DEFAULT 'ACTIVE',
    "onsetDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "catalogMedicationId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "lotNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "performedByUserId" TEXT NOT NULL,
    "patientId" TEXT,
    "encounterId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationDispense" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "catalogMedicationId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantityDispensed" INTEGER NOT NULL,
    "dosageInstructions" TEXT,
    "dispensedByUserId" TEXT NOT NULL,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationDispense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccineCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaccineCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccineAdministration" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT,
    "vaccineCatalogId" TEXT NOT NULL,
    "doseNumber" INTEGER,
    "lotNumber" TEXT,
    "administeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administeredByUserId" TEXT,
    "nextDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaccineAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseCaseReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT,
    "diseaseCode" TEXT NOT NULL,
    "diseaseName" TEXT NOT NULL,
    "status" "DiseaseCaseStatus" NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onsetDate" TIMESTAMP(3),
    "commune" TEXT,
    "department" TEXT,
    "notes" TEXT,
    "reportedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiseaseCaseReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Diagnosis_patientId_idx" ON "Diagnosis"("patientId");

-- CreateIndex
CREATE INDEX "Diagnosis_encounterId_idx" ON "Diagnosis"("encounterId");

-- CreateIndex
CREATE INDEX "Diagnosis_facilityId_idx" ON "Diagnosis"("facilityId");

-- CreateIndex
CREATE INDEX "Diagnosis_status_idx" ON "Diagnosis"("status");

-- CreateIndex
CREATE INDEX "Diagnosis_code_idx" ON "Diagnosis"("code");

-- CreateIndex
CREATE INDEX "InventoryItem_facilityId_idx" ON "InventoryItem"("facilityId");

-- CreateIndex
CREATE INDEX "InventoryItem_catalogMedicationId_idx" ON "InventoryItem"("catalogMedicationId");

-- CreateIndex
CREATE INDEX "InventoryItem_isActive_idx" ON "InventoryItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_facilityId_sku_key" ON "InventoryItem"("facilityId", "sku");

-- CreateIndex
CREATE INDEX "InventoryTransaction_inventoryItemId_idx" ON "InventoryTransaction"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_facilityId_idx" ON "InventoryTransaction"("facilityId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_type_idx" ON "InventoryTransaction"("type");

-- CreateIndex
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "MedicationDispense_patientId_idx" ON "MedicationDispense"("patientId");

-- CreateIndex
CREATE INDEX "MedicationDispense_encounterId_idx" ON "MedicationDispense"("encounterId");

-- CreateIndex
CREATE INDEX "MedicationDispense_facilityId_idx" ON "MedicationDispense"("facilityId");

-- CreateIndex
CREATE INDEX "MedicationDispense_inventoryItemId_idx" ON "MedicationDispense"("inventoryItemId");

-- CreateIndex
CREATE INDEX "MedicationDispense_dispensedAt_idx" ON "MedicationDispense"("dispensedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VaccineCatalog_code_key" ON "VaccineCatalog"("code");

-- CreateIndex
CREATE INDEX "VaccineAdministration_patientId_idx" ON "VaccineAdministration"("patientId");

-- CreateIndex
CREATE INDEX "VaccineAdministration_facilityId_idx" ON "VaccineAdministration"("facilityId");

-- CreateIndex
CREATE INDEX "VaccineAdministration_encounterId_idx" ON "VaccineAdministration"("encounterId");

-- CreateIndex
CREATE INDEX "VaccineAdministration_vaccineCatalogId_idx" ON "VaccineAdministration"("vaccineCatalogId");

-- CreateIndex
CREATE INDEX "VaccineAdministration_administeredAt_idx" ON "VaccineAdministration"("administeredAt");

-- CreateIndex
CREATE INDEX "DiseaseCaseReport_facilityId_idx" ON "DiseaseCaseReport"("facilityId");

-- CreateIndex
CREATE INDEX "DiseaseCaseReport_patientId_idx" ON "DiseaseCaseReport"("patientId");

-- CreateIndex
CREATE INDEX "DiseaseCaseReport_diseaseCode_idx" ON "DiseaseCaseReport"("diseaseCode");

-- CreateIndex
CREATE INDEX "DiseaseCaseReport_status_idx" ON "DiseaseCaseReport"("status");

-- CreateIndex
CREATE INDEX "DiseaseCaseReport_reportedAt_idx" ON "DiseaseCaseReport"("reportedAt");

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_catalogMedicationId_fkey" FOREIGN KEY ("catalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_catalogMedicationId_fkey" FOREIGN KEY ("catalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_dispensedByUserId_fkey" FOREIGN KEY ("dispensedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineAdministration" ADD CONSTRAINT "VaccineAdministration_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineAdministration" ADD CONSTRAINT "VaccineAdministration_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineAdministration" ADD CONSTRAINT "VaccineAdministration_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineAdministration" ADD CONSTRAINT "VaccineAdministration_vaccineCatalogId_fkey" FOREIGN KEY ("vaccineCatalogId") REFERENCES "VaccineCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineAdministration" ADD CONSTRAINT "VaccineAdministration_administeredByUserId_fkey" FOREIGN KEY ("administeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseCaseReport" ADD CONSTRAINT "DiseaseCaseReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseCaseReport" ADD CONSTRAINT "DiseaseCaseReport_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseCaseReport" ADD CONSTRAINT "DiseaseCaseReport_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseCaseReport" ADD CONSTRAINT "DiseaseCaseReport_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
