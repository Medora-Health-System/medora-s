-- Phase 6.6 (reordered): operational retry metadata on ClaimSubmissionAttempt.
-- Runs after `20260430170000_claim_submission_attempts_and_ack_loop` creates the table.
-- Idempotent for environments that already applied the pre-repair 20260422120000 migration.

ALTER TABLE "ClaimSubmissionAttempt" ADD COLUMN IF NOT EXISTS "failureCode" TEXT;
ALTER TABLE "ClaimSubmissionAttempt" ADD COLUMN IF NOT EXISTS "retryEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClaimSubmissionAttempt" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ClaimSubmissionAttempt_retryEligible_nextRetryAt_idx" ON "ClaimSubmissionAttempt"("retryEligible", "nextRetryAt");
