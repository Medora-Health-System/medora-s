-- D4SEC.1C.5A: additive facility-target support for immutable dual-controlled activation changes.
ALTER TYPE "PrivilegedActionOperationType" ADD VALUE 'FACILITY_ACTIVATION_CHANGE';
ALTER TYPE "PrivilegedActionOperationType" ADD VALUE 'MFA_RESET';
ALTER TABLE "PrivilegedActionRequest" ALTER COLUMN "targetUserId" DROP NOT NULL;
ALTER TABLE "PrivilegedActionRequest" ADD COLUMN "targetFacilityId" TEXT;
CREATE INDEX "PrivilegedActionRequest_targetFacilityId_requestedAt_idx"
  ON "PrivilegedActionRequest"("targetFacilityId", "requestedAt");
ALTER TABLE "PrivilegedActionRequest" ADD CONSTRAINT "PrivilegedActionRequest_targetFacilityId_fkey"
  FOREIGN KEY ("targetFacilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrivilegedActionRequest" ADD CONSTRAINT "PrivilegedActionRequest_exact_target_check"
  CHECK (("targetUserId" IS NOT NULL)::int + ("targetFacilityId" IS NOT NULL)::int = 1);
