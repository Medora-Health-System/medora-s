-- Phase 10 — Corporate Workforce Model
-- Medora corporate workforce metadata is intentionally separate from facility Department/UserRole.
CREATE TYPE "MedoraCorporateDepartment" AS ENUM (
  'TECHNOLOGY_IT', 'ENGINEERING', 'IMPLEMENTATION', 'SUPPORT', 'COMPLIANCE_SECURITY',
  'BILLING_RCM', 'PRODUCT_QA', 'PLATFORM_OPERATIONS', 'EXECUTIVE_ADMINISTRATION'
);
CREATE TYPE "MedoraEmployeeType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'CONSULTANT', 'INTERN');
CREATE TYPE "MedoraEmploymentStatus" AS ENUM ('ACTIVE', 'LEAVE', 'SUSPENDED', 'TERMINATED');

CREATE TABLE "MedoraWorkforceProfile" (
  "id" UUID NOT NULL,
  "staffProfileId" UUID NOT NULL,
  "department" "MedoraCorporateDepartment" NOT NULL,
  "jobTitle" VARCHAR(150) NOT NULL,
  "managerUserId" UUID,
  "employeeType" "MedoraEmployeeType" NOT NULL DEFAULT 'FULL_TIME',
  "employmentStatus" "MedoraEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "createdByUserId" UUID NOT NULL,
  "updatedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedoraWorkforceProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedoraWorkforceProfile_staffProfileId_key" UNIQUE ("staffProfileId"),
  CONSTRAINT "MedoraWorkforceProfile_dates_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
);
CREATE INDEX "MedoraWorkforceProfile_department_status_idx" ON "MedoraWorkforceProfile"("department", "employmentStatus");
CREATE INDEX "MedoraWorkforceProfile_managerUserId_idx" ON "MedoraWorkforceProfile"("managerUserId");
ALTER TABLE "MedoraWorkforceProfile" ADD CONSTRAINT "MedoraWorkforceProfile_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "MedoraStaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraWorkforceProfile" ADD CONSTRAINT "MedoraWorkforceProfile_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraWorkforceProfile" ADD CONSTRAINT "MedoraWorkforceProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraWorkforceProfile" ADD CONSTRAINT "MedoraWorkforceProfile_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
