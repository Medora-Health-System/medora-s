-- TriageVitalsReading: measurement time, recorder attribution, governed void status.
-- Temperature site / oxygen device context remain additive keys inside vitalsJson.

CREATE TYPE "TriageVitalsReadingStatus" AS ENUM ('ACTIVE', 'VOIDED');

ALTER TABLE "TriageVitalsReading"
  ADD COLUMN "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "recordedByUserId" TEXT,
  ADD COLUMN "status" "TriageVitalsReadingStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidedByUserId" TEXT,
  ADD COLUMN "voidReasonCode" TEXT,
  ADD COLUMN "voidReasonText" TEXT;

-- Legacy rows: measuredAt mirrors recordedAt (clinical time was not captured separately).
UPDATE "TriageVitalsReading" SET "measuredAt" = "recordedAt";

ALTER TABLE "TriageVitalsReading"
  ADD CONSTRAINT "TriageVitalsReading_recordedByUserId_fkey"
  FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TriageVitalsReading"
  ADD CONSTRAINT "TriageVitalsReading_voidedByUserId_fkey"
  FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TriageVitalsReading_patientId_measuredAt_idx" ON "TriageVitalsReading"("patientId", "measuredAt");
CREATE INDEX "TriageVitalsReading_encounterId_measuredAt_idx" ON "TriageVitalsReading"("encounterId", "measuredAt");
CREATE INDEX "TriageVitalsReading_recordedByUserId_idx" ON "TriageVitalsReading"("recordedByUserId");
CREATE INDEX "TriageVitalsReading_status_idx" ON "TriageVitalsReading"("status");
CREATE INDEX "TriageVitalsReading_voidedByUserId_idx" ON "TriageVitalsReading"("voidedByUserId");
