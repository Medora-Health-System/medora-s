-- Phase 6 — governed RxNorm review operations (non-clinical).
-- Additive only: reviewer roles, candidate assignment/defer fields, review audit events.

-- AlterEnum RoleCode
ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'MEDICATION_REVIEWER';
ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'MEDICATION_ADMIN';

-- AlterTable RxNormMappingCandidate
ALTER TABLE "RxNormMappingCandidate" ADD COLUMN IF NOT EXISTS "assignedToUserId" TEXT;
ALTER TABLE "RxNormMappingCandidate" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);
ALTER TABLE "RxNormMappingCandidate" ADD COLUMN IF NOT EXISTS "reviewStartedAt" TIMESTAMP(3);
ALTER TABLE "RxNormMappingCandidate" ADD COLUMN IF NOT EXISTS "deferredAt" TIMESTAMP(3);
ALTER TABLE "RxNormMappingCandidate" ADD COLUMN IF NOT EXISTS "deferredReason" TEXT;

CREATE INDEX IF NOT EXISTS "RxNormMappingCandidate_assignedToUserId_idx"
  ON "RxNormMappingCandidate"("assignedToUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RxNormMappingCandidate_assignedToUserId_fkey'
  ) THEN
    ALTER TABLE "RxNormMappingCandidate"
      ADD CONSTRAINT "RxNormMappingCandidate_assignedToUserId_fkey"
      FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable RxNormReviewAuditEvent
CREATE TABLE IF NOT EXISTS "RxNormReviewAuditEvent" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT,
  "verifiedMappingId" TEXT,
  "action" VARCHAR(48) NOT NULL,
  "actorUserId" TEXT,
  "actorRoleLabel" VARCHAR(64),
  "rationaleNotes" TEXT,
  "evidenceJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RxNormReviewAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RxNormReviewAuditEvent_candidateId_idx"
  ON "RxNormReviewAuditEvent"("candidateId");
CREATE INDEX IF NOT EXISTS "RxNormReviewAuditEvent_verifiedMappingId_idx"
  ON "RxNormReviewAuditEvent"("verifiedMappingId");
CREATE INDEX IF NOT EXISTS "RxNormReviewAuditEvent_action_idx"
  ON "RxNormReviewAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "RxNormReviewAuditEvent_actorUserId_idx"
  ON "RxNormReviewAuditEvent"("actorUserId");
CREATE INDEX IF NOT EXISTS "RxNormReviewAuditEvent_createdAt_idx"
  ON "RxNormReviewAuditEvent"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RxNormReviewAuditEvent_candidateId_fkey'
  ) THEN
    ALTER TABLE "RxNormReviewAuditEvent"
      ADD CONSTRAINT "RxNormReviewAuditEvent_candidateId_fkey"
      FOREIGN KEY ("candidateId") REFERENCES "RxNormMappingCandidate"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RxNormReviewAuditEvent_actorUserId_fkey'
  ) THEN
    ALTER TABLE "RxNormReviewAuditEvent"
      ADD CONSTRAINT "RxNormReviewAuditEvent_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
