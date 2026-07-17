-- CreateTable
CREATE TABLE "RxNormReferenceRelease" (
    "id" TEXT NOT NULL,
    "sourceVocabulary" VARCHAR(32) NOT NULL DEFAULT 'RXNORM',
    "releaseIdentifier" VARCHAR(64) NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3),
    "sourceFilename" VARCHAR(255),
    "sourceChecksumSha256" VARCHAR(64) NOT NULL,
    "sourceFormat" VARCHAR(32) NOT NULL,
    "importStatus" VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
    "importModeLast" VARCHAR(32),
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "isActiveReference" BOOLEAN NOT NULL DEFAULT false,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "supersededByReleaseId" TEXT,
    "rollbackStatus" VARCHAR(32),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RxNormReferenceRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RxNormImportJob" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "mode" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "startedByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "resultSummaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RxNormImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RxNormStagingConcept" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "rxcui" VARCHAR(64) NOT NULL,
    "termType" VARCHAR(16) NOT NULL,
    "language" VARCHAR(16),
    "suppressFlag" VARCHAR(8),
    "sourceVocabulary" VARCHAR(32) NOT NULL DEFAULT 'RXNORM',
    "sourceCode" VARCHAR(64),
    "displayTerm" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "ingredientIdentity" VARCHAR(128),
    "strengthText" VARCHAR(128),
    "doseFormText" VARCHAR(128),
    "brandName" VARCHAR(128),
    "relationshipMetadata" JSONB,
    "sourceRowNumber" INTEGER,
    "rowChecksum" VARCHAR(64) NOT NULL,
    "parsingStatus" VARCHAR(32) NOT NULL DEFAULT 'PARSED',
    "validationStatus" VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED',
    "conflictStatus" VARCHAR(32) NOT NULL DEFAULT 'NONE',
    "rejectionReason" TEXT,
    "isSearchableReference" BOOLEAN NOT NULL DEFAULT false,
    "isOrderableEligible" BOOLEAN NOT NULL DEFAULT false,
    "dataClassification" VARCHAR(32) NOT NULL DEFAULT 'FIXTURE',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RxNormStagingConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RxNormMappingCandidate" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "stagingConceptId" TEXT NOT NULL,
    "targetKind" VARCHAR(32) NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetCode" VARCHAR(128),
    "status" VARCHAR(32) NOT NULL DEFAULT 'CANDIDATE',
    "confidence" VARCHAR(16),
    "evidenceJson" JSONB NOT NULL,
    "autoVerified" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RxNormMappingCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RxNormImportConflict" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "conflictType" VARCHAR(64) NOT NULL,
    "severity" VARCHAR(16) NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "stagingConceptId" TEXT,
    "relatedTargetId" TEXT,
    "evidenceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RxNormImportConflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RxNormReferenceRelease_sourceVocabulary_releaseIdentifier_key" ON "RxNormReferenceRelease"("sourceVocabulary", "releaseIdentifier");

-- CreateIndex
CREATE INDEX "RxNormReferenceRelease_sourceChecksumSha256_idx" ON "RxNormReferenceRelease"("sourceChecksumSha256");

-- CreateIndex
CREATE INDEX "RxNormReferenceRelease_importStatus_idx" ON "RxNormReferenceRelease"("importStatus");

-- CreateIndex
CREATE INDEX "RxNormReferenceRelease_isActiveReference_idx" ON "RxNormReferenceRelease"("isActiveReference");

-- CreateIndex
CREATE INDEX "RxNormImportJob_releaseId_idx" ON "RxNormImportJob"("releaseId");

-- CreateIndex
CREATE INDEX "RxNormImportJob_status_idx" ON "RxNormImportJob"("status");

-- CreateIndex
CREATE INDEX "RxNormImportJob_mode_idx" ON "RxNormImportJob"("mode");

-- CreateIndex
CREATE UNIQUE INDEX "RxNormStagingConcept_releaseId_rowChecksum_key" ON "RxNormStagingConcept"("releaseId", "rowChecksum");

-- CreateIndex
CREATE INDEX "RxNormStagingConcept_releaseId_rxcui_idx" ON "RxNormStagingConcept"("releaseId", "rxcui");

-- CreateIndex
CREATE INDEX "RxNormStagingConcept_rxcui_termType_idx" ON "RxNormStagingConcept"("rxcui", "termType");

-- CreateIndex
CREATE INDEX "RxNormStagingConcept_normalizedTerm_idx" ON "RxNormStagingConcept"("normalizedTerm");

-- CreateIndex
CREATE INDEX "RxNormStagingConcept_validationStatus_idx" ON "RxNormStagingConcept"("validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "RxNormMappingCandidate_stagingConceptId_targetKind_targetId_key" ON "RxNormMappingCandidate"("stagingConceptId", "targetKind", "targetId");

-- CreateIndex
CREATE INDEX "RxNormMappingCandidate_releaseId_idx" ON "RxNormMappingCandidate"("releaseId");

-- CreateIndex
CREATE INDEX "RxNormMappingCandidate_status_idx" ON "RxNormMappingCandidate"("status");

-- CreateIndex
CREATE INDEX "RxNormMappingCandidate_targetKind_targetId_idx" ON "RxNormMappingCandidate"("targetKind", "targetId");

-- CreateIndex
CREATE INDEX "RxNormImportConflict_releaseId_idx" ON "RxNormImportConflict"("releaseId");

-- CreateIndex
CREATE INDEX "RxNormImportConflict_conflictType_idx" ON "RxNormImportConflict"("conflictType");

-- AddForeignKey
ALTER TABLE "RxNormReferenceRelease" ADD CONSTRAINT "RxNormReferenceRelease_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormReferenceRelease" ADD CONSTRAINT "RxNormReferenceRelease_supersededByReleaseId_fkey" FOREIGN KEY ("supersededByReleaseId") REFERENCES "RxNormReferenceRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormImportJob" ADD CONSTRAINT "RxNormImportJob_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "RxNormReferenceRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormImportJob" ADD CONSTRAINT "RxNormImportJob_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormStagingConcept" ADD CONSTRAINT "RxNormStagingConcept_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "RxNormReferenceRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormMappingCandidate" ADD CONSTRAINT "RxNormMappingCandidate_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "RxNormReferenceRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormMappingCandidate" ADD CONSTRAINT "RxNormMappingCandidate_stagingConceptId_fkey" FOREIGN KEY ("stagingConceptId") REFERENCES "RxNormStagingConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormMappingCandidate" ADD CONSTRAINT "RxNormMappingCandidate_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormImportConflict" ADD CONSTRAINT "RxNormImportConflict_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "RxNormReferenceRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxNormImportConflict" ADD CONSTRAINT "RxNormImportConflict_stagingConceptId_fkey" FOREIGN KEY ("stagingConceptId") REFERENCES "RxNormStagingConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
