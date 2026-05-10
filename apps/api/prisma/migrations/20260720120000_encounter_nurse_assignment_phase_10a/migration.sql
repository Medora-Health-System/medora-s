-- Phase 10A — ER operational visibility (assignments)
--
-- Additive only. No destructive changes. Preserves all existing clinical / billing flow.
--
-- Adds nurse assignment + assignment timestamps to Encounter:
--   * nurseAssignedUserId        : RN currently responsible for the encounter (operational only;
--                                  not authorship and never used for clinical attribution).
--   * nurseAssignedAt            : timestamp of the most recent nurse assignment write.
--   * physicianAssignedAt        : timestamp of the most recent physician assignment write
--                                  (the field already existed; we now persist when it changed
--                                  to support PHI-safe operational monitoring).
--
-- Foreign key: SET NULL on user delete (consistent with `physicianAssigned`).

ALTER TABLE "Encounter"
  ADD COLUMN "nurseAssignedUserId" TEXT,
  ADD COLUMN "nurseAssignedAt"     TIMESTAMP(3),
  ADD COLUMN "physicianAssignedAt" TIMESTAMP(3);

ALTER TABLE "Encounter"
  ADD CONSTRAINT "Encounter_nurseAssignedUserId_fkey"
  FOREIGN KEY ("nurseAssignedUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Encounter_nurseAssignedUserId_idx" ON "Encounter"("nurseAssignedUserId");

-- Audit actions for operational ownership changes. PHI-safe metadata only.
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_ASSIGN_PROVIDER';
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_ASSIGN_NURSE';
