-- Phase 5: clinician result acknowledgment traceability (additive).
ALTER TABLE "Result" ADD COLUMN "acknowledgedByUserId" TEXT;

CREATE INDEX "Result_acknowledgedByUserId_idx" ON "Result"("acknowledgedByUserId");
