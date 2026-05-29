-- MEDNOTE.1 — append-only encounter notes registry (legal chart visibility)

CREATE TYPE "EncounterNoteType" AS ENUM ('PROVIDER', 'NURSING', 'TECHNICIAN', 'OTHER');

CREATE TABLE "EncounterNote" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "noteType" "EncounterNoteType" NOT NULL,
    "body" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorDisplayNameSnapshot" TEXT NOT NULL,
    "authorRoleSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,

    CONSTRAINT "EncounterNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EncounterNote_encounterId_createdAt_idx" ON "EncounterNote"("encounterId", "createdAt");
CREATE INDEX "EncounterNote_facilityId_idx" ON "EncounterNote"("facilityId");
CREATE INDEX "EncounterNote_patientId_idx" ON "EncounterNote"("patientId");
CREATE INDEX "EncounterNote_authorUserId_idx" ON "EncounterNote"("authorUserId");

ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
