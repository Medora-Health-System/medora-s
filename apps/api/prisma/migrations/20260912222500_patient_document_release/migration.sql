-- Explicit patient-portal document release authority.
-- A document remains patient-visible only while this row is not revoked.
-- Finalized registration packets may still be released by the portal's narrow automatic policy.

CREATE TABLE "PatientDocumentRelease" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "releasedByUserId" TEXT,
  "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientDocumentRelease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientDocumentRelease_documentId_key"
  ON "PatientDocumentRelease"("documentId");
CREATE INDEX "PatientDocumentRelease_patientId_facilityId_revokedAt_idx"
  ON "PatientDocumentRelease"("patientId", "facilityId", "revokedAt");
CREATE INDEX "PatientDocumentRelease_facilityId_releasedAt_idx"
  ON "PatientDocumentRelease"("facilityId", "releasedAt");

ALTER TABLE "PatientDocumentRelease"
  ADD CONSTRAINT "PatientDocumentRelease_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "EnterpriseDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientDocumentRelease"
  ADD CONSTRAINT "PatientDocumentRelease_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientDocumentRelease"
  ADD CONSTRAINT "PatientDocumentRelease_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientDocumentRelease"
  ADD CONSTRAINT "PatientDocumentRelease_releasedByUserId_fkey"
  FOREIGN KEY ("releasedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientDocumentRelease"
  ADD CONSTRAINT "PatientDocumentRelease_revokedByUserId_fkey"
  FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
