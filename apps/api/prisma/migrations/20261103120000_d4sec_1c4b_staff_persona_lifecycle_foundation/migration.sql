-- D4SEC.1C.4B: additive persona classification, explicit grant provenance, and append-only lifecycle attribution.
CREATE TYPE "MedoraStaffPersona" AS ENUM ('IMPLEMENTATION', 'SUPPORT', 'BILLING_OPERATIONS', 'COMPLIANCE_SECURITY', 'PLATFORM_OPERATIONS');
CREATE TYPE "MedoraStaffLifecycleEventType" AS ENUM ('PROVISION', 'ACTIVATE', 'DEACTIVATE', 'PERSONA_CHANGE');
CREATE TYPE "PlatformCapabilityGrantProvenance" AS ENUM ('MANUAL', 'PERSONA');

ALTER TABLE "MedoraStaffProfile" ADD COLUMN "persona" "MedoraStaffPersona";
ALTER TABLE "PlatformCapabilityGrant" ADD COLUMN "provenance" "PlatformCapabilityGrantProvenance" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "PlatformCapabilityGrant" ADD COLUMN "managedPersona" "MedoraStaffPersona";
ALTER TABLE "PlatformCapabilityGrant" ADD CONSTRAINT "PlatformCapabilityGrant_persona_provenance_check"
  CHECK (("provenance" = 'PERSONA' AND "managedPersona" IS NOT NULL) OR ("provenance" = 'MANUAL' AND "managedPersona" IS NULL));

CREATE TABLE "MedoraStaffLifecycleEvent" (
  "id" TEXT NOT NULL,
  "staffProfileId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "eventType" "MedoraStaffLifecycleEventType" NOT NULL,
  "oldPersona" "MedoraStaffPersona",
  "newPersona" "MedoraStaffPersona",
  "oldIsActive" BOOLEAN,
  "newIsActive" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "ticketReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedoraStaffLifecycleEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MedoraStaffLifecycleEvent_staffProfileId_createdAt_idx" ON "MedoraStaffLifecycleEvent"("staffProfileId", "createdAt");
CREATE INDEX "MedoraStaffLifecycleEvent_actorUserId_idx" ON "MedoraStaffLifecycleEvent"("actorUserId");
ALTER TABLE "MedoraStaffLifecycleEvent" ADD CONSTRAINT "MedoraStaffLifecycleEvent_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "MedoraStaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraStaffLifecycleEvent" ADD CONSTRAINT "MedoraStaffLifecycleEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
