-- MEDUI.D4C.1 — Clinic / Urgent Care facility care profile foundation (additive).
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "facilityCareProfileJson" JSONB;

-- AuditAction: facility care profile updates (PHI-safe metadata only).
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FACILITY_CARE_PROFILE_UPDATED';
