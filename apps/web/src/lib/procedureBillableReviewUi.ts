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

export function procedureBillableReviewReadinessLabelKey(status: string): string {
  return `chargeCaptureReview.procedureReadiness.${status}`;
}

export function procedureBillableReviewMappingLabelKey(status: string): string {
  return `chargeCaptureReview.procedureMapping.${status}`;
}
