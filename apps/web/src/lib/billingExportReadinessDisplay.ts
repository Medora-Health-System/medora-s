import type {
  BillingRouteReason,
  ClaimExportRoute,
  ClaimFormReadiness,
} from "@medora/shared";

export function billingExportRouteLabelKey(route: ClaimExportRoute): string {
  return `billingExportReadiness.route.${route}`;
}

export function billingExportFormReadinessLabelKey(formReadiness: ClaimFormReadiness): string {
  return `billingExportReadiness.formReadiness.${formReadiness}`;
}

export function billingExportReasonLabelKey(reason: BillingRouteReason): string {
  return `billingExportReadiness.reason.${reason}`;
}

export function billingExportReadinessCardBackground(requiresManualReview: boolean): string {
  return requiresManualReview ? "#fffbeb" : "#f0fdf4";
}

/** Provider-facing one-line summary — minimal clinical distraction. */
export function billingExportReadinessProviderSummaryKey(args: {
  requiresManualReview: boolean;
  route: ClaimExportRoute;
}): string {
  if (args.requiresManualReview) {
    return "billingExportReadiness.providerSummary.reviewRequired";
  }
  if (args.route === "BOTH_PROFESSIONAL_AND_FACILITY") {
    return "billingExportReadiness.providerSummary.bothPreview";
  }
  return "billingExportReadiness.providerSummary.readyPreview";
}
