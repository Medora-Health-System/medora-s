import type { BillingClassification, ChargeReviewDomain, ChargeReviewReason, ChargeReviewStatus } from "@medora/shared";

export function chargeReviewStatusLabelKey(status: ChargeReviewStatus): string {
  return `chargeCaptureReview.status.${status}`;
}

export function chargeReviewDomainLabelKey(domain: ChargeReviewDomain): string {
  return `chargeCaptureReview.domain.${domain}`;
}

export function chargeReviewReasonLabelKey(reason: ChargeReviewReason): string {
  return `chargeCaptureReview.reason.${reason}`;
}

export function chargeReviewNextActionLabelKey(status: ChargeReviewStatus): string {
  return `chargeCaptureReview.nextAction.${status}`;
}

export function chargeReviewStatusCardBackground(status: ChargeReviewStatus): string {
  switch (status) {
    case "READY_FOR_BILLING_REVIEW":
    case "COMPLETED_REVIEW":
      return "#ecfdf5";
    case "HOLD_FOR_OPEN_ENCOUNTER":
    case "HOLD_FOR_PENDING_RESULTS":
      return "#fffbeb";
    case "NOT_BILLABLE_REVIEW":
      return "#f8fafc";
    default:
      return "#fff7ed";
  }
}

export function chargeReviewClassificationFilterOptions(): BillingClassification[] {
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

export function chargeReviewStatusFilterOptions(): ChargeReviewStatus[] {
  return [
    "READY_FOR_BILLING_REVIEW",
    "NEEDS_CODER_REVIEW",
    "NEEDS_PROVIDER_CLARIFICATION",
    "NEEDS_FACILITY_REVIEW",
    "MISSING_REQUIRED_DATA",
    "HOLD_FOR_PENDING_RESULTS",
    "HOLD_FOR_OPEN_ENCOUNTER",
    "NOT_BILLABLE_REVIEW",
    "COMPLETED_REVIEW",
  ];
}

export function chargeReviewDomainFilterOptions(): ChargeReviewDomain[] {
  return ["PROFESSIONAL", "FACILITY", "OBSERVATION", "INPATIENT", "PROCEDURE", "TELEHEALTH", "GENERAL"];
}
