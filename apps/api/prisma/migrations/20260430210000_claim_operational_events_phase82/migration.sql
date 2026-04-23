-- Phase 8.2 — durable clearinghouse / claim operational audit events (append-only).

CREATE TABLE IF NOT EXISTS "ClaimOperationalEvent" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT,
    "submissionId" TEXT,
    "batchId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimType" "ClaimSubmissionKind",
    "statusBefore" TEXT,
    "statusAfter" TEXT,
    "reasonCode" TEXT,
    "message" TEXT,
    "metadataJson" JSONB,
    CONSTRAINT "ClaimOperationalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClaimOperationalEvent_facilityId_eventAt_idx" ON "ClaimOperationalEvent"("facilityId", "eventAt");
CREATE INDEX IF NOT EXISTS "ClaimOperationalEvent_submissionId_eventAt_idx" ON "ClaimOperationalEvent"("submissionId", "eventAt");
CREATE INDEX IF NOT EXISTS "ClaimOperationalEvent_facilityId_eventType_eventAt_idx" ON "ClaimOperationalEvent"("facilityId", "eventType", "eventAt");
CREATE INDEX IF NOT EXISTS "ClaimOperationalEvent_encounterId_eventAt_idx" ON "ClaimOperationalEvent"("encounterId", "eventAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClaimOperationalEvent_facilityId_fkey'
  ) THEN
    ALTER TABLE "ClaimOperationalEvent"
      ADD CONSTRAINT "ClaimOperationalEvent_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClaimOperationalEvent_submissionId_fkey'
  ) THEN
    ALTER TABLE "ClaimOperationalEvent"
      ADD CONSTRAINT "ClaimOperationalEvent_submissionId_fkey"
      FOREIGN KEY ("submissionId") REFERENCES "ClaimSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
