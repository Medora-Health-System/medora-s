-- P0.2 encrypted organization portability export metadata (additive only).

CREATE TYPE "OrganizationDataExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "OrganizationDataExportFormat" AS ENUM ('JSON', 'CSV', 'ZIP', 'XLSX');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_EXPORT_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_EXPORT_STARTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_EXPORT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_EXPORT_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_EXPORT_DOWNLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORGANIZATION_EXPORT_EXPIRED';

CREATE TABLE "OrganizationDataExport" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "status" "OrganizationDataExportStatus" NOT NULL DEFAULT 'QUEUED',
    "exportFormat" "OrganizationDataExportFormat" NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "patientCount" INTEGER NOT NULL DEFAULT 0,
    "encounterCount" INTEGER NOT NULL DEFAULT 0,
    "fileSizeBytes" BIGINT,
    "plaintextSha256" TEXT,
    "encryptedSha256" TEXT,
    "encryptionAlgorithm" TEXT,
    "encryptionIvBase64" TEXT,
    "encryptionAuthTagBase64" TEXT,
    "wrappedKeyReference" TEXT,
    "objectStorageKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "downloadedByUserId" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDataExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationDataExport_facilityId_status_requestedAt_idx" ON "OrganizationDataExport"("facilityId", "status", "requestedAt");
CREATE INDEX "OrganizationDataExport_requestedByUserId_requestedAt_idx" ON "OrganizationDataExport"("requestedByUserId", "requestedAt");
CREATE INDEX "OrganizationDataExport_downloadedByUserId_idx" ON "OrganizationDataExport"("downloadedByUserId");
CREATE INDEX "OrganizationDataExport_expiresAt_idx" ON "OrganizationDataExport"("expiresAt");

ALTER TABLE "OrganizationDataExport"
  ADD CONSTRAINT "OrganizationDataExport_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationDataExport"
  ADD CONSTRAINT "OrganizationDataExport_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrganizationDataExport"
  ADD CONSTRAINT "OrganizationDataExport_downloadedByUserId_fkey"
  FOREIGN KEY ("downloadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
