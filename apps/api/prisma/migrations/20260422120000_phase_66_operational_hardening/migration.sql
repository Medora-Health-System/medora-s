-- Phase 6.6 — operational retry metadata on attempts + inbound ACK dead-letter storage

ALTER TABLE "ClaimSubmissionAttempt" ADD COLUMN "failureCode" TEXT,
ADD COLUMN "retryEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "nextRetryAt" TIMESTAMP(3);

CREATE INDEX "ClaimSubmissionAttempt_retryEligible_nextRetryAt_idx" ON "ClaimSubmissionAttempt"("retryEligible", "nextRetryAt");

CREATE TABLE "ClaimAcknowledgmentDeadLetter" (
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

CREATE INDEX "ClaimAcknowledgmentDeadLetter_facilityId_createdAt_idx" ON "ClaimAcknowledgmentDeadLetter"("facilityId", "createdAt");
CREATE INDEX "ClaimAcknowledgmentDeadLetter_facilityId_replayedAt_idx" ON "ClaimAcknowledgmentDeadLetter"("facilityId", "replayedAt");

ALTER TABLE "ClaimAcknowledgmentDeadLetter" ADD CONSTRAINT "ClaimAcknowledgmentDeadLetter_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
