-- Medora Patient Portal identity foundation.
-- Additive only: does not modify User, UserRole, AuthSession, RoleCode, staff JWTs, or facility RBAC.

CREATE TYPE "PatientPortalAccountStatus" AS ENUM (
  'PENDING_VERIFICATION',
  'ACTIVE',
  'LOCKED',
  'DISABLED'
);

CREATE TYPE "PatientPortalLinkStatus" AS ENUM (
  'PENDING',
  'VERIFIED',
  'REVOKED'
);

CREATE TYPE "PatientPortalVerificationMethod" AS ENUM (
  'FACILITY_ACTIVATION_CODE',
  'VERIFIED_PHONE',
  'VERIFIED_EMAIL',
  'MRN_DOB',
  'GOVERNMENT_ID',
  'MANUAL_STAFF_VERIFICATION'
);

CREATE TYPE "PatientPortalOtpPurpose" AS ENUM (
  'EMAIL_VERIFY',
  'PHONE_VERIFY',
  'PASSWORD_RESET',
  'FACILITY_LINK'
);

CREATE TABLE "PatientPortalAccount" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "passwordHash" TEXT NOT NULL,
  "status" "PatientPortalAccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "emailVerifiedAt" TIMESTAMP(3),
  "phoneVerifiedAt" TIMESTAMP(3),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "dob" TIMESTAMP(3) NOT NULL,
  "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientPortalAccount_contact_required" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL),
  CONSTRAINT "PatientPortalAccount_language_check" CHECK ("preferredLanguage" IN ('en','es','fr'))
);

CREATE UNIQUE INDEX "PatientPortalAccount_email_key" ON "PatientPortalAccount"("email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX "PatientPortalAccount_phone_key" ON "PatientPortalAccount"("phone") WHERE "phone" IS NOT NULL;
CREATE INDEX "PatientPortalAccount_name_dob_idx" ON "PatientPortalAccount"("lastName", "firstName", "dob");
CREATE INDEX "PatientPortalAccount_status_idx" ON "PatientPortalAccount"("status");

CREATE TABLE "PatientPortalSession" (
  "id" TEXT NOT NULL,
  "portalAccountId" TEXT NOT NULL,
  "refreshTokenHash" TEXT,
  "deviceId" TEXT,
  "deviceName" TEXT,
  "userAgent" TEXT,
  "ipCreated" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PatientPortalSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientPortalSession_account_revoked_idx" ON "PatientPortalSession"("portalAccountId", "revokedAt");
CREATE INDEX "PatientPortalSession_expires_idx" ON "PatientPortalSession"("expiresAt");
ALTER TABLE "PatientPortalSession"
  ADD CONSTRAINT "PatientPortalSession_portalAccountId_fkey"
  FOREIGN KEY ("portalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PatientPortalLink" (
  "id" TEXT NOT NULL,
  "portalAccountId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "status" "PatientPortalLinkStatus" NOT NULL DEFAULT 'PENDING',
  "verificationMethod" "PatientPortalVerificationMethod",
  "verifiedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientPortalLink_account_patient_facility_key" ON "PatientPortalLink"("portalAccountId", "patientId", "facilityId");
CREATE INDEX "PatientPortalLink_account_facility_status_idx" ON "PatientPortalLink"("portalAccountId", "facilityId", "status");
CREATE INDEX "PatientPortalLink_patient_facility_status_idx" ON "PatientPortalLink"("patientId", "facilityId", "status");
ALTER TABLE "PatientPortalLink"
  ADD CONSTRAINT "PatientPortalLink_portalAccountId_fkey"
  FOREIGN KEY ("portalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientPortalLink"
  ADD CONSTRAINT "PatientPortalLink_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalLink"
  ADD CONSTRAINT "PatientPortalLink_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PatientPortalVerificationChallenge" (
  "id" TEXT NOT NULL,
  "portalAccountId" TEXT,
  "purpose" "PatientPortalOtpPurpose" NOT NULL,
  "destinationHash" TEXT,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalVerificationChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientPortalVerificationChallenge_account_purpose_exp_idx" ON "PatientPortalVerificationChallenge"("portalAccountId", "purpose", "expiresAt");
ALTER TABLE "PatientPortalVerificationChallenge"
  ADD CONSTRAINT "PatientPortalVerificationChallenge_portalAccountId_fkey"
  FOREIGN KEY ("portalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Patient-actor audit trail is intentionally separate from staff AuditLog in P1.
-- This avoids overloading AuditLog.userId (which is a FK to staff User) or changing staff audit semantics.
CREATE TABLE "PatientPortalAuditLog" (
  "id" TEXT NOT NULL,
  "portalAccountId" TEXT,
  "sessionId" TEXT,
  "facilityId" TEXT,
  "patientId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientPortalAuditLog_account_created_idx" ON "PatientPortalAuditLog"("portalAccountId", "createdAt");
CREATE INDEX "PatientPortalAuditLog_facility_patient_created_idx" ON "PatientPortalAuditLog"("facilityId", "patientId", "createdAt");
CREATE INDEX "PatientPortalAuditLog_action_created_idx" ON "PatientPortalAuditLog"("action", "createdAt");
ALTER TABLE "PatientPortalAuditLog"
  ADD CONSTRAINT "PatientPortalAuditLog_portalAccountId_fkey"
  FOREIGN KEY ("portalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientPortalAuditLog"
  ADD CONSTRAINT "PatientPortalAuditLog_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "PatientPortalSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientPortalAuditLog"
  ADD CONSTRAINT "PatientPortalAuditLog_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalAuditLog"
  ADD CONSTRAINT "PatientPortalAuditLog_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
