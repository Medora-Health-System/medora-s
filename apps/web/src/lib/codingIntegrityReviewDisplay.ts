import type {
  BillingClassification,
  CodingIntegrityDomain,
  CodingIntegrityReason,
  CodingIntegrityStatus,
  DocumentationCompletenessFlags,
} from "@medora/shared";

export function codingIntegrityStatusLabelKey(status: CodingIntegrityStatus): string {
  return `codingIntegrityReview.status.${status}`;
}

export function codingIntegrityDomainLabelKey(domain: CodingIntegrityDomain): string {
  return `codingIntegrityReview.domain.${domain}`;
}

export function codingIntegrityReasonLabelKey(reason: CodingIntegrityReason): string {
  return `codingIntegrityReview.reason.${reason}`;
}

export function codingIntegrityStatusCardBackground(status: CodingIntegrityStatus): string {
  switch (status) {
    case "READY_FOR_CODING_REVIEW":
    case "COMPLETED_REVIEW":
      return "#ecfdf5";
    case "HOLD_FOR_OPEN_ENCOUNTER":
    case "HOLD_FOR_PENDING_RESULTS":
      return "#fffbeb";
    default:
      return "#fff7ed";
  }
}

export function codingIntegrityClassificationFilterOptions(): BillingClassification[] {
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

export function codingIntegrityStatusFilterOptions(): CodingIntegrityStatus[] {
  return [
    "READY_FOR_CODING_REVIEW",
    "NEEDS_PROVIDER_CLARIFICATION",
    "NEEDS_DOCUMENTATION_COMPLETION",
    "NEEDS_OBSERVATION_REVIEW",
    "NEEDS_FACILITY_REVIEW",
    "NEEDS_COMPLIANCE_REVIEW",
    "HOLD_FOR_PENDING_RESULTS",
    "HOLD_FOR_OPEN_ENCOUNTER",
    "COMPLETED_REVIEW",
  ];
}

export function codingIntegrityDomainFilterOptions(): CodingIntegrityDomain[] {
  return [
    "PROFESSIONAL_DOCUMENTATION",
    "FACILITY_DOCUMENTATION",
    "OBSERVATION_DOCUMENTATION",
    "DISPOSITION_DOCUMENTATION",
    "PROCEDURE_DOCUMENTATION",
    "TELEHEALTH_DOCUMENTATION",
    "COMPLIANCE",
    "GENERAL",
  ];
}

export function documentationCompletenessIndicatorKeys(
  flags: DocumentationCompletenessFlags,
): Array<keyof DocumentationCompletenessFlags> {
  return (
    Object.keys(flags) as Array<keyof DocumentationCompletenessFlags>
  ).filter((key) => flags[key]);
}
