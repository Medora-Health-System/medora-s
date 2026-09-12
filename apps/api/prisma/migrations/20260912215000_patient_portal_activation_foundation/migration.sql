-- Facility-issued one-time activation tokens for patient portal linking.
-- Staff creates the activation only after normal identity verification at the facility.

CREATE TABLE "PatientPortalActivation" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PatientPortalActivation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientPortalActivation_patient_facility_idx"
  ON "PatientPortalActivation"("patientId", "facilityId", "createdAt");
CREATE INDEX "PatientPortalActivation_facility_expires_idx"
  ON "PatientPortalActivation"("facilityId", "expiresAt");

ALTER TABLE "PatientPortalActivation"
  ADD CONSTRAINT "PatientPortalActivation_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalActivation"
  ADD CONSTRAINT "PatientPortalActivation_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalActivation"
  ADD CONSTRAINT "PatientPortalActivation_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
