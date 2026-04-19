-- AlterTable: Patient — structured address, emergency contact, admin notes
ALTER TABLE "Patient" ADD COLUMN "middleName" TEXT;
ALTER TABLE "Patient" ADD COLUMN "addressLine1" TEXT;
ALTER TABLE "Patient" ADD COLUMN "addressLine2" TEXT;
ALTER TABLE "Patient" ADD COLUMN "stateProvince" TEXT;
ALTER TABLE "Patient" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Patient" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "Patient" ADD COLUMN "emergencyContactRelationship" TEXT;
ALTER TABLE "Patient" ADD COLUMN "emergencyContactPhone" TEXT;
ALTER TABLE "Patient" ADD COLUMN "adminNotes" TEXT;

-- CreateTable
CREATE TABLE "EncounterIntake" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "arrivalAt" TIMESTAMP(3),
    "modeOfArrival" TEXT,
    "initialChiefComplaint" TEXT,
    "initialAcuity" INTEGER,
    "initialRoom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncounterIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncounterIntake_encounterId_key" ON "EncounterIntake"("encounterId");

-- CreateIndex
CREATE INDEX "EncounterIntake_encounterId_idx" ON "EncounterIntake"("encounterId");

-- CreateIndex
CREATE INDEX "EncounterIntake_facilityId_idx" ON "EncounterIntake"("facilityId");

-- AddForeignKey
ALTER TABLE "EncounterIntake" ADD CONSTRAINT "EncounterIntake_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterIntake" ADD CONSTRAINT "EncounterIntake_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
