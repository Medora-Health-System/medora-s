-- Suivi d'investigation interne MSPP (lien alertKey / triage), sans modifier signaux ni validation.

CREATE TYPE "MsppAlertInvestigationStatus" AS ENUM ('OPEN', 'FIELD_VERIFICATION', 'LAB_FOLLOWUP', 'COORDINATION_ACTIVE', 'CLOSED');

CREATE TYPE "MsppAlertInvestigationEventAction" AS ENUM ('OPENED', 'STATUS_CHANGED', 'NOTE_ADDED', 'ASSIGNED');

CREATE TABLE "MsppAlertInvestigation" (
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

CREATE UNIQUE INDEX "MsppAlertInvestigation_alertKey_key" ON "MsppAlertInvestigation"("alertKey");

CREATE UNIQUE INDEX "MsppAlertInvestigation_msppAlertTriageId_key" ON "MsppAlertInvestigation"("msppAlertTriageId");

CREATE INDEX "MsppAlertInvestigation_investigationStatus_idx" ON "MsppAlertInvestigation"("investigationStatus");

CREATE INDEX "MsppAlertInvestigation_departmentId_idx" ON "MsppAlertInvestigation"("departmentId");

CREATE INDEX "MsppAlertInvestigation_updatedAt_idx" ON "MsppAlertInvestigation"("updatedAt");

CREATE TABLE "MsppAlertInvestigationEvent" (
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

CREATE INDEX "MsppAlertInvestigationEvent_investigationId_createdAt_idx" ON "MsppAlertInvestigationEvent"("investigationId", "createdAt");

ALTER TABLE "MsppAlertInvestigation" ADD CONSTRAINT "MsppAlertInvestigation_msppAlertTriageId_fkey" FOREIGN KEY ("msppAlertTriageId") REFERENCES "MsppAlertTriage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MsppAlertInvestigation" ADD CONSTRAINT "MsppAlertInvestigation_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MsppAlertInvestigation" ADD CONSTRAINT "MsppAlertInvestigation_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MsppAlertInvestigationEvent" ADD CONSTRAINT "MsppAlertInvestigationEvent_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "MsppAlertInvestigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MsppAlertInvestigationEvent" ADD CONSTRAINT "MsppAlertInvestigationEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
