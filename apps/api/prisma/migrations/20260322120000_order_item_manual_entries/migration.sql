-- OrderItem: optional catalogue + saisie manuelle (Haïti / articles hors catalogue)
ALTER TABLE "OrderItem" ALTER COLUMN "catalogItemId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN "manualLabel" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "manualSecondaryText" TEXT;
CREATE INDEX "OrderItem_catalogItemId_idx" ON "OrderItem"("catalogItemId");

-- MedicationDispense: dispense documentée sans entrée catalogue
ALTER TABLE "MedicationDispense" DROP CONSTRAINT "MedicationDispense_catalogMedicationId_fkey";
ALTER TABLE "MedicationDispense" ALTER COLUMN "catalogMedicationId" DROP NOT NULL;
ALTER TABLE "MedicationDispense" ADD COLUMN "manualMedicationLabel" TEXT;
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_catalogMedicationId_fkey" FOREIGN KEY ("catalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
