import type {
  BillingClassification,
  BillingGovernanceMetricDomain,
  BillingGovernanceReason,
  BillingGovernanceSeverity,
} from "@medora/shared";

export function billingGovernanceSeverityLabelKey(severity: BillingGovernanceSeverity): string {
  return `billingGovernance.severity.${severity}`;
}

export function billingGovernanceDomainLabelKey(domain: BillingGovernanceMetricDomain): string {
  return `billingGovernance.domain.${domain}`;
}

export function billingGovernanceReasonLabelKey(reason: BillingGovernanceReason): string {
  return `billingGovernance.reason.${reason}`;
}

export function billingGovernanceClassificationFilterOptions(): BillingClassification[] {
  return [
    "CLINIC_VISIT",
    "URGENT_CARE",
    "EMERGENCY_DEPARTMENT",
    "OBSERVATION",
    "INPATIENT",
    "PROCEDURE",
    "TELEHEALTH",
  ];
}

export function billingGovernanceSeverityColor(severity: BillingGovernanceSeverity): string {
  switch (severity) {
    case "OK":
      return "#166534";
    case "WATCH":
      return "#a16207";
    case "REVIEW_REQUIRED":
      return "#c2410c";
    case "BLOCKED":
      return "#991b1b";
    default:
      return "#475569";
  }
}
