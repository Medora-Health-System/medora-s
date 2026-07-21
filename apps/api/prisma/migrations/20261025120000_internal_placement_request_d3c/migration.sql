-- D3C InternalPlacementRequest foundation — additive, non-destructive.
-- MEDUI.INTERNAL_PLACEMENT_AND_RECEIVING_ENCOUNTER_D3C
-- Requires D3B HospitalEpisode migration to be applied first (ordering).
-- No backfill. No Encounter.type conversion. No automatic episode/receiving creation.
-- Partial unique active request per originating encounter is SQL-only.

-- CreateEnum
CREATE TYPE "InternalPlacementRequestedEncounterType" AS ENUM (
  'OBSERVATION',
  'INPATIENT'
);

CREATE TYPE "InternalPlacementStatus" AS ENUM (
  'DRAFT',
  'SIGNED',
  'REQUESTED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'BED_ASSIGNED',
  'READY_FOR_TRANSFER',
  'DEPARTED_ED',
  'ARRIVED_DESTINATION',
  'COMPLETED',
  'CANCELLED',
  'DECLINED',
  'EXPIRED',
  'ERROR_REVIEW'
);

CREATE TYPE "ReceivingEncounterLifecycle" AS ENUM (
  'NONE',
  'PLANNED',
  'READY',
  'ACTIVE',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "InternalPlacementRequest" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalEpisodeId" TEXT,
    "originatingEncounterId" TEXT NOT NULL,
    "receivingEncounterId" TEXT,
    "receivingEncounterLifecycle" "ReceivingEncounterLifecycle" NOT NULL DEFAULT 'NONE',
    "requestedEncounterType" "InternalPlacementRequestedEncounterType" NOT NULL,
    "requestedLevelOfCare" TEXT,
    "requestedService" TEXT,
    "requestedSpecialty" TEXT,
    "requestedUnitCode" TEXT,
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3),
    "clinicalPriority" TEXT,
    "admissionDiagnosisSummary" TEXT,
    "reasonForPlacement" TEXT,
    "telemetryRequired" BOOLEAN NOT NULL DEFAULT false,
    "isolationRequired" BOOLEAN NOT NULL DEFAULT false,
    "isolationType" TEXT,
    "specialPlacementNeedsJson" JSONB,
    "acceptingProviderUserId" TEXT,
    "acceptingProviderNameSnapshot" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "acceptanceNotes" TEXT,
    "assignedUnitCode" TEXT,
    "assignedRoomKey" TEXT,
    "assignedBedKey" TEXT,
    "assignmentSourceSystem" TEXT,
    "assignedAt" TIMESTAMP(3),
    "assignedByUserId" TEXT,
    "readyForTransferAt" TIMESTAMP(3),
    "departedEdAt" TIMESTAMP(3),
    "arrivedDestinationAt" TIMESTAMP(3),
    "departureDocumentedByUserId" TEXT,
    "arrivalDocumentedByUserId" TEXT,
    "status" "InternalPlacementStatus" NOT NULL DEFAULT 'DRAFT',
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,

    CONSTRAINT "InternalPlacementRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalPlacementRequest_facilityId_status_requestedAt_idx"
  ON "InternalPlacementRequest"("facilityId", "status", "requestedAt");

CREATE INDEX "InternalPlacementRequest_facilityId_patientId_status_idx"
  ON "InternalPlacementRequest"("facilityId", "patientId", "status");

CREATE INDEX "InternalPlacementRequest_originatingEncounterId_status_idx"
  ON "InternalPlacementRequest"("originatingEncounterId", "status");

CREATE INDEX "InternalPlacementRequest_hospitalEpisodeId_idx"
  ON "InternalPlacementRequest"("hospitalEpisodeId");

CREATE INDEX "InternalPlacementRequest_receivingEncounterId_idx"
  ON "InternalPlacementRequest"("receivingEncounterId");

CREATE INDEX "InternalPlacementRequest_assigned_unit_room_bed_idx"
  ON "InternalPlacementRequest"("assignedUnitCode", "assignedRoomKey", "assignedBedKey");

-- At most one non-terminal placement request per originating ED encounter.
CREATE UNIQUE INDEX "InternalPlacementRequest_originating_active_uidx"
ON "InternalPlacementRequest" ("originatingEncounterId")
WHERE "status" NOT IN (
  'CANCELLED',
  'DECLINED',
  'EXPIRED',
  'ERROR_REVIEW',
  'COMPLETED'
);

-- Receiving encounter may be linked to at most one placement request.
CREATE UNIQUE INDEX "InternalPlacementRequest_receivingEncounterId_key"
ON "InternalPlacementRequest"("receivingEncounterId")
WHERE "receivingEncounterId" IS NOT NULL;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_hospitalEpisodeId_fkey"
  FOREIGN KEY ("hospitalEpisodeId") REFERENCES "HospitalEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_originatingEncounterId_fkey"
  FOREIGN KEY ("originatingEncounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_receivingEncounterId_fkey"
  FOREIGN KEY ("receivingEncounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_acceptingProviderUserId_fkey"
  FOREIGN KEY ("acceptingProviderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_assignedByUserId_fkey"
  FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_departureDocumentedByUserId_fkey"
  FOREIGN KEY ("departureDocumentedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_arrivalDocumentedByUserId_fkey"
  FOREIGN KEY ("arrivalDocumentedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalPlacementRequest"
  ADD CONSTRAINT "InternalPlacementRequest_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
