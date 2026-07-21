-- D3B HospitalEpisode foundation — additive, non-destructive.
-- MEDUI.HOSPITAL_EPISODE_FOUNDATION_D3B
-- No backfill. Existing Encounter rows remain valid with hospitalEpisodeId NULL.
-- Rollback-safe before production episode data exists: drop FKs/indexes/table/enums.
-- NOTE: Partial unique index HospitalEpisode_facility_patient_active_uidx is SQL-only
-- (Prisma schema cannot express WHERE status = 'ACTIVE'). Do not drop it on regenerate.

-- CreateEnum
CREATE TYPE "HospitalEpisodeStatus" AS ENUM (
  'ACTIVE',
  'CLOSED',
  'CANCELLED',
  'MERGED',
  'ERROR_REVIEW'
);

-- CreateEnum
CREATE TYPE "HospitalEpisodeCloseReason" AS ENUM (
  'FACILITY_DISCHARGE',
  'EXTERNAL_TRANSFER',
  'AMA',
  'LWBS',
  'ELOPEMENT',
  'DECEASED',
  'ADMINISTRATIVE_CORRECTION',
  'DUPLICATE_EPISODE',
  'OTHER_GOVERNED'
);

-- CreateTable
CREATE TABLE "HospitalEpisode" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "HospitalEpisodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closeReason" "HospitalEpisodeCloseReason",
    "originatingEncounterId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,

    CONSTRAINT "HospitalEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HospitalEpisode_originatingEncounterId_key" ON "HospitalEpisode"("originatingEncounterId");

CREATE INDEX "HospitalEpisode_facilityId_idx" ON "HospitalEpisode"("facilityId");

CREATE INDEX "HospitalEpisode_patientId_idx" ON "HospitalEpisode"("patientId");

CREATE INDEX "HospitalEpisode_facilityId_patientId_status_idx" ON "HospitalEpisode"("facilityId", "patientId", "status");

CREATE INDEX "HospitalEpisode_facilityId_status_openedAt_idx" ON "HospitalEpisode"("facilityId", "status", "openedAt");

CREATE INDEX "HospitalEpisode_createdByUserId_idx" ON "HospitalEpisode"("createdByUserId");

CREATE INDEX "HospitalEpisode_updatedByUserId_idx" ON "HospitalEpisode"("updatedByUserId");

-- Partial unique: at most one ACTIVE episode per patient at a facility (DB-enforced).
CREATE UNIQUE INDEX "HospitalEpisode_facility_patient_active_uidx"
ON "HospitalEpisode" ("facilityId", "patientId")
WHERE "status" = 'ACTIVE';

-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN "hospitalEpisodeId" TEXT;

-- CreateIndex
CREATE INDEX "Encounter_hospitalEpisodeId_idx" ON "Encounter"("hospitalEpisodeId");

-- AddForeignKey
ALTER TABLE "HospitalEpisode" ADD CONSTRAINT "HospitalEpisode_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HospitalEpisode" ADD CONSTRAINT "HospitalEpisode_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HospitalEpisode" ADD CONSTRAINT "HospitalEpisode_originatingEncounterId_fkey" FOREIGN KEY ("originatingEncounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HospitalEpisode" ADD CONSTRAINT "HospitalEpisode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HospitalEpisode" ADD CONSTRAINT "HospitalEpisode_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_hospitalEpisodeId_fkey" FOREIGN KEY ("hospitalEpisodeId") REFERENCES "HospitalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
