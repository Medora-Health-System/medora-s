export const TECHNOLOGY_IT_ADMIN_CAPABILITIES = [
  "FACILITY_CREATE",
  "FACILITY_CONFIGURE",
  "FACILITY_ACTIVATE",
  "FACILITY_HEALTH_VIEW",
  "STAFF_VIEW",
  "STAFF_PROVISION",
  "STAFF_GRANT_CAPABILITIES",
  "STAFF_REVOKE_CAPABILITIES",
  "PRIVILEGED_ACTION_APPROVE",
  "SECURITY_ACCESS_VIEW",
  "SECURITY_MFA_RECOVERY",
  "SECURITY_PRIVILEGED_ACTIONS",
  "SECURITY_AUDIT_VIEW",
  "COMPLIANCE_AUDIT_VIEW",
  "COMPLIANCE_EXPORT_MONITOR",
  "COMPLIANCE_ROI_MONITOR",
  "CATALOG_CONFIG_VIEW",
  "CATALOG_CONFIG_MANAGE",
  "SYSTEM_HEALTH_VIEW",
  "SYSTEM_BACKUP_READINESS_VIEW",
  "SYSTEM_GOLIVE_MONITOR",
  "AUDIT_EXPORT",
] as const;

export type TechnologyItAdminCapability = (typeof TECHNOLOGY_IT_ADMIN_CAPABILITIES)[number];

/**
 * A bounded operational package for Medora engineering / IT administrators.
 *
 * Intentionally excluded:
 * - BILLING_RCM_VIEW / BILLING_RCM_MANAGE: financial data remains billing-only.
 * - COMPLIANCE_CONTROLS_MANAGE: policy mutation remains compliance/security-owned.
 *
 * This package is presentation/configuration only. Runtime authorization continues
 * to be driven by explicit PlatformCapabilityGrant rows. Critical capabilities must
 * still use the privileged-action dual-control workflow.
 */
export const TECHNOLOGY_IT_ADMIN_PACKAGE = {
  code: "TECHNOLOGY_IT_ADMIN",
  label: "Technology / IT Administration",
  basePersona: "PLATFORM_OPERATIONS",
  capabilities: TECHNOLOGY_IT_ADMIN_CAPABILITIES,
} as const;
