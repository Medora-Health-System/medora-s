-- CreateEnum
CREATE TYPE "EncounterWorkflowState" AS ENUM (
  'ARRIVED',
  'TRIAGE',
  'IN_TREATMENT',
  'RESULTS_PENDING',
  'DISPOSITION',
  'DISCHARGE_READY',
  'FINALIZED',
  'CLOSED'
);

-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN "workflowState" "EncounterWorkflowState" NOT NULL DEFAULT 'ARRIVED';

-- Backfill: align with lifecycle; legacy open visits treated as in active treatment
UPDATE "Encounter" SET "workflowState" = 'CLOSED' WHERE "status" = 'CLOSED';
UPDATE "Encounter" SET "workflowState" = 'CLOSED' WHERE "status" = 'CANCELLED';
UPDATE "Encounter" SET "workflowState" = 'IN_TREATMENT' WHERE "status" = 'OPEN';

CREATE INDEX "Encounter_workflowState_idx" ON "Encounter"("workflowState");
