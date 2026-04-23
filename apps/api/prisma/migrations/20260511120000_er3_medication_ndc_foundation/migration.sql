-- ER-3: Medication + NDC foundation (additive only)

ALTER TABLE "CatalogMedication"
ADD COLUMN "ndc11" VARCHAR(11),
ADD COLUMN "ndcDisplay" VARCHAR(32),
ADD COLUMN "billingUnitType" VARCHAR(32);

CREATE INDEX "CatalogMedication_ndc11_idx" ON "CatalogMedication"("ndc11");

ALTER TABLE "MedicationAdministration"
ADD COLUMN "doseValue" DECIMAL(12,4),
ADD COLUMN "doseUnit" VARCHAR(32),
ADD COLUMN "administeredQuantity" DECIMAL(12,4),
ADD COLUMN "billingQuantity" DECIMAL(12,4),
ADD COLUMN "quantityUnit" VARCHAR(32),
ADD COLUMN "ndc11Snapshot" VARCHAR(11),
ADD COLUMN "ndcDisplaySnapshot" VARCHAR(32);

CREATE INDEX "MedicationAdministration_ndc11Snapshot_idx" ON "MedicationAdministration"("ndc11Snapshot");

ALTER TABLE "MedicationDispense"
ADD COLUMN "doseValue" DECIMAL(12,4),
ADD COLUMN "doseUnit" VARCHAR(32),
ADD COLUMN "billingQuantity" DECIMAL(12,4),
ADD COLUMN "quantityUnit" VARCHAR(32),
ADD COLUMN "ndc11Snapshot" VARCHAR(11),
ADD COLUMN "ndcDisplaySnapshot" VARCHAR(32);

CREATE INDEX "MedicationDispense_ndc11Snapshot_idx" ON "MedicationDispense"("ndc11Snapshot");
