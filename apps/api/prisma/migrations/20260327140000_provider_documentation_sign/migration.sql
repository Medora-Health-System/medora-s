-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PROVIDER_DOCUMENTATION_SIGN';

-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN "providerDocumentationStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Encounter" ADD COLUMN "providerDocumentationSignedAt" TIMESTAMP(3);
ALTER TABLE "Encounter" ADD COLUMN "providerDocumentationSignedByUserId" TEXT;

ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_providerDocumentationSignedByUserId_fkey" FOREIGN KEY ("providerDocumentationSignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Encounter_providerDocumentationSignedByUserId_idx" ON "Encounter"("providerDocumentationSignedByUserId");
