-- AlterTable
ALTER TABLE "MedicationConcept" ADD COLUMN "dataClassification" VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN';

-- CreateIndex
CREATE INDEX "MedicationConcept_dataClassification_idx" ON "MedicationConcept"("dataClassification");

-- AlterTable
ALTER TABLE "RxNormMappingCandidate" ADD COLUMN "reviewVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rejectionReasonCategory" VARCHAR(48),
ADD COLUMN "conflictOverrideAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "conflictOverrideReasons" JSONB,
ADD COLUMN "decisionEvidenceJson" JSONB,
ADD COLUMN "verifiedMappingId" TEXT;

-- CreateIndex
CREATE INDEX "RxNormMappingCandidate_verifiedMappingId_idx" ON "RxNormMappingCandidate"("verifiedMappingId");

-- CreateIndex
CREATE UNIQUE INDEX "RxNormMappingCandidate_verifiedMappingId_key" ON "RxNormMappingCandidate"("verifiedMappingId");

-- CreateTable
CREATE TABLE "RxNormVerifiedMapping" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "releaseId" TEXT NOT NULL,
    "stagingConceptId" TEXT NOT NULL,
    "targetKind" VARCHAR(32) NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetCode" VARCHAR(128),
    "rxcui" VARCHAR(64) NOT NULL,
    "termType" VARCHAR(16) NOT NULL,
    "sourceVocabulary" VARCHAR(32) NOT NULL DEFAULT 'RXNORM',
    "lifecycleStatus" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "dataClassification" VARCHAR(32) NOT NULL DEFAULT 'FIXTURE',
    "evidenceJson" JSONB NOT NULL,
    "reviewerNotes" TEXT,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "supersedesMappingId" TEXT,
    "supersededByMappingId" TEXT,
    "retiredAt" TIMESTAMP(3),
    "retiredByUserId" TEXT,
    "retireReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RxNormVerifiedMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RxNormVerifiedMapping_targetKind_targetId_idx" ON "RxNormVerifiedMapping"("targetKind", "targetId");

-- CreateIndex
CREATE INDEX "RxNormVerifiedMapping_rxcui_idx" ON "RxNormVerifiedMapping"("rxcui");

-- CreateIndex
CREATE INDEX "RxNormVerifiedMapping_lifecycleStatus_idx" ON "RxNormVerifiedMapping"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "RxNormVerifiedMapping_isActive_idx" ON "RxNormVerifiedMapping"("isActive");

-- CreateIndex
CREATE INDEX "RxNormVerifiedMapping_releaseId_idx" ON "RxNormVerifiedMapping"("releaseId");

-- CreateIndex
CREATE INDEX "RxNormVerifiedMapping_candidateId_idx" ON "RxNormVerifiedMapping"("candidateId");

-- CreateIndex
CREATE INDEX "RxNormVerifiedMapping_stagingConceptId_idx" ON "RxNormVerifiedMapping"("stagingConceptId");

-- Partial unique indexes — at most one active mapping per target and per rxcui+targetKind
CREATE UNIQUE INDEX "RxNormVerifiedMapping_active_target_key"
  ON "RxNormVerifiedMapping" ("targetKind", "targetId") WHERE "isActive" = true;

CREATE UNIQUE INDEX "RxNormVerifiedMapping_active_rxcui_targetkind_key"
  ON "RxNormVerifiedMapping" ("rxcui", "targetKind") WHERE "isActive" = true;

-- AddForeignKey
ALTER TABLE "RxNormMappingCandidate" ADD CONSTRAINT "RxNormMappingCandidate_verifiedMappingId_fkey" FOREIGN KEY ("verifiedMappingId") REFERENCES "RxNormVerifiedMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormVerifiedMapping" ADD CONSTRAINT "RxNormVerifiedMapping_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "RxNormReferenceRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormVerifiedMapping" ADD CONSTRAINT "RxNormVerifiedMapping_stagingConceptId_fkey" FOREIGN KEY ("stagingConceptId") REFERENCES "RxNormStagingConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormVerifiedMapping" ADD CONSTRAINT "RxNormVerifiedMapping_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormVerifiedMapping" ADD CONSTRAINT "RxNormVerifiedMapping_retiredByUserId_fkey" FOREIGN KEY ("retiredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormVerifiedMapping" ADD CONSTRAINT "RxNormVerifiedMapping_supersedesMappingId_fkey" FOREIGN KEY ("supersedesMappingId") REFERENCES "RxNormVerifiedMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormVerifiedMapping" ADD CONSTRAINT "RxNormVerifiedMapping_supersededByMappingId_fkey" FOREIGN KEY ("supersededByMappingId") REFERENCES "RxNormVerifiedMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
