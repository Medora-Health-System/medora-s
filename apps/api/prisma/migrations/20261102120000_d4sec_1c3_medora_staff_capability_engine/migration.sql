-- D4SEC.1C.3 additive global staff/capability authority. No users, staff profiles, or grants are backfilled.
CREATE TYPE "PlatformCapabilityRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

CREATE TABLE "MedoraStaffProfile" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "classifiedByUserId" TEXT NOT NULL, "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "classificationReason" TEXT, "deactivatedByUserId" TEXT, "deactivatedAt" TIMESTAMP(3),
  "deactivationReason" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedoraStaffProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlatformCapability" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL,
  "riskLevel" "PlatformCapabilityRiskLevel" NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformCapability_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlatformCapabilityGrant" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "capabilityId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "grantedByUserId" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "grantReason" TEXT,
  "ticketReference" TEXT, "revokedByUserId" TEXT, "revokedAt" TIMESTAMP(3), "revokeReason" TEXT,
  CONSTRAINT "PlatformCapabilityGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MedoraStaffProfile_userId_key" ON "MedoraStaffProfile"("userId");
CREATE INDEX "MedoraStaffProfile_isActive_idx" ON "MedoraStaffProfile"("isActive");
CREATE UNIQUE INDEX "PlatformCapability_code_key" ON "PlatformCapability"("code");
CREATE INDEX "PlatformCapability_isActive_idx" ON "PlatformCapability"("isActive");
CREATE INDEX "PlatformCapabilityGrant_userId_isActive_idx" ON "PlatformCapabilityGrant"("userId", "isActive");
CREATE INDEX "PlatformCapabilityGrant_capabilityId_isActive_idx" ON "PlatformCapabilityGrant"("capabilityId", "isActive");
CREATE INDEX "PlatformCapabilityGrant_grantedByUserId_idx" ON "PlatformCapabilityGrant"("grantedByUserId");
CREATE INDEX "PlatformCapabilityGrant_revokedByUserId_idx" ON "PlatformCapabilityGrant"("revokedByUserId");
CREATE UNIQUE INDEX "PlatformCapabilityGrant_one_active_per_user_capability" ON "PlatformCapabilityGrant"("userId", "capabilityId") WHERE "isActive" = true;
ALTER TABLE "MedoraStaffProfile" ADD CONSTRAINT "MedoraStaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraStaffProfile" ADD CONSTRAINT "MedoraStaffProfile_classifiedByUserId_fkey" FOREIGN KEY ("classifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedoraStaffProfile" ADD CONSTRAINT "MedoraStaffProfile_deactivatedByUserId_fkey" FOREIGN KEY ("deactivatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformCapabilityGrant" ADD CONSTRAINT "PlatformCapabilityGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformCapabilityGrant" ADD CONSTRAINT "PlatformCapabilityGrant_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "PlatformCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformCapabilityGrant" ADD CONSTRAINT "PlatformCapabilityGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformCapabilityGrant" ADD CONSTRAINT "PlatformCapabilityGrant_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deterministic catalog only. These rows confer no authority without an explicit grant.
INSERT INTO "PlatformCapability" ("id","code","name","description","riskLevel","updatedAt") VALUES
('d4sec1c3-facility-create','FACILITY_CREATE','Create facilities','Create a platform facility record.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-facility-configure','FACILITY_CONFIGURE','Configure facilities','Configure non-clinical facility settings.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-facility-activate','FACILITY_ACTIVATE','Activate facilities','Activate or deactivate a facility.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-facility-health-view','FACILITY_HEALTH_VIEW','View facility health','View facility operational health.','MODERATE',CURRENT_TIMESTAMP),
('d4sec1c3-staff-view','STAFF_VIEW','View staff','View Medora staff classifications and grants.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-staff-provision','STAFF_PROVISION','Provision staff','Provision Medora staff identity lifecycle.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-staff-grant','STAFF_GRANT_CAPABILITIES','Grant staff capabilities','Grant global platform capabilities.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-staff-revoke','STAFF_REVOKE_CAPABILITIES','Revoke staff capabilities','Revoke global platform capabilities.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-security-access-view','SECURITY_ACCESS_VIEW','View security access','View platform access posture.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-security-mfa-recovery','SECURITY_MFA_RECOVERY','Recover MFA','Perform governed MFA recovery.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-security-privileged','SECURITY_PRIVILEGED_ACTIONS','Perform privileged security actions','Perform governed platform security actions.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-security-audit-view','SECURITY_AUDIT_VIEW','View security audit','View governed security audit data.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-compliance-audit-view','COMPLIANCE_AUDIT_VIEW','View compliance audit','View governed compliance audit data.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-compliance-roi','COMPLIANCE_ROI_MONITOR','Monitor ROI','Monitor release-of-information operations without chart authority.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-compliance-export','COMPLIANCE_EXPORT_MONITOR','Monitor exports','Monitor export operations without document access.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-compliance-controls','COMPLIANCE_CONTROLS_MANAGE','Manage compliance controls','Manage platform compliance controls.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-billing-view','BILLING_RCM_VIEW','View revenue cycle','View platform revenue-cycle operations.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-billing-manage','BILLING_RCM_MANAGE','Manage revenue cycle','Manage platform revenue-cycle operations.','CRITICAL',CURRENT_TIMESTAMP),
('d4sec1c3-catalog-view','CATALOG_CONFIG_VIEW','View catalog configuration','View platform catalog configuration.','MODERATE',CURRENT_TIMESTAMP),
('d4sec1c3-catalog-manage','CATALOG_CONFIG_MANAGE','Manage catalog configuration','Manage platform catalog configuration.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-system-health','SYSTEM_HEALTH_VIEW','View system health','View non-PHI system health.','MODERATE',CURRENT_TIMESTAMP),
('d4sec1c3-backup-readiness','SYSTEM_BACKUP_READINESS_VIEW','View backup readiness','View backup readiness metadata.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-golive','SYSTEM_GOLIVE_MONITOR','Monitor go-live','Monitor go-live readiness.','HIGH',CURRENT_TIMESTAMP),
('d4sec1c3-audit-export','AUDIT_EXPORT','Export audit data','Export governed audit data.','CRITICAL',CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
