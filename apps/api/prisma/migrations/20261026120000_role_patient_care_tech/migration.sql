-- D4A.3.0-H1 — Dedicated hospital patient-care technician RoleCode.
-- Justified: RoleCode had only LAB/RADIOLOGY as tech-like values; those must not
-- authorize hospital PATIENT_CARE_TECH / board TECHNICIAN assignment slots.
-- Additive enum value only — no table rewrite, no production data repair.

ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'PATIENT_CARE_TECH';
