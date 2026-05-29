import type { ResolveProcedureBillingReadinessOutput } from "@medora/shared";

export function procedureBillingReadinessIndicatorKey(
  readiness: Pick<
    ResolveProcedureBillingReadinessOutput,
    "readinessStatus" | "reasons" | "requiresDocumentationReview" | "requiresFacilityChargeMaster"
  >
): string | null {
  if (readiness.readinessStatus === "NOT_APPLICABLE") return null;
  if (readiness.requiresDocumentationReview) {
    return "procedureBillingReadiness.documentationRequired";
  }
  if (readiness.requiresFacilityChargeMaster) {
    return "procedureBillingReadiness.chargeMasterNeeded";
  }
  if (readiness.readinessStatus === "READY") {
    return "procedureBillingReadiness.readyForReview";
  }
  if (
    readiness.reasons.includes("CODER_REVIEW_REQUIRED") ||
    readiness.reasons.includes("INSTITUTION_POLICY_REQUIRED") ||
    readiness.readinessStatus === "REVIEW_REQUIRED"
  ) {
    return "procedureBillingReadiness.billingReviewNeeded";
  }
  return "procedureBillingReadiness.billingReviewNeeded";
}
