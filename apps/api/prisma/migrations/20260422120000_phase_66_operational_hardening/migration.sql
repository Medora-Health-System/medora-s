-- Phase 6.6 (ordering repair): inbound ACK dead-letter storage only at this timestamp.
--
-- ClaimSubmissionAttempt retry columns (failureCode, retryEligible, nextRetryAt) and their index
-- were originally placed here but that runs BEFORE `ClaimSubmissionAttempt` is created by
-- `20260430170000_claim_submission_attempts_and_ack_loop`. Those DDL statements were moved to
-- `20260430180000_phase_66_operational_hardening_reordered`.
--
-- This migration only creates `ClaimAcknowledgmentDeadLetter`, which references `Facility` and is
-- valid before `ClaimSubmissionAttempt` exists.

CREATE TABLE IF NOT EXISTS "ClaimAcknowledgmentDeadLetter" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "failureCode" TEXT NOT NULL,
    "failureDetail" TEXT,
    "vendorMeta" JSONB,
    "replayedAt" TIMESTAMP(3),
    "replayedToAckId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimAcknowledgmentDeadLetter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClaimAcknowledgmentDeadLetter_facilityId_createdAt_idx" ON "ClaimAcknowledgmentDeadLetter"("facilityId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClaimAcknowledgmentDeadLetter_facilityId_replayedAt_idx" ON "ClaimAcknowledgmentDeadLetter"("facilityId", "replayedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClaimAcknowledgmentDeadLetter_facilityId_fkey'
  ) THEN
    ALTER TABLE "ClaimAcknowledgmentDeadLetter" ADD CONSTRAINT "ClaimAcknowledgmentDeadLetter_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
