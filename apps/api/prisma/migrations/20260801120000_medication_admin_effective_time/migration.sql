-- Phase 15F-B: MAR effective administration time (separate from immutable administeredAt / createdAt)

ALTER TYPE "AuditAction" ADD VALUE 'MEDICATION_ADMIN_TIME_ADJUSTED';

ALTER TABLE "MedicationAdministration"
ADD COLUMN "effectiveAdministeredAt" TIMESTAMP(3),
ADD COLUMN "effectiveAdministeredAtSetAt" TIMESTAMP(3),
ADD COLUMN "effectiveAdministeredAtSetByUserId" TEXT,
ADD COLUMN "effectiveAdministeredAtReason" TEXT,
ADD COLUMN "effectiveAdministeredAtVersion" INTEGER NOT NULL DEFAULT 0;
