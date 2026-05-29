-- EDOC.4 — dual-signature / witness on clinical documentation entries.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED';

-- AlterTable Facility
ALTER TABLE "Facility" ADD COLUMN "clinicalDocumentationWitnessPolicyJson" JSONB;

-- AlterTable EncounterClinicalDocumentationEntry
ALTER TABLE "EncounterClinicalDocumentationEntry" ADD COLUMN     "requiresWitnessSignature" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "witnessedAt" TIMESTAMP(3),
ADD COLUMN     "witnessedByUserId" TEXT,
ADD COLUMN     "witnessDisplayNameSnapshot" TEXT,
ADD COLUMN     "witnessRoleSnapshot" TEXT;

-- CreateIndex
CREATE INDEX "EncounterClinicalDocumentationEntry_witnessedByUserId_idx" ON "EncounterClinicalDocumentationEntry"("witnessedByUserId");

-- AddForeignKey
ALTER TABLE "EncounterClinicalDocumentationEntry" ADD CONSTRAINT "EncounterClinicalDocumentationEntry_witnessedByUserId_fkey" FOREIGN KEY ("witnessedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
