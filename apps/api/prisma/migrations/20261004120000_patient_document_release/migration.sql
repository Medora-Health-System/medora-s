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

-- Defense in depth: a release row can never authorize a different patient/facility than
-- the document itself, even if a future caller bypasses the application service.
CREATE OR REPLACE FUNCTION "enforcePatientDocumentReleaseScope"()
RETURNS TRIGGER AS $$
DECLARE
  document_patient_id TEXT;
  document_facility_id TEXT;
  patient_facility_id TEXT;
BEGIN
  SELECT "patientId", "facilityId"
    INTO document_patient_id, document_facility_id
    FROM "EnterpriseDocument"
    WHERE "id" = NEW."documentId";

  IF document_patient_id IS NULL OR document_facility_id IS NULL
     OR document_patient_id <> NEW."patientId"
     OR document_facility_id <> NEW."facilityId" THEN
    RAISE EXCEPTION 'PatientDocumentRelease scope does not match EnterpriseDocument';
  END IF;

  SELECT "facilityId"
    INTO patient_facility_id
    FROM "Patient"
    WHERE "id" = NEW."patientId";

  IF patient_facility_id IS NULL OR patient_facility_id <> NEW."facilityId" THEN
    RAISE EXCEPTION 'PatientDocumentRelease patient does not belong to facility';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PatientDocumentRelease_scope_guard"
BEFORE INSERT OR UPDATE OF "documentId", "patientId", "facilityId"
ON "PatientDocumentRelease"
FOR EACH ROW
EXECUTE FUNCTION "enforcePatientDocumentReleaseScope"();
