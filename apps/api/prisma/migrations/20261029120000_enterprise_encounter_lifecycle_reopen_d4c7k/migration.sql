-- MEDUI.D4C.7K — Enterprise encounter close/reopen metadata + append-only lifecycle timeline.
-- Additive only. No backfill of closedAt from dischargedAt. No rewrite of historical discharge.

-- Encounter closure / reopen columns
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "closedByUserId" TEXT;
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3);
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "reopenedByUserId" TEXT;
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "reopenReason" TEXT;
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "reopenReasonCode" TEXT;
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "reopenCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Encounter_closedAt_idx" ON "Encounter"("closedAt");
CREATE INDEX IF NOT EXISTS "Encounter_reopenedAt_idx" ON "Encounter"("reopenedAt");
CREATE INDEX IF NOT EXISTS "Encounter_closedByUserId_idx" ON "Encounter"("closedByUserId");
CREATE INDEX IF NOT EXISTS "Encounter_reopenedByUserId_idx" ON "Encounter"("reopenedByUserId");

DO $$ BEGIN
  ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_closedByUserId_fkey"
    FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_reopenedByUserId_fkey"
    FOREIGN KEY ("reopenedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AuditAction.ENCOUNTER_REOPEN
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ENCOUNTER_REOPEN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Append-only lifecycle timeline
CREATE TABLE IF NOT EXISTS "EncounterLifecycleTransition" (
  "id" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "patientId" TEXT,
  "careSetting" TEXT,
  "transitionType" TEXT NOT NULL,
  "previousState" TEXT,
  "newState" TEXT,
  "actorUserId" TEXT,
  "actorRoleCodesJson" JSONB,
  "reason" TEXT,
  "reasonCode" TEXT,
  "clientRequestId" TEXT,
  "requestId" TEXT,
  "supportOverride" BOOLEAN NOT NULL DEFAULT false,
  "metadataJson" JSONB,
  "sequence" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EncounterLifecycleTransition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EncounterLifecycleTransition_encounterId_sequence_key"
  ON "EncounterLifecycleTransition"("encounterId", "sequence");
CREATE INDEX IF NOT EXISTS "EncounterLifecycleTransition_facilityId_encounterId_createdAt_idx"
  ON "EncounterLifecycleTransition"("facilityId", "encounterId", "createdAt");
CREATE INDEX IF NOT EXISTS "EncounterLifecycleTransition_encounterId_createdAt_idx"
  ON "EncounterLifecycleTransition"("encounterId", "createdAt");
CREATE INDEX IF NOT EXISTS "EncounterLifecycleTransition_facilityId_transitionType_createdAt_idx"
  ON "EncounterLifecycleTransition"("facilityId", "transitionType", "createdAt");
CREATE INDEX IF NOT EXISTS "EncounterLifecycleTransition_clientRequestId_idx"
  ON "EncounterLifecycleTransition"("clientRequestId");
CREATE INDEX IF NOT EXISTS "EncounterLifecycleTransition_actorUserId_idx"
  ON "EncounterLifecycleTransition"("actorUserId");

DO $$ BEGIN
  ALTER TABLE "EncounterLifecycleTransition" ADD CONSTRAINT "EncounterLifecycleTransition_encounterId_fkey"
    FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EncounterLifecycleTransition" ADD CONSTRAINT "EncounterLifecycleTransition_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EncounterLifecycleTransition" ADD CONSTRAINT "EncounterLifecycleTransition_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EncounterLifecycleTransition" ADD CONSTRAINT "EncounterLifecycleTransition_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
