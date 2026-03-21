-- AlterTable
ALTER TABLE "CatalogMedication" ADD COLUMN     "displayNameFr" TEXT,
ADD COLUMN     "dosageForm" TEXT,
ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "isEssential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "route" TEXT,
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "sortPriority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "strength" TEXT,
ADD COLUMN     "therapeuticClass" TEXT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MedicationAlias" (
    "id" TEXT NOT NULL,
    "catalogMedicationId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "language" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityMedicationUsage" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "catalogMedicationId" TEXT NOT NULL,
    "inventoryAddsCount" INTEGER NOT NULL DEFAULT 0,
    "dispenseCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityMedicationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicationAlias_catalogMedicationId_idx" ON "MedicationAlias"("catalogMedicationId");

-- CreateIndex
CREATE INDEX "MedicationAlias_alias_idx" ON "MedicationAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationAlias_catalogMedicationId_alias_key" ON "MedicationAlias"("catalogMedicationId", "alias");

-- CreateIndex
CREATE INDEX "FacilityMedicationUsage_facilityId_lastUsedAt_idx" ON "FacilityMedicationUsage"("facilityId", "lastUsedAt");

-- CreateIndex
CREATE INDEX "FacilityMedicationUsage_facilityId_dispenseCount_idx" ON "FacilityMedicationUsage"("facilityId", "dispenseCount");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityMedicationUsage_facilityId_catalogMedicationId_key" ON "FacilityMedicationUsage"("facilityId", "catalogMedicationId");

-- CreateIndex
CREATE INDEX "InventoryItem_isFavorite_idx" ON "InventoryItem"("isFavorite");

-- AddForeignKey
ALTER TABLE "MedicationAlias" ADD CONSTRAINT "MedicationAlias_catalogMedicationId_fkey" FOREIGN KEY ("catalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityMedicationUsage" ADD CONSTRAINT "FacilityMedicationUsage_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityMedicationUsage" ADD CONSTRAINT "FacilityMedicationUsage_catalogMedicationId_fkey" FOREIGN KEY ("catalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
