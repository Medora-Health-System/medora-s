-- EDOC.2 — append-only structured clinical documentation entries.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED';

-- CreateTable
CREATE TABLE "EncounterClinicalDocumentationEntry" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorDisplayNameSnapshot" TEXT NOT NULL,
    "authorRoleSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,

    CONSTRAINT "EncounterClinicalDocumentationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EncounterClinicalDocumentationEntry_encounterId_createdAt_idx" ON "EncounterClinicalDocumentationEntry"("encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "EncounterClinicalDocumentationEntry_facilityId_idx" ON "EncounterClinicalDocumentationEntry"("facilityId");

-- CreateIndex
CREATE INDEX "EncounterClinicalDocumentationEntry_patientId_idx" ON "EncounterClinicalDocumentationEntry"("patientId");

-- CreateIndex
CREATE INDEX "EncounterClinicalDocumentationEntry_cardId_idx" ON "EncounterClinicalDocumentationEntry"("cardId");

-- CreateIndex
CREATE INDEX "EncounterClinicalDocumentationEntry_authorUserId_idx" ON "EncounterClinicalDocumentationEntry"("authorUserId");

-- AddForeignKey
ALTER TABLE "EncounterClinicalDocumentationEntry" ADD CONSTRAINT "EncounterClinicalDocumentationEntry_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterClinicalDocumentationEntry" ADD CONSTRAINT "EncounterClinicalDocumentationEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterClinicalDocumentationEntry" ADD CONSTRAINT "EncounterClinicalDocumentationEntry_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterClinicalDocumentationEntry" ADD CONSTRAINT "EncounterClinicalDocumentationEntry_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterClinicalDocumentationEntry" ADD CONSTRAINT "EncounterClinicalDocumentationEntry_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
