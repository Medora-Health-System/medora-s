export const PROCEDURE_CHARGE_MAPPING_STATUSES = [
  "NOT_MAPPED",
  "READY_FOR_REVIEW",
  "CODER_REVIEW_REQUIRED",
  "CHARGE_MASTER_LINKED",
  "INSTITUTION_POLICY_REQUIRED",
  "NOT_BILLABLE",
] as const;

export type ProcedureChargeMappingStatus = (typeof PROCEDURE_CHARGE_MAPPING_STATUSES)[number];

export const PROCEDURE_CHARGE_CODE_SYSTEMS = [
  "CPT",
  "HCPCS",
  "REVENUE_CODE",
  "INTERNAL_CHARGE_CODE",
  "LOCAL_CHARGE_CODE",
] as const;

export type ProcedureChargeCodeSystem = (typeof PROCEDURE_CHARGE_CODE_SYSTEMS)[number];

export const PROCEDURE_CHARGE_MAPPING_SOURCES = [
  "ENTERPRISE_DEFAULT",
  "FACILITY_CHARGE_MASTER",
  "MANUAL_REVIEW",
  "IMPORTED_CATALOG",
  "NOT_CONFIGURED",
] as const;

export type ProcedureChargeMappingSource = (typeof PROCEDURE_CHARGE_MAPPING_SOURCES)[number];

export const PROCEDURE_BILLING_READINESS_STATUSES = [
  "READY",
  "REVIEW_REQUIRED",
  "NOT_READY",
  "NOT_APPLICABLE",
] as const;

export type ProcedureBillingReadinessStatus = (typeof PROCEDURE_BILLING_READINESS_STATUSES)[number];

export const PROCEDURE_BILLING_READINESS_REASONS = [
  "ENTERPRISE_PROCEDURE_NOT_MAPPED",
  "CODER_REVIEW_REQUIRED",
  "DOCUMENTATION_REQUIRED_FOR_BILLING_REVIEW",
  "FACILITY_CHARGE_MASTER_REQUIRED",
  "INSTITUTION_POLICY_REQUIRED",
  "PROCEDURE_NOT_BILLABLE",
  "READY_FOR_BILLING_REVIEW_PREVIEW",
  "MISSING_ENTERPRISE_PROCEDURE_ID",
  "FACILITY_BILLING_IDENTITY_INCOMPLETE",
] as const;

export type ProcedureBillingReadinessReason = (typeof PROCEDURE_BILLING_READINESS_REASONS)[number];

export type EnterpriseProcedureDefaultCodeCandidate = {
  codeSystem: ProcedureChargeCodeSystem;
  code: string;
  label: string;
  reviewRequired: true;
};

export type EnterpriseProcedureChargeMapping = {
  status: ProcedureChargeMappingStatus;
  suggestedCodeSystems: ProcedureChargeCodeSystem[];
  mappingSource: ProcedureChargeMappingSource;
  defaultCodeCandidates?: EnterpriseProcedureDefaultCodeCandidate[];
};
