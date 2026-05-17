-- Suivi d'investigation interne MSPP (lien alertKey / triage), sans modifier signaux ni validation.

-- Replay-safe legacy migration guard for CI/local/prod history alignment. Existing production object is preserved.
DO $$
BEGIN
  CREATE TYPE "MsppAlertInvestigationStatus" AS ENUM ('OPEN', 'FIELD_VERIFICATION', 'LAB_FOLLOWUP', 'COORDINATION_ACTIVE', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MsppAlertInvestigationEventAction" AS ENUM ('OPENED', 'STATUS_CHANGED', 'NOTE_ADDED', 'ASSIGNED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MsppAlertInvestigation" (
    "id" TEXT NOT NULL,
    "alertKey" TEXT NOT NULL,
    "msppAlertTriageId" TEXT,
    "diseaseCode" TEXT NOT NULL,
    "escalationLevel" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "geoCommuneId" TEXT,
    "investigationStatus" "MsppAlertInvestigationStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsppAlertInvestigation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MsppAlertInvestigation_alertKey_key" ON "MsppAlertInvestigation"("alertKey");

CREATE UNIQUE INDEX IF NOT EXISTS "MsppAlertInvestigation_msppAlertTriageId_key" ON "MsppAlertInvestigation"("msppAlertTriageId");

CREATE INDEX IF NOT EXISTS "MsppAlertInvestigation_investigationStatus_idx" ON "MsppAlertInvestigation"("investigationStatus");

CREATE INDEX IF NOT EXISTS "MsppAlertInvestigation_departmentId_idx" ON "MsppAlertInvestigation"("departmentId");

CREATE INDEX IF NOT EXISTS "MsppAlertInvestigation_updatedAt_idx" ON "MsppAlertInvestigation"("updatedAt");

CREATE TABLE IF NOT EXISTS "MsppAlertInvestigationEvent" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "action" "MsppAlertInvestigationEventAction" NOT NULL,
    "note" TEXT,
    "statusBefore" "MsppAlertInvestigationStatus",
    "statusAfter" "MsppAlertInvestigationStatus",
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MsppAlertInvestigationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MsppAlertInvestigationEvent_investigationId_createdAt_idx" ON "MsppAlertInvestigationEvent"("investigationId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "MsppAlertInvestigation" ADD CONSTRAINT "MsppAlertInvestigation_msppAlertTriageId_fkey" FOREIGN KEY ("msppAlertTriageId") REFERENCES "MsppAlertTriage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MsppAlertInvestigation" ADD CONSTRAINT "MsppAlertInvestigation_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MsppAlertInvestigation" ADD CONSTRAINT "MsppAlertInvestigation_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MsppAlertInvestigationEvent" ADD CONSTRAINT "MsppAlertInvestigationEvent_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "MsppAlertInvestigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MsppAlertInvestigationEvent" ADD CONSTRAINT "MsppAlertInvestigationEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
