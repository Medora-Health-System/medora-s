-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PROVIDER_DOCUMENTATION_ADDENDUM';

-- CreateTable
CREATE TABLE "EncounterProviderAddendum" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "EncounterProviderAddendum_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EncounterProviderAddendum_encounterId_createdAt_idx" ON "EncounterProviderAddendum"("encounterId", "createdAt");
CREATE INDEX "EncounterProviderAddendum_createdByUserId_idx" ON "EncounterProviderAddendum"("createdByUserId");
CREATE INDEX "EncounterProviderAddendum_facilityId_idx" ON "EncounterProviderAddendum"("facilityId");

ALTER TABLE "EncounterProviderAddendum" ADD CONSTRAINT "EncounterProviderAddendum_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterProviderAddendum" ADD CONSTRAINT "EncounterProviderAddendum_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterProviderAddendum" ADD CONSTRAINT "EncounterProviderAddendum_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
