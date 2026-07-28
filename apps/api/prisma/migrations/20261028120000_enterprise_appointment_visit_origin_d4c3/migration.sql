-- MEDUI.D4C.3 — Enterprise Appointment authority + durable Encounter.visitOrigin (additive).
-- No backfill of visit origins. No Encounter.type changes. No ClinicAppointment table.

-- Enums
DO $$ BEGIN
  CREATE TYPE "EncounterVisitOrigin" AS ENUM (
    'SCHEDULED',
    'WALK_IN',
    'FOLLOW_UP',
    'REFERRAL',
    'TRANSFER_IN',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'ARRIVED',
    'CHECKED_IN',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Encounter.visitOrigin (nullable = legacy/unknown)
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "visitOrigin" "EncounterVisitOrigin";

CREATE INDEX IF NOT EXISTS "Encounter_facilityId_visitOrigin_createdAt_idx"
  ON "Encounter"("facilityId", "visitOrigin", "createdAt");

-- Appointment table
CREATE TABLE IF NOT EXISTS "Appointment" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledStartAt" TIMESTAMP(3) NOT NULL,
  "scheduledEndAt" TIMESTAMP(3),
  "arrivedAt" TIMESTAMP(3),
  "checkedInAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "encounterId" TEXT,
  "providerId" TEXT,
  "departmentId" TEXT,
  "reason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_encounterId_key" ON "Appointment"("encounterId");
CREATE INDEX IF NOT EXISTS "Appointment_facilityId_scheduledStartAt_idx" ON "Appointment"("facilityId", "scheduledStartAt");
CREATE INDEX IF NOT EXISTS "Appointment_facilityId_status_scheduledStartAt_idx" ON "Appointment"("facilityId", "status", "scheduledStartAt");
CREATE INDEX IF NOT EXISTS "Appointment_facilityId_patientId_scheduledStartAt_idx" ON "Appointment"("facilityId", "patientId", "scheduledStartAt");
CREATE INDEX IF NOT EXISTS "Appointment_providerId_scheduledStartAt_idx" ON "Appointment"("providerId", "scheduledStartAt");
CREATE INDEX IF NOT EXISTS "Appointment_departmentId_scheduledStartAt_idx" ON "Appointment"("departmentId", "scheduledStartAt");

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_encounterId_fkey"
    FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Audit actions (PHI-safe metadata only)
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_ARRIVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_CHECK_IN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_CANCEL';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AMBULATORY_WALK_IN_CREATE';
