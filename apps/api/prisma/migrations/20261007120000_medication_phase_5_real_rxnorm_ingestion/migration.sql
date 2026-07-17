-- AlterTable: RxNormReferenceRelease — Phase 5 real RxNorm ingestion provenance
ALTER TABLE "RxNormReferenceRelease" ADD COLUMN "sourceClassification" VARCHAR(32),
ADD COLUMN "releaseScope" VARCHAR(32),
ADD COLUMN "releaseVersionOfficial" VARCHAR(64),
ADD COLUMN "retrievedAt" TIMESTAMP(3),
ADD COLUMN "sourceUrlOrDescription" TEXT,
ADD COLUMN "licenseAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "importPurpose" VARCHAR(64),
ADD COLUMN "authorizedOperator" VARCHAR(128),
ADD COLUMN "manifestJson" JSONB,
ADD COLUMN "manifestHashSha256" VARCHAR(64),
ADD COLUMN "fileManifestJson" JSONB,
ADD COLUMN "normalizationVersion" VARCHAR(64) DEFAULT 'RXNORM_NORMALIZATION_V1',
ADD COLUMN "parsingVersion" VARCHAR(64) DEFAULT 'RXNCONSO_PARSER_V1',
ADD COLUMN "referenceActivationStatus" VARCHAR(32),
ADD COLUMN "lastCheckpointJson" JSONB;

-- AlterTable: RxNormImportJob — Phase 5 import job counters and checkpoint
ALTER TABLE "RxNormImportJob" ADD COLUMN "manifestHashSha256" VARCHAR(64),
ADD COLUMN "rowsRead" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "malformedRows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "checkpointJson" JSONB;

-- CreateIndex
CREATE INDEX "RxNormReferenceRelease_sourceClassification_idx" ON "RxNormReferenceRelease"("sourceClassification");

-- CreateIndex
CREATE INDEX "RxNormReferenceRelease_releaseScope_idx" ON "RxNormReferenceRelease"("releaseScope");

-- CreateIndex
CREATE INDEX "RxNormReferenceRelease_manifestHashSha256_idx" ON "RxNormReferenceRelease"("manifestHashSha256");

-- CreateIndex
CREATE INDEX "RxNormImportJob_manifestHashSha256_idx" ON "RxNormImportJob"("manifestHashSha256");
