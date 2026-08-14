-- MEDUI.D4C.9A — additive DepartmentCode for Dental service-line provisioning.
-- Specialties (ORTHODONTICS, GENERAL_DENTISTRY, …) are NOT DepartmentCode values.
ALTER TYPE "DepartmentCode" ADD VALUE IF NOT EXISTS 'DENTAL';
