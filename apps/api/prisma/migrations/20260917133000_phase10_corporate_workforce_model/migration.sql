-- Phase 10 — Corporate Workforce Model
-- IMPORTANT: this repository contains security migrations dated 20261102+ that create
-- MedoraStaffProfile. Phase 10's filename sorts before those migrations, so this migration
-- must not reference MedoraStaffProfile or later platform tables. Workforce identity is
-- linked to the authoritative User now; application services require an active
-- MedoraStaffProfile before any workforce row can be created or changed.
CREATE TYPE "MedoraCorporateDepartment" AS ENUM (
  'TECHNOLOGY_IT', 'ENGINEERING', 'IMPLEMENTATION', 'SUPPORT', 'COMPLIANCE_SECURITY',
  'BILLING_RCM', 'PRODUCT_QA', 'PLATFORM_OPERATIONS', 'EXECUTIVE_ADMINISTRATION'
);
CREATE TYPE "MedoraEmployeeType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'CONSULTANT', 'INTERN');
CREATE TYPE "MedoraEmploymentStatus" AS ENUM ('ACTIVE', 'LEAVE', 'SUSPENDED', 'TERMINATED');

CREATE TABLE "MedoraWorkforceProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "department" "MedoraCorporateDepartment" NOT NULL,
  "jobTitle" VARCHAR(150) NOT NULL,
  "managerUserId" TEXT,
  "employeeType" "MedoraEmployeeType" NOT NULL DEFAULT 'FULL_TIME',
  "employmentStatus" "MedoraEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedoraWorkforceProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedoraWorkforceProfile_userId_key" UNIQUE ("userId"),
  CONSTRAINT "MedoraWorkforceProfile_dates_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
);
CREATE INDEX "MedoraWorkforceProfile_department_status_idx" ON "MedoraWorkforceProfile"("department", "employmentStatus");
CREATE INDEX "MedoraWorkforceProfile_managerUserId_idx" ON "MedoraWorkforceProfile"("managerUserId");
ALTER TABLE "MedoraWorkforceProfile" ADD CONSTRAINT "MedoraWorkforceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraWorkforceProfile" ADD CONSTRAINT "MedoraWorkforceProfile_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraWorkforceProfile" ADD CONSTRAINT "MedoraWorkforceProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraWorkforceProfile" ADD CONSTRAINT "MedoraWorkforceProfile_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
