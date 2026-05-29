import type { ProcedureRevenueReviewReasonCode } from "@medora/shared";

export function procedureBillableReviewWarningLabelKey(warning: string): string | null {
  switch (warning) {
    case "DOCUMENTATION_REVIEW":
      return "chargeCaptureReview.procedureWarningDocumentation";
    case "CODER_REVIEW":
      return "chargeCaptureReview.procedureWarningCoderReview";
    case "FACILITY_CHARGE_MASTER":
      return "chargeCaptureReview.procedureWarningChargeMaster";
    case "DEFAULT_CODE_CANDIDATES_REQUIRE_REVIEW":
      return "chargeCaptureReview.procedureWarningCodeCandidates";
    case "PROCEDURE_NOT_COMPLETED":
      return "chargeCaptureReview.procedureWarningNotCompleted";
    default:
      return null;
  }
}

export function procedureRevenueReviewReasonLabelKey(
  code: ProcedureRevenueReviewReasonCode
): string {
  return `procedureRevenueReview.reason.${code}`;
}

export function procedureRevenueReviewStatusLabelKey(status: string): string {
  return `procedureRevenueReview.status.${status}`;
}

export function procedureRevenueReviewSideLabelKey(side: string): string {
  return `procedureRevenueReview.side.${side}`;
}
