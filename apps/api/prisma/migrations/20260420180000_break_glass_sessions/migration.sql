-- Break-glass emergency chart access + audit actions
ALTER TYPE "AuditAction" ADD VALUE 'BREAK_GLASS_START';
ALTER TYPE "AuditAction" ADD VALUE 'BREAK_GLASS_ACCESS';
ALTER TYPE "AuditAction" ADD VALUE 'BREAK_GLASS_END';

CREATE TABLE "BreakGlassSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreakGlassSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BreakGlassSession_userId_facilityId_patientId_idx" ON "BreakGlassSession"("userId", "facilityId", "patientId");
CREATE INDEX "BreakGlassSession_facilityId_patientId_idx" ON "BreakGlassSession"("facilityId", "patientId");
CREATE INDEX "BreakGlassSession_expiresAt_idx" ON "BreakGlassSession"("expiresAt");

ALTER TABLE "BreakGlassSession" ADD CONSTRAINT "BreakGlassSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BreakGlassSession" ADD CONSTRAINT "BreakGlassSession_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BreakGlassSession" ADD CONSTRAINT "BreakGlassSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BreakGlassSession" ADD CONSTRAINT "BreakGlassSession_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
