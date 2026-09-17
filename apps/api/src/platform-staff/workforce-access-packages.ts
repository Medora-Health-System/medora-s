import type { PlatformCapabilityCode } from "./platform-capabilities";
import type { WorkforceInput } from "./corporate-workforce.service";

export type CorporateDepartment = WorkforceInput["department"];
export type WorkforceAccessPackageCode =
  | "TECHNOLOGY_IT_ADMIN"
  | "ENGINEERING"
  | "IMPLEMENTATION"
  | "SUPPORT"
  | "COMPLIANCE_SECURITY"
  | "BILLING_RCM"
  | "PRODUCT_QA"
  | "PLATFORM_OPERATIONS"
  | "EXECUTIVE_ADMINISTRATION";

export type WorkforceAccessPackage = {
  code: WorkforceAccessPackageCode;
  label: string;
  department: CorporateDepartment;
  capabilities: readonly PlatformCapabilityCode[];
};

/**
 * Governance templates only. Department/job identity never grants runtime authority.
 * Explicit PlatformCapabilityGrant rows remain authoritative. Critical capabilities
 * are returned separately so callers can route them through privileged dual control.
 */
export const WORKFORCE_ACCESS_PACKAGES: Readonly<Record<CorporateDepartment, WorkforceAccessPackage>> = {
  TECHNOLOGY_IT: { code:"TECHNOLOGY_IT_ADMIN", label:"Technology / IT Administration", department:"TECHNOLOGY_IT", capabilities:["FACILITY_CREATE","FACILITY_CONFIGURE","FACILITY_ACTIVATE","FACILITY_HEALTH_VIEW","STAFF_VIEW","STAFF_PROVISION","STAFF_GRANT_CAPABILITIES","STAFF_REVOKE_CAPABILITIES","PRIVILEGED_ACTION_APPROVE","SECURITY_ACCESS_VIEW","SECURITY_MFA_RECOVERY","SECURITY_PRIVILEGED_ACTIONS","SECURITY_AUDIT_VIEW","COMPLIANCE_AUDIT_VIEW","COMPLIANCE_EXPORT_MONITOR","COMPLIANCE_ROI_MONITOR","CATALOG_CONFIG_VIEW","CATALOG_CONFIG_MANAGE","SYSTEM_HEALTH_VIEW","SYSTEM_BACKUP_READINESS_VIEW","SYSTEM_GOLIVE_MONITOR","AUDIT_EXPORT"] },
  ENGINEERING: { code:"ENGINEERING", label:"Engineering", department:"ENGINEERING", capabilities:["CATALOG_CONFIG_VIEW","CATALOG_CONFIG_MANAGE","FACILITY_HEALTH_VIEW","SYSTEM_HEALTH_VIEW","SYSTEM_BACKUP_READINESS_VIEW","SYSTEM_GOLIVE_MONITOR"] },
  IMPLEMENTATION: { code:"IMPLEMENTATION", label:"Implementation", department:"IMPLEMENTATION", capabilities:["FACILITY_CREATE","FACILITY_CONFIGURE","FACILITY_ACTIVATE","FACILITY_HEALTH_VIEW","CATALOG_CONFIG_VIEW","CATALOG_CONFIG_MANAGE","SYSTEM_HEALTH_VIEW","SYSTEM_GOLIVE_MONITOR"] },
  SUPPORT: { code:"SUPPORT", label:"Support", department:"SUPPORT", capabilities:["FACILITY_HEALTH_VIEW","STAFF_VIEW","SYSTEM_HEALTH_VIEW"] },
  COMPLIANCE_SECURITY: { code:"COMPLIANCE_SECURITY", label:"Compliance / Security", department:"COMPLIANCE_SECURITY", capabilities:["COMPLIANCE_AUDIT_VIEW","COMPLIANCE_EXPORT_MONITOR","COMPLIANCE_ROI_MONITOR","COMPLIANCE_CONTROLS_MANAGE","SECURITY_ACCESS_VIEW","SECURITY_MFA_RECOVERY","SECURITY_PRIVILEGED_ACTIONS","SECURITY_AUDIT_VIEW","AUDIT_EXPORT"] },
  BILLING_RCM: { code:"BILLING_RCM", label:"Billing / RCM", department:"BILLING_RCM", capabilities:["BILLING_RCM_VIEW","BILLING_RCM_MANAGE"] },
  PRODUCT_QA: { code:"PRODUCT_QA", label:"Product / QA", department:"PRODUCT_QA", capabilities:["CATALOG_CONFIG_VIEW","FACILITY_HEALTH_VIEW","SYSTEM_HEALTH_VIEW","SYSTEM_GOLIVE_MONITOR"] },
  PLATFORM_OPERATIONS: { code:"PLATFORM_OPERATIONS", label:"Platform Operations", department:"PLATFORM_OPERATIONS", capabilities:["FACILITY_CONFIGURE","FACILITY_ACTIVATE","FACILITY_HEALTH_VIEW","SECURITY_ACCESS_VIEW","SECURITY_AUDIT_VIEW","SYSTEM_HEALTH_VIEW","SYSTEM_BACKUP_READINESS_VIEW","SYSTEM_GOLIVE_MONITOR","AUDIT_EXPORT"] },
  EXECUTIVE_ADMINISTRATION: { code:"EXECUTIVE_ADMINISTRATION", label:"Executive Administration", department:"EXECUTIVE_ADMINISTRATION", capabilities:["FACILITY_HEALTH_VIEW","STAFF_VIEW","COMPLIANCE_AUDIT_VIEW","SYSTEM_HEALTH_VIEW","SYSTEM_GOLIVE_MONITOR"] },
};
