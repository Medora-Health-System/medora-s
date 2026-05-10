-- Phase 5G — Release of Information (ROI) governance around immutable chart export snapshots.
--
-- Additive only:
--   * New enums ChartRoiRequestType, ChartRoiRequestStatus, ChartRoiDeliveryMethod.
--   * Six new AuditAction values (ROI request lifecycle + governed snapshot view).
--   * New table ChartRoiRequest linking facility, patient, optional encounter, optional snapshot.
--
-- No destructive changes. No backfill required.

CREATE TYPE "ChartRoiRequestType" AS ENUM (
  'PATIENT_REQUEST',
  'INSURANCE',
  'LEGAL',
  'REGULATOR',
  'INTERNAL_AUDIT'
);

CREATE TYPE "ChartRoiRequestStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'FULFILLED',
  'CANCELLED',
  'DENIED'
);

CREATE TYPE "ChartRoiDeliveryMethod" AS ENUM (
  'IN_PERSON_PICKUP',
  'SECURE_PORTAL',
  'COURIER',
  'REGULATOR_SECURE_CHANNEL',
  'INTERNAL_HANDOFF',
  'OTHER'
);

ALTER TYPE "AuditAction" ADD VALUE 'ROI_REQUEST_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'ROI_REQUEST_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'ROI_REQUEST_DENY';
ALTER TYPE "AuditAction" ADD VALUE 'ROI_REQUEST_CANCEL';
ALTER TYPE "AuditAction" ADD VALUE 'ROI_REQUEST_FULFILL';
ALTER TYPE "AuditAction" ADD VALUE 'ROI_EXPORT_VIEW';

CREATE TABLE "ChartRoiRequest" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "fulfilledByUserId" TEXT,
    "encounterChartExportId" TEXT,
    "requestType" "ChartRoiRequestType" NOT NULL,
    "status" "ChartRoiRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientName" TEXT,
    "recipientOrganization" TEXT,
    "deliveryMethod" "ChartRoiDeliveryMethod",
    "purpose" TEXT NOT NULL,
    "authorizationReference" TEXT,
    "denialReason" TEXT,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "deniedAt" TIMESTAMP(3),

    CONSTRAINT "ChartRoiRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChartRoiRequest_facilityId_status_createdAt_idx"
    ON "ChartRoiRequest"("facilityId", "status", "createdAt");

CREATE INDEX "ChartRoiRequest_facilityId_patientId_createdAt_idx"
    ON "ChartRoiRequest"("facilityId", "patientId", "createdAt");

CREATE INDEX "ChartRoiRequest_encounterId_idx"
    ON "ChartRoiRequest"("encounterId");

ALTER TABLE "ChartRoiRequest"
    ADD CONSTRAINT "ChartRoiRequest_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChartRoiRequest"
    ADD CONSTRAINT "ChartRoiRequest_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChartRoiRequest"
    ADD CONSTRAINT "ChartRoiRequest_encounterId_fkey"
    FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChartRoiRequest"
    ADD CONSTRAINT "ChartRoiRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChartRoiRequest"
    ADD CONSTRAINT "ChartRoiRequest_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChartRoiRequest"
    ADD CONSTRAINT "ChartRoiRequest_fulfilledByUserId_fkey"
    FOREIGN KEY ("fulfilledByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChartRoiRequest"
    ADD CONSTRAINT "ChartRoiRequest_encounterChartExportId_fkey"
    FOREIGN KEY ("encounterChartExportId") REFERENCES "EncounterChartExport"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
