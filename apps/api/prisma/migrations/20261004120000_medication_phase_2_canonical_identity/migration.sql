-- AlterTable
ALTER TABLE "CatalogMedication" ADD COLUMN     "dataClassification" VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "dataSourceLabel" VARCHAR(64);

-- AlterTable
ALTER TABLE "MedicationConcept" ADD COLUMN     "rxNormTermType" VARCHAR(32),
ADD COLUMN     "rxNormSourceVocabulary" VARCHAR(32),
ADD COLUMN     "rxNormMappingStatus" VARCHAR(32) NOT NULL DEFAULT 'UNMAPPED',
ADD COLUMN     "rxNormMappingConfidence" VARCHAR(16),
ADD COLUMN     "rxNormMappingVersion" VARCHAR(64),
ADD COLUMN     "rxNormMappedAt" TIMESTAMP(3),
ADD COLUMN     "rxNormMappedByUserId" TEXT,
ADD COLUMN     "rxNormReviewedAt" TIMESTAMP(3),
ADD COLUMN     "rxNormReviewNotes" TEXT;

-- AlterTable
ALTER TABLE "MedicationProduct" ADD COLUMN     "dualLayerLinkageStatus" VARCHAR(32) NOT NULL DEFAULT 'UNLINKED',
ADD COLUMN     "dualLayerLinkageMethod" VARCHAR(48),
ADD COLUMN     "dualLayerLinkageConfidence" VARCHAR(16),
ADD COLUMN     "dualLayerLinkageReviewedAt" TIMESTAMP(3),
ADD COLUMN     "dualLayerLinkageNotes" TEXT;

-- AlterTable
ALTER TABLE "MedicationRoute" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clinicalCategory" VARCHAR(32);

-- AlterTable
ALTER TABLE "MedicationBillingProfile" ADD COLUMN     "mappingStatus" VARCHAR(32) NOT NULL DEFAULT 'CANDIDATE',
ADD COLUMN     "mappingSource" VARCHAR(64),
ADD COLUMN     "mappingVersion" VARCHAR(64);

-- CreateTable
CREATE TABLE "MedicationProductRoutePermission" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "eligibilityStatus" VARCHAR(32) NOT NULL DEFAULT 'NOT_VERIFIED',
    "requiresConfiguration" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationProductRoutePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogMedication_dataClassification_idx" ON "CatalogMedication"("dataClassification");

-- CreateIndex
CREATE INDEX "MedicationConcept_rxNormConceptId_idx" ON "MedicationConcept"("rxNormConceptId");

-- CreateIndex
CREATE INDEX "MedicationConcept_rxNormMappingStatus_idx" ON "MedicationConcept"("rxNormMappingStatus");

-- CreateIndex
CREATE INDEX "MedicationProduct_dualLayerLinkageStatus_idx" ON "MedicationProduct"("dualLayerLinkageStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationProductRoutePermission_productId_routeId_key" ON "MedicationProductRoutePermission"("productId", "routeId");

-- CreateIndex
CREATE INDEX "MedicationProductRoutePermission_productId_idx" ON "MedicationProductRoutePermission"("productId");

-- CreateIndex
CREATE INDEX "MedicationProductRoutePermission_routeId_idx" ON "MedicationProductRoutePermission"("routeId");

-- CreateIndex
CREATE INDEX "MedicationProductRoutePermission_eligibilityStatus_idx" ON "MedicationProductRoutePermission"("eligibilityStatus");

-- AddForeignKey
ALTER TABLE "MedicationConcept" ADD CONSTRAINT "MedicationConcept_rxNormMappedByUserId_fkey" FOREIGN KEY ("rxNormMappedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationProductRoutePermission" ADD CONSTRAINT "MedicationProductRoutePermission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MedicationProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationProductRoutePermission" ADD CONSTRAINT "MedicationProductRoutePermission_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "MedicationRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
