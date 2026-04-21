-- Phase 6.2 — Claim submission artifact persistence (no transmission).

CREATE TYPE "ClaimSubmissionKind" AS ENUM ('PROFESSIONAL_837P', 'FACILITY_837I');

CREATE TYPE "ClaimSubmissionStatus" AS ENUM (
  'DRAFT',
  'GENERATED',
  'READY_TO_SEND',
  'SENT',
  'ACK_PENDING',
  'ACCEPTED',
  'REJECTED',
  'NEEDS_CORRECTION',
  'CANCELLED'
);

CREATE TABLE "ClaimControlCounter" (
    "id" TEXT NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "ClaimControlCounter_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ClaimControlCounter" ("id", "value") VALUES ('default', 0);

CREATE TABLE "ClaimSubmissionBatch" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "interchangeCtrl" TEXT NOT NULL,
    "groupCtrl" TEXT NOT NULL,
    "senderId" TEXT,
    "receiverId" TEXT,
    "interchangeX12Text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClaimSubmissionBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClaimSubmission" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "claimType" "ClaimSubmissionKind" NOT NULL,
    "status" "ClaimSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "batchId" TEXT,
    "transactionCtrl" TEXT,
    "x12Text" TEXT,
    "exportJson" JSONB,
    "warningsJson" JSONB,
    "missingFieldsJson" JSONB,
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClaimSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClaimSubmissionBatch_facilityId_idx" ON "ClaimSubmissionBatch"("facilityId");

CREATE INDEX "ClaimSubmissionBatch_interchangeCtrl_idx" ON "ClaimSubmissionBatch"("interchangeCtrl");

CREATE INDEX "ClaimSubmission_encounterId_idx" ON "ClaimSubmission"("encounterId");

CREATE INDEX "ClaimSubmission_facilityId_status_idx" ON "ClaimSubmission"("facilityId", "status");

CREATE INDEX "ClaimSubmission_batchId_idx" ON "ClaimSubmission"("batchId");

CREATE INDEX "ClaimSubmission_claimType_idx" ON "ClaimSubmission"("claimType");

ALTER TABLE "ClaimSubmissionBatch" ADD CONSTRAINT "ClaimSubmissionBatch_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClaimSubmission" ADD CONSTRAINT "ClaimSubmission_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ClaimSubmissionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClaimSubmission" ADD CONSTRAINT "ClaimSubmission_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClaimSubmission" ADD CONSTRAINT "ClaimSubmission_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
