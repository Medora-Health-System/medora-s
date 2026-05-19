-- CreateEnum
CREATE TYPE "InfusionSessionStatus" AS ENUM ('IN_PROGRESS', 'STOPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MedicationMarWorkflow" AS ENUM ('SINGLE_DOSE', 'INFUSION_SESSION', 'PRN', 'CONTINUOUS');

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "medicationPackageId" TEXT;

-- AlterTable
ALTER TABLE "MedicationAdministration" ADD COLUMN     "infusionSessionId" TEXT,
ADD COLUMN     "medicationPackageId" TEXT,
ADD COLUMN     "medicationProductId" TEXT;

-- AlterTable
ALTER TABLE "MedicationDispense" ADD COLUMN     "medicationPackageId" TEXT,
ADD COLUMN     "medicationProductId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "medicationPackageId" TEXT,
ADD COLUMN     "medicationProductId" TEXT;

-- CreateTable
CREATE TABLE "MedicationTherapeuticClass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationTherapeuticClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationRoute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationDoseUnit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationDoseUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationConcept" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "therapeuticClassId" TEXT,
    "rxNormConceptId" VARCHAR(64),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationConcentration" (
    "id" TEXT NOT NULL,
    "numeratorAmount" DECIMAL(16,6),
    "numeratorUnitId" TEXT,
    "denominatorAmount" DECIMAL(16,6),
    "denominatorUnitId" TEXT,
    "totalVolumeAmount" DECIMAL(16,6),
    "totalVolumeUnitId" TEXT,
    "displayText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationConcentration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationProduct" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "legacyCatalogMedicationId" TEXT,
    "strengthDisplay" TEXT NOT NULL,
    "concentrationId" TEXT,
    "dosageForm" VARCHAR(64) NOT NULL,
    "defaultRouteId" TEXT,
    "administrationType" VARCHAR(32) NOT NULL,
    "billingClass" VARCHAR(32) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packageDescription" TEXT NOT NULL,
    "packageType" VARCHAR(32) NOT NULL,
    "ndc11" VARCHAR(11),
    "ndcDisplay" VARCHAR(32),
    "contentsAmount" DECIMAL(16,6),
    "contentsUnitId" TEXT,
    "defaultDoseUnitId" TEXT,
    "isDefaultForProduct" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityFormularyItem" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "isOnFormulary" BOOLEAN NOT NULL DEFAULT true,
    "isEDFormulary" BOOLEAN NOT NULL DEFAULT false,
    "favoriteTier" VARCHAR(32),
    "sortPriority" INTEGER,
    "searchBoost" INTEGER,
    "allowManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityFormularyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationBillingProfile" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "payerProfileId" VARCHAR(64),
    "hcpcsCodeSuggested" VARCHAR(16),
    "hcpcsUnitType" VARCHAR(32),
    "revenueCodeSuggested" VARCHAR(16),
    "billableUnitRule" VARCHAR(32),
    "companionProcedureCptSuggested" VARCHAR(16),
    "wastageBillable" BOOLEAN NOT NULL DEFAULT false,
    "requiresManualReview" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationBillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationSafetyProfile" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "isHighAlert" BOOLEAN NOT NULL DEFAULT false,
    "highAlertCategories" JSONB,
    "lasaGroupId" VARCHAR(64),
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "controlledSchedule" VARCHAR(8),
    "requiresWitness" BOOLEAN NOT NULL DEFAULT false,
    "requiresDoubleSign" BOOLEAN NOT NULL DEFAULT false,
    "duplicateTherapyClassId" TEXT,
    "interactionGroupIds" JSONB,
    "maxSingleDoseAmount" DECIMAL(16,6),
    "maxSingleDoseUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationSafetyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationAdministrationProfile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "defaultMarWorkflow" "MedicationMarWorkflow" NOT NULL,
    "requiresInfusionSession" BOOLEAN NOT NULL DEFAULT false,
    "allowsPartialDose" BOOLEAN NOT NULL DEFAULT false,
    "allowsWasteDocumentation" BOOLEAN NOT NULL DEFAULT false,
    "typicalDoseUnitId" TEXT,
    "hydrationFluid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationAdministrationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfusionProfile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "infusionType" VARCHAR(32) NOT NULL,
    "requiresStopMarForBilling" BOOLEAN NOT NULL DEFAULT true,
    "minDocumentedDurationMinutes" INTEGER,
    "rateRequired" BOOLEAN NOT NULL DEFAULT false,
    "compatibleBaseFluidProductIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfusionProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationSearchAlias" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT,
    "productId" TEXT,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "language" VARCHAR(8),
    "aliasType" VARCHAR(32),
    "searchWeight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationSearchAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationOrderSetLink" (
    "id" TEXT NOT NULL,
    "orderSetId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "defaultPackageId" TEXT,
    "defaultQuantity" DECIMAL(12,4),
    "defaultRouteId" TEXT,
    "defaultFulfillmentIntent" "MedicationFulfillmentIntent",
    "sequence" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationOrderSetLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationFormularyImportStaging" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT,
    "batchId" TEXT NOT NULL,
    "sourceRowId" TEXT NOT NULL,
    "sourceInventorySku" TEXT,
    "sourceInventoryDescription" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "proposedConceptCode" TEXT,
    "proposedProductCode" TEXT,
    "proposedPackageCode" TEXT,
    "reconciliationStatus" VARCHAR(64) NOT NULL,
    "importGateStatus" VARCHAR(32) NOT NULL,
    "overallStatus" VARCHAR(32) NOT NULL,
    "reviewFlags" JSONB,
    "ndc11" VARCHAR(11),
    "hcpcsCodeSuggested" VARCHAR(16),
    "billingReviewStatus" VARCHAR(32),
    "safetyReviewStatus" VARCHAR(32),
    "infusionReviewStatus" VARCHAR(32),
    "pharmacySignoff" TEXT,
    "nursingSignoff" TEXT,
    "edMdSignoff" TEXT,
    "complianceSignoff" TEXT,
    "validationErrors" JSONB,
    "importedAt" TIMESTAMP(3),
    "importedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationFormularyImportStaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfusionSession" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "medicationProductId" TEXT,
    "medicationPackageId" TEXT,
    "legacyInfusionSessionKey" VARCHAR(64),
    "status" "InfusionSessionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfusionSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicationTherapeuticClass_code_key" ON "MedicationTherapeuticClass"("code");

-- CreateIndex
CREATE INDEX "MedicationTherapeuticClass_parentId_idx" ON "MedicationTherapeuticClass"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationRoute_code_key" ON "MedicationRoute"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationDoseUnit_code_key" ON "MedicationDoseUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationConcept_code_key" ON "MedicationConcept"("code");

-- CreateIndex
CREATE INDEX "MedicationConcept_therapeuticClassId_idx" ON "MedicationConcept"("therapeuticClassId");

-- CreateIndex
CREATE INDEX "MedicationConcept_isActive_idx" ON "MedicationConcept"("isActive");

-- CreateIndex
CREATE INDEX "MedicationConcentration_numeratorUnitId_idx" ON "MedicationConcentration"("numeratorUnitId");

-- CreateIndex
CREATE INDEX "MedicationConcentration_denominatorUnitId_idx" ON "MedicationConcentration"("denominatorUnitId");

-- CreateIndex
CREATE INDEX "MedicationConcentration_totalVolumeUnitId_idx" ON "MedicationConcentration"("totalVolumeUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationProduct_code_key" ON "MedicationProduct"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationProduct_legacyCatalogMedicationId_key" ON "MedicationProduct"("legacyCatalogMedicationId");

-- CreateIndex
CREATE INDEX "MedicationProduct_conceptId_idx" ON "MedicationProduct"("conceptId");

-- CreateIndex
CREATE INDEX "MedicationProduct_legacyCatalogMedicationId_idx" ON "MedicationProduct"("legacyCatalogMedicationId");

-- CreateIndex
CREATE INDEX "MedicationProduct_isActive_idx" ON "MedicationProduct"("isActive");

-- CreateIndex
CREATE INDEX "MedicationProduct_administrationType_idx" ON "MedicationProduct"("administrationType");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationPackage_code_key" ON "MedicationPackage"("code");

-- CreateIndex
CREATE INDEX "MedicationPackage_productId_idx" ON "MedicationPackage"("productId");

-- CreateIndex
CREATE INDEX "MedicationPackage_ndc11_idx" ON "MedicationPackage"("ndc11");

-- CreateIndex
CREATE INDEX "MedicationPackage_isActive_idx" ON "MedicationPackage"("isActive");

-- CreateIndex
CREATE INDEX "MedicationPackage_isDefaultForProduct_idx" ON "MedicationPackage"("isDefaultForProduct");

-- CreateIndex
CREATE INDEX "FacilityFormularyItem_facilityId_idx" ON "FacilityFormularyItem"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityFormularyItem_packageId_idx" ON "FacilityFormularyItem"("packageId");

-- CreateIndex
CREATE INDEX "FacilityFormularyItem_inventoryItemId_idx" ON "FacilityFormularyItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "FacilityFormularyItem_isEDFormulary_idx" ON "FacilityFormularyItem"("isEDFormulary");

-- CreateIndex
CREATE INDEX "FacilityFormularyItem_favoriteTier_idx" ON "FacilityFormularyItem"("favoriteTier");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityFormularyItem_facilityId_packageId_key" ON "FacilityFormularyItem"("facilityId", "packageId");

-- CreateIndex
CREATE INDEX "MedicationBillingProfile_packageId_idx" ON "MedicationBillingProfile"("packageId");

-- CreateIndex
CREATE INDEX "MedicationBillingProfile_payerProfileId_idx" ON "MedicationBillingProfile"("payerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationSafetyProfile_conceptId_key" ON "MedicationSafetyProfile"("conceptId");

-- CreateIndex
CREATE INDEX "MedicationSafetyProfile_duplicateTherapyClassId_idx" ON "MedicationSafetyProfile"("duplicateTherapyClassId");

-- CreateIndex
CREATE INDEX "MedicationSafetyProfile_isControlled_idx" ON "MedicationSafetyProfile"("isControlled");

-- CreateIndex
CREATE INDEX "MedicationSafetyProfile_isHighAlert_idx" ON "MedicationSafetyProfile"("isHighAlert");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationAdministrationProfile_productId_key" ON "MedicationAdministrationProfile"("productId");

-- CreateIndex
CREATE INDEX "MedicationAdministrationProfile_typicalDoseUnitId_idx" ON "MedicationAdministrationProfile"("typicalDoseUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "InfusionProfile_productId_key" ON "InfusionProfile"("productId");

-- CreateIndex
CREATE INDEX "MedicationSearchAlias_conceptId_idx" ON "MedicationSearchAlias"("conceptId");

-- CreateIndex
CREATE INDEX "MedicationSearchAlias_productId_idx" ON "MedicationSearchAlias"("productId");

-- CreateIndex
CREATE INDEX "MedicationSearchAlias_normalizedAlias_idx" ON "MedicationSearchAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "MedicationSearchAlias_alias_idx" ON "MedicationSearchAlias"("alias");

-- CreateIndex
CREATE INDEX "MedicationOrderSetLink_orderSetId_idx" ON "MedicationOrderSetLink"("orderSetId");

-- CreateIndex
CREATE INDEX "MedicationOrderSetLink_productId_idx" ON "MedicationOrderSetLink"("productId");

-- CreateIndex
CREATE INDEX "MedicationOrderSetLink_defaultPackageId_idx" ON "MedicationOrderSetLink"("defaultPackageId");

-- CreateIndex
CREATE INDEX "MedicationOrderSetLink_sequence_idx" ON "MedicationOrderSetLink"("sequence");

-- CreateIndex
CREATE INDEX "MedicationFormularyImportStaging_batchId_idx" ON "MedicationFormularyImportStaging"("batchId");

-- CreateIndex
CREATE INDEX "MedicationFormularyImportStaging_overallStatus_idx" ON "MedicationFormularyImportStaging"("overallStatus");

-- CreateIndex
CREATE INDEX "MedicationFormularyImportStaging_importGateStatus_idx" ON "MedicationFormularyImportStaging"("importGateStatus");

-- CreateIndex
CREATE INDEX "MedicationFormularyImportStaging_reconciliationStatus_idx" ON "MedicationFormularyImportStaging"("reconciliationStatus");

-- CreateIndex
CREATE INDEX "MedicationFormularyImportStaging_facilityId_idx" ON "MedicationFormularyImportStaging"("facilityId");

-- CreateIndex
CREATE INDEX "MedicationFormularyImportStaging_sourceRowId_idx" ON "MedicationFormularyImportStaging"("sourceRowId");

-- CreateIndex
CREATE INDEX "MedicationFormularyImportStaging_importedAt_idx" ON "MedicationFormularyImportStaging"("importedAt");

-- CreateIndex
CREATE INDEX "InfusionSession_encounterId_idx" ON "InfusionSession"("encounterId");

-- CreateIndex
CREATE INDEX "InfusionSession_facilityId_idx" ON "InfusionSession"("facilityId");

-- CreateIndex
CREATE INDEX "InfusionSession_orderItemId_idx" ON "InfusionSession"("orderItemId");

-- CreateIndex
CREATE INDEX "InfusionSession_legacyInfusionSessionKey_idx" ON "InfusionSession"("legacyInfusionSessionKey");

-- CreateIndex
CREATE INDEX "InfusionSession_status_idx" ON "InfusionSession"("status");

-- CreateIndex
CREATE INDEX "InfusionSession_medicationProductId_idx" ON "InfusionSession"("medicationProductId");

-- CreateIndex
CREATE INDEX "InfusionSession_medicationPackageId_idx" ON "InfusionSession"("medicationPackageId");

-- CreateIndex
CREATE INDEX "InventoryItem_medicationPackageId_idx" ON "InventoryItem"("medicationPackageId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_infusionSessionId_idx" ON "MedicationAdministration"("infusionSessionId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_medicationProductId_idx" ON "MedicationAdministration"("medicationProductId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_medicationPackageId_idx" ON "MedicationAdministration"("medicationPackageId");

-- CreateIndex
CREATE INDEX "MedicationDispense_medicationProductId_idx" ON "MedicationDispense"("medicationProductId");

-- CreateIndex
CREATE INDEX "MedicationDispense_medicationPackageId_idx" ON "MedicationDispense"("medicationPackageId");

-- CreateIndex
CREATE INDEX "OrderItem_medicationProductId_idx" ON "OrderItem"("medicationProductId");

-- CreateIndex
CREATE INDEX "OrderItem_medicationPackageId_idx" ON "OrderItem"("medicationPackageId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_medicationProductId_fkey" FOREIGN KEY ("medicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_medicationPackageId_fkey" FOREIGN KEY ("medicationPackageId") REFERENCES "MedicationPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_medicationPackageId_fkey" FOREIGN KEY ("medicationPackageId") REFERENCES "MedicationPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_medicationProductId_fkey" FOREIGN KEY ("medicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_medicationPackageId_fkey" FOREIGN KEY ("medicationPackageId") REFERENCES "MedicationPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_infusionSessionId_fkey" FOREIGN KEY ("infusionSessionId") REFERENCES "InfusionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_medicationProductId_fkey" FOREIGN KEY ("medicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_medicationPackageId_fkey" FOREIGN KEY ("medicationPackageId") REFERENCES "MedicationPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationTherapeuticClass" ADD CONSTRAINT "MedicationTherapeuticClass_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationConcept" ADD CONSTRAINT "MedicationConcept_therapeuticClassId_fkey" FOREIGN KEY ("therapeuticClassId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationConcentration" ADD CONSTRAINT "MedicationConcentration_numeratorUnitId_fkey" FOREIGN KEY ("numeratorUnitId") REFERENCES "MedicationDoseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationConcentration" ADD CONSTRAINT "MedicationConcentration_denominatorUnitId_fkey" FOREIGN KEY ("denominatorUnitId") REFERENCES "MedicationDoseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationConcentration" ADD CONSTRAINT "MedicationConcentration_totalVolumeUnitId_fkey" FOREIGN KEY ("totalVolumeUnitId") REFERENCES "MedicationDoseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationProduct" ADD CONSTRAINT "MedicationProduct_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "MedicationConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationProduct" ADD CONSTRAINT "MedicationProduct_legacyCatalogMedicationId_fkey" FOREIGN KEY ("legacyCatalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationProduct" ADD CONSTRAINT "MedicationProduct_concentrationId_fkey" FOREIGN KEY ("concentrationId") REFERENCES "MedicationConcentration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationProduct" ADD CONSTRAINT "MedicationProduct_defaultRouteId_fkey" FOREIGN KEY ("defaultRouteId") REFERENCES "MedicationRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPackage" ADD CONSTRAINT "MedicationPackage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MedicationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPackage" ADD CONSTRAINT "MedicationPackage_contentsUnitId_fkey" FOREIGN KEY ("contentsUnitId") REFERENCES "MedicationDoseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPackage" ADD CONSTRAINT "MedicationPackage_defaultDoseUnitId_fkey" FOREIGN KEY ("defaultDoseUnitId") REFERENCES "MedicationDoseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityFormularyItem" ADD CONSTRAINT "FacilityFormularyItem_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityFormularyItem" ADD CONSTRAINT "FacilityFormularyItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "MedicationPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityFormularyItem" ADD CONSTRAINT "FacilityFormularyItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationBillingProfile" ADD CONSTRAINT "MedicationBillingProfile_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "MedicationPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSafetyProfile" ADD CONSTRAINT "MedicationSafetyProfile_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "MedicationConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSafetyProfile" ADD CONSTRAINT "MedicationSafetyProfile_duplicateTherapyClassId_fkey" FOREIGN KEY ("duplicateTherapyClassId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSafetyProfile" ADD CONSTRAINT "MedicationSafetyProfile_maxSingleDoseUnitId_fkey" FOREIGN KEY ("maxSingleDoseUnitId") REFERENCES "MedicationDoseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministrationProfile" ADD CONSTRAINT "MedicationAdministrationProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MedicationProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministrationProfile" ADD CONSTRAINT "MedicationAdministrationProfile_typicalDoseUnitId_fkey" FOREIGN KEY ("typicalDoseUnitId") REFERENCES "MedicationDoseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfusionProfile" ADD CONSTRAINT "InfusionProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MedicationProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSearchAlias" ADD CONSTRAINT "MedicationSearchAlias_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "MedicationConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSearchAlias" ADD CONSTRAINT "MedicationSearchAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MedicationProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSetLink" ADD CONSTRAINT "MedicationOrderSetLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MedicationProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSetLink" ADD CONSTRAINT "MedicationOrderSetLink_defaultPackageId_fkey" FOREIGN KEY ("defaultPackageId") REFERENCES "MedicationPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationOrderSetLink" ADD CONSTRAINT "MedicationOrderSetLink_defaultRouteId_fkey" FOREIGN KEY ("defaultRouteId") REFERENCES "MedicationRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationFormularyImportStaging" ADD CONSTRAINT "MedicationFormularyImportStaging_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationFormularyImportStaging" ADD CONSTRAINT "MedicationFormularyImportStaging_importedByUserId_fkey" FOREIGN KEY ("importedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfusionSession" ADD CONSTRAINT "InfusionSession_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfusionSession" ADD CONSTRAINT "InfusionSession_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfusionSession" ADD CONSTRAINT "InfusionSession_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfusionSession" ADD CONSTRAINT "InfusionSession_medicationProductId_fkey" FOREIGN KEY ("medicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfusionSession" ADD CONSTRAINT "InfusionSession_medicationPackageId_fkey" FOREIGN KEY ("medicationPackageId") REFERENCES "MedicationPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
