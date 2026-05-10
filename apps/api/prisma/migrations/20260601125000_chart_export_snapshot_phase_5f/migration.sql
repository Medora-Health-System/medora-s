-- Phase 5F — immutable encounter chart export snapshot.
--
-- Additive only:
--   * Two new AuditAction enum values (RECORD_EXPORT, RECORD_EXPORT_VIEW).
--   * One new table EncounterChartExport storing the JSON manifest + SHA-256 hash.
--   * Indexes for facility/encounter/createdAt scans, patient timeline, and hash lookup.
--   * Foreign keys: Restrict on facility/encounter/patient (snapshots must not be silently
--     invalidated by upstream deletes); SetNull on exportedByUser so snapshots survive
--     account deactivation/removal.
--
-- No destructive changes. No backfill required. Existing rows / behavior unaffected.

ALTER TYPE "AuditAction" ADD VALUE 'RECORD_EXPORT';
ALTER TYPE "AuditAction" ADD VALUE 'RECORD_EXPORT_VIEW';

CREATE TABLE "EncounterChartExport" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "exportedByUserId" TEXT,
    "manifestVersion" TEXT NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "manifestJson" JSONB NOT NULL,
    "renderedFormat" TEXT NOT NULL,
    "templateVersion" TEXT,
    "livePreview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterChartExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EncounterChartExport_facilityId_encounterId_createdAt_idx"
    ON "EncounterChartExport"("facilityId", "encounterId", "createdAt");

CREATE INDEX "EncounterChartExport_patientId_createdAt_idx"
    ON "EncounterChartExport"("patientId", "createdAt");

CREATE INDEX "EncounterChartExport_manifestHash_idx"
    ON "EncounterChartExport"("manifestHash");

ALTER TABLE "EncounterChartExport"
    ADD CONSTRAINT "EncounterChartExport_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EncounterChartExport"
    ADD CONSTRAINT "EncounterChartExport_encounterId_fkey"
    FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EncounterChartExport"
    ADD CONSTRAINT "EncounterChartExport_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EncounterChartExport"
    ADD CONSTRAINT "EncounterChartExport_exportedByUserId_fkey"
    FOREIGN KEY ("exportedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
