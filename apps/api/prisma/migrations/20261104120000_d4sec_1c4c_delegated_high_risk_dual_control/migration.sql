-- D4SEC.1C.4C additive dual-control authority. No users, grants, approvers, or requests are seeded.
CREATE TYPE "PrivilegedActionOperationType" AS ENUM ('STAFF_PROVISION', 'STAFF_GRANT_CAPABILITY');
CREATE TYPE "PrivilegedActionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'EXECUTED', 'FAILED');

CREATE TABLE "PrivilegedActionRequest" (
  "id" TEXT NOT NULL,
  "operationType" "PrivilegedActionOperationType" NOT NULL,
  "status" "PrivilegedActionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requesterUserId" TEXT NOT NULL,
  "requesterSessionId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "scope" JSONB NOT NULL,
  "scopeDigest" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "ticketReference" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "approverUserId" TEXT,
  "approverSessionId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "closedByUserId" TEXT,
  "closedAt" TIMESTAMP(3),
  "executionActorUserId" TEXT,
  "executedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  CONSTRAINT "PrivilegedActionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrivilegedActionRequest_digest_sha256_check" CHECK ("scopeDigest" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "PrivilegedActionRequest_expiry_check" CHECK ("expiresAt" > "requestedAt")
);
CREATE INDEX "PrivilegedActionRequest_status_expiresAt_idx" ON "PrivilegedActionRequest"("status", "expiresAt");
CREATE INDEX "PrivilegedActionRequest_requesterUserId_requestedAt_idx" ON "PrivilegedActionRequest"("requesterUserId", "requestedAt");
CREATE INDEX "PrivilegedActionRequest_approverUserId_requestedAt_idx" ON "PrivilegedActionRequest"("approverUserId", "requestedAt");
CREATE INDEX "PrivilegedActionRequest_targetUserId_requestedAt_idx" ON "PrivilegedActionRequest"("targetUserId", "requestedAt");
ALTER TABLE "PrivilegedActionRequest" ADD CONSTRAINT "PrivilegedActionRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrivilegedActionRequest" ADD CONSTRAINT "PrivilegedActionRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrivilegedActionRequest" ADD CONSTRAINT "PrivilegedActionRequest_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrivilegedActionRequest" ADD CONSTRAINT "PrivilegedActionRequest_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrivilegedActionRequest" ADD CONSTRAINT "PrivilegedActionRequest_executionActorUserId_fkey" FOREIGN KEY ("executionActorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deterministic definition only; it confers no authority without an explicit governed grant.
INSERT INTO "PlatformCapability" ("id","code","name","description","riskLevel","updatedAt") VALUES
('d4sec1c4c-privileged-approve','PRIVILEGED_ACTION_APPROVE','Approve privileged actions','Independently approve narrowly scoped dual-controlled platform actions.','CRITICAL',CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
