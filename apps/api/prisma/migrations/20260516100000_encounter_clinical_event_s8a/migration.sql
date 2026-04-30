-- CreateEnum
CREATE TYPE "EncounterClinicalEventType" AS ENUM (
  'VITALS_RECORDED',
  'NURSING_ASSESSMENT_SAVED',
  'PROVIDER_MSE_SAVED',
  'PROVIDER_SIGNED',
  'PROVIDER_UNLOCKED',
  'HANDOFF_PROVIDER',
  'HANDOFF_NURSING'
);

-- CreateTable
CREATE TABLE "EncounterClinicalEvent" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "eventType" "EncounterClinicalEventType" NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterClinicalEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EncounterClinicalEvent" ADD CONSTRAINT "EncounterClinicalEvent_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EncounterClinicalEvent" ADD CONSTRAINT "EncounterClinicalEvent_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EncounterClinicalEvent" ADD CONSTRAINT "EncounterClinicalEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EncounterClinicalEvent" ADD CONSTRAINT "EncounterClinicalEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "EncounterClinicalEvent_facilityId_encounterId_createdAt_idx" ON "EncounterClinicalEvent"("facilityId", "encounterId", "createdAt");

CREATE INDEX "EncounterClinicalEvent_encounterId_createdAt_idx" ON "EncounterClinicalEvent"("encounterId", "createdAt");

CREATE INDEX "EncounterClinicalEvent_patientId_createdAt_idx" ON "EncounterClinicalEvent"("patientId", "createdAt");

CREATE INDEX "EncounterClinicalEvent_createdByUserId_idx" ON "EncounterClinicalEvent"("createdByUserId");
