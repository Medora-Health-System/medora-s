-- Phase 6.3 lifecycle: transmission attempts + acknowledgment persistence.
-- Additive and defensive for CI replay / production-safe deploys.

CREATE TABLE IF NOT EXISTS "ClaimSubmissionAttempt" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "transport" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "requestMetaJson" JSONB,
    "responseMetaJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClaimSubmissionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClaimAcknowledgment" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "submissionId" TEXT,
    "batchId" TEXT,
    "kind" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "parsedJson" JSONB,
    "statusCode" TEXT,
    "message" TEXT,
    "warningCode" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClaimAcknowledgment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClaimSubmissionAttempt_submissionId_createdAt_idx"
  ON "ClaimSubmissionAttempt"("submissionId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClaimAcknowledgment_facilityId_receivedAt_idx"
  ON "ClaimAcknowledgment"("facilityId", "receivedAt");
CREATE INDEX IF NOT EXISTS "ClaimAcknowledgment_submissionId_idx"
  ON "ClaimAcknowledgment"("submissionId");
CREATE INDEX IF NOT EXISTS "ClaimAcknowledgment_batchId_idx"
  ON "ClaimAcknowledgment"("batchId");
CREATE INDEX IF NOT EXISTS "ClaimAcknowledgment_kind_idx"
  ON "ClaimAcknowledgment"("kind");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClaimSubmissionAttempt_submissionId_fkey'
  ) THEN
    ALTER TABLE "ClaimSubmissionAttempt"
      ADD CONSTRAINT "ClaimSubmissionAttempt_submissionId_fkey"
      FOREIGN KEY ("submissionId") REFERENCES "ClaimSubmission"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClaimAcknowledgment_facilityId_fkey'
  ) THEN
    ALTER TABLE "ClaimAcknowledgment"
      ADD CONSTRAINT "ClaimAcknowledgment_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClaimAcknowledgment_submissionId_fkey'
  ) THEN
    ALTER TABLE "ClaimAcknowledgment"
      ADD CONSTRAINT "ClaimAcknowledgment_submissionId_fkey"
      FOREIGN KEY ("submissionId") REFERENCES "ClaimSubmission"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClaimAcknowledgment_batchId_fkey'
  ) THEN
    ALTER TABLE "ClaimAcknowledgment"
      ADD CONSTRAINT "ClaimAcknowledgment_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "ClaimSubmissionBatch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
