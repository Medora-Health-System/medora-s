-- Explicit patient visibility authority for verified diagnostic results.
-- Verification remains the clinical source-of-truth event; release is a separate patient-communication decision.
CREATE TABLE "PatientDiagnosticResultRelease" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "releasedByUserId" TEXT,
  "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientDiagnosticResultRelease_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientDiagnosticResultRelease_orderItemId_key" ON "PatientDiagnosticResultRelease"("orderItemId");
CREATE INDEX "PatientDiagnosticResultRelease_patientId_facilityId_revokedAt_idx" ON "PatientDiagnosticResultRelease"("patientId", "facilityId", "revokedAt");
ALTER TABLE "PatientDiagnosticResultRelease" ADD CONSTRAINT "PatientDiagnosticResultRelease_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientDiagnosticResultRelease" ADD CONSTRAINT "PatientDiagnosticResultRelease_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientDiagnosticResultRelease" ADD CONSTRAINT "PatientDiagnosticResultRelease_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientDiagnosticResultRelease" ADD CONSTRAINT "PatientDiagnosticResultRelease_releasedByUserId_fkey" FOREIGN KEY ("releasedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientDiagnosticResultRelease" ADD CONSTRAINT "PatientDiagnosticResultRelease_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "enforcePatientDiagnosticResultReleaseScope"()
RETURNS TRIGGER AS $$
DECLARE order_patient_id TEXT; order_facility_id TEXT; diagnostic_type TEXT; verified_at TIMESTAMP(3);
BEGIN
  SELECT o."patientId", o."facilityId", oi."catalogItemType", r."verifiedAt"
    INTO order_patient_id, order_facility_id, diagnostic_type, verified_at
    FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId" LEFT JOIN "Result" r ON r."orderItemId" = oi."id"
    WHERE oi."id" = NEW."orderItemId";
  IF order_patient_id IS NULL OR order_facility_id IS NULL OR order_patient_id <> NEW."patientId" OR order_facility_id <> NEW."facilityId" THEN
    RAISE EXCEPTION 'Diagnostic release scope does not match authoritative order';
  END IF;
  IF diagnostic_type NOT IN ('LAB_TEST', 'IMAGING_STUDY') OR verified_at IS NULL THEN
    RAISE EXCEPTION 'Only verified diagnostic results may be released';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PatientDiagnosticResultRelease_scope_guard"
BEFORE INSERT OR UPDATE OF "orderItemId", "patientId", "facilityId" ON "PatientDiagnosticResultRelease"
FOR EACH ROW EXECUTE FUNCTION "enforcePatientDiagnosticResultReleaseScope"();
