-- CreateTable
CREATE TABLE "EncounterProviderDocumentationVersion" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "signedByUserId" TEXT NOT NULL,
    "clinicalSnapshotJson" JSONB NOT NULL,
    "snapshotHash" VARCHAR(128) NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "documentType" VARCHAR(80),
    "encounterMode" VARCHAR(40),
    "sourceEncounterVersion" INTEGER,
    "previousVersionId" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockedByUserId" TEXT,
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterProviderDocumentationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncounterProviderDocumentationVersion_encounterId_versionNumber_key" ON "EncounterProviderDocumentationVersion"("encounterId", "versionNumber");
CREATE INDEX "EncounterProviderDocumentationVersion_facilityId_encounterId_versionNumber_idx" ON "EncounterProviderDocumentationVersion"("facilityId", "encounterId", "versionNumber");
CREATE INDEX "EncounterProviderDocumentationVersion_facilityId_patientId_signedAt_idx" ON "EncounterProviderDocumentationVersion"("facilityId", "patientId", "signedAt");
CREATE INDEX "EncounterProviderDocumentationVersion_snapshotHash_idx" ON "EncounterProviderDocumentationVersion"("snapshotHash");
CREATE INDEX "EncounterProviderDocumentationVersion_signedByUserId_idx" ON "EncounterProviderDocumentationVersion"("signedByUserId");
CREATE INDEX "EncounterProviderDocumentationVersion_unlockedByUserId_idx" ON "EncounterProviderDocumentationVersion"("unlockedByUserId");

-- AddForeignKey
ALTER TABLE "EncounterProviderDocumentationVersion" ADD CONSTRAINT "EncounterProviderDocumentationVersion_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterProviderDocumentationVersion" ADD CONSTRAINT "EncounterProviderDocumentationVersion_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterProviderDocumentationVersion" ADD CONSTRAINT "EncounterProviderDocumentationVersion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterProviderDocumentationVersion" ADD CONSTRAINT "EncounterProviderDocumentationVersion_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterProviderDocumentationVersion" ADD CONSTRAINT "EncounterProviderDocumentationVersion_unlockedByUserId_fkey" FOREIGN KEY ("unlockedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EncounterProviderDocumentationVersion" ADD CONSTRAINT "EncounterProviderDocumentationVersion_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "EncounterProviderDocumentationVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
