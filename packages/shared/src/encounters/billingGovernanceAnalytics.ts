import { z } from "zod";
import type { BillingClassification } from "./billingClassification.js";
import type { ClaimExportRoute } from "./billingExportReadiness.js";
import type { BillingLedgerReadinessStatus } from "./billingLedgerReadiness.js";
import type { FacilityFeeReadinessStatus } from "./facilityFeeOperationalReadiness.js";
import type { ChargeReviewStatus } from "./chargeCaptureReview.js";
import type { CodingIntegrityStatus } from "./codingIntegrityReview.js";
import type { ClaimAssemblyPreviewStatus } from "./claimAssemblyPreview.js";

/** Phase 19UCED.9 — billing governance analytics (aggregate only, no PHI). */
export const billingGovernanceMetricDomainSchema = z.enum([
  "CLASSIFICATION",
  "UC_ED_CONVERSION",
  "EXPORT_READINESS",
  "LEDGER_READINESS",
  "FACILITY_FEE",
  "CHARGE_REVIEW",
  "CODING_REVIEW",
  "CLAIM_ASSEMBLY",
  "OBSERVATION_REVIEW",
  "FACILITY_CONFIGURATION",
]);
export type BillingGovernanceMetricDomain = z.infer<typeof billingGovernanceMetricDomainSchema>;

export const billingGovernanceSeveritySchema = z.enum(["OK", "WATCH", "REVIEW_REQUIRED", "BLOCKED"]);
export type BillingGovernanceSeverity = z.infer<typeof billingGovernanceSeveritySchema>;

export const billingGovernanceReasonSchema = z.enum([
  "HIGH_REVIEW_VOLUME",
  "MISSING_FACILITY_IDENTITY",
  "MANY_OPEN_ENCOUNTERS",
  "MANY_PENDING_RESULTS",
  "MANY_CODING_REVIEWS",
  "MANY_CHARGE_REVIEWS",
  "OBSERVATION_REVIEW_VOLUME",
  "UC_ED_CONVERSION_VOLUME",
  "CONFIGURATION_INCOMPLETE",
  "MANUAL_REVIEW_REQUIRED",
]);
export type BillingGovernanceReason = z.infer<typeof billingGovernanceReasonSchema>;

export const FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS = [
  "patientName",
  "diagnosisText",
  "diagnosisDescription",
  "payerName",
  "memberId",
  "policyNumber",
  "providerName",
  "clinicalNote",
  "hpi",
  "ros",
  "mdmText",
  "assessment",
  "plan",
  "reimbursementAmount",
  "claimPayload",
  "x12Payload",
] as const;

export type BillingGovernanceCountBucket = {
  key: string;
  count: number;
};

export type BillingGovernanceConversionSummary = {
  ucToEdCount: number;
  edToUcCount: number;
  acknowledgmentCapturedCount: number;
  missingAcknowledgmentCount: number;
  byFacility: Array<{
    facilityId: string;
    ucToEdCount: number;
    edToUcCount: number;
  }>;
};

export type BillingGovernanceObservationSummary = {
  reviewRequiredCount: number;
  extendedObservationCount: number;
  activeObservationCount: number;
  holdForPendingResultsCount: number;
};

export type BillingGovernanceClaimAssemblySummary = {
  readyForExportReviewCount: number;
  notReadyCount: number;
  manualReviewRequiredCount: number;
  professionalReadyCount: number;
  facilityReadyCount: number;
};

export type BillingGovernanceFacilityConfigurationSummary = {
  missingClassificationModeCount: number;
  hybridControlsDisabledCount: number;
  missingBillingIdentityCount: number;
  hospitalEnterpriseIncompleteCount: number;
};

export type BillingGovernanceWarning = {
  domain: BillingGovernanceMetricDomain;
  severity: BillingGovernanceSeverity;
  reason: BillingGovernanceReason;
  count?: number;
};

export type BillingGovernanceAnalyticsInput = {
  totals: {
    encountersReviewed: number;
    openEncounters: number;
    closedEncounters: number;
    readinessSampleSize: number;
  };
  byClassification: Partial<Record<BillingClassification, number>>;
  byFacility: Array<{ facilityId: string; encounterCount: number }>;
  byExportReadinessRoute: Partial<Record<ClaimExportRoute, number>>;
  byLedgerProfessionalStatus: Partial<Record<BillingLedgerReadinessStatus, number>>;
  byLedgerFacilityStatus: Partial<Record<BillingLedgerReadinessStatus, number>>;
  byFacilityFeeStatus: Partial<Record<FacilityFeeReadinessStatus, number>>;
  byChargeReviewStatus: Partial<Record<ChargeReviewStatus, number>>;
  byCodingReviewStatus: Partial<Record<CodingIntegrityStatus, number>>;
  byClaimAssemblyStatus: Partial<Record<ClaimAssemblyPreviewStatus, number>>;
  conversionSummary: BillingGovernanceConversionSummary;
  observationSummary: BillingGovernanceObservationSummary;
  claimAssemblySummary: BillingGovernanceClaimAssemblySummary;
  facilityConfiguration: BillingGovernanceFacilityConfigurationSummary;
  manualReviewRequiredCount: number;
  pendingResultsCount: number;
};

export type BillingGovernanceAnalyticsResult = {
  totals: BillingGovernanceAnalyticsInput["totals"];
  byClassification: BillingGovernanceCountBucket[];
  byFacility: BillingGovernanceAnalyticsInput["byFacility"];
  byReadinessStatus: Array<{
    domain: BillingGovernanceMetricDomain;
    status: string;
    count: number;
  }>;
  byReviewDomain: Array<{
    domain: BillingGovernanceMetricDomain;
    count: number;
  }>;
  conversionSummary: BillingGovernanceConversionSummary;
  observationSummary: BillingGovernanceObservationSummary;
  claimAssemblySummary: BillingGovernanceClaimAssemblySummary;
  facilityConfiguration: BillingGovernanceFacilityConfigurationSummary;
  warnings: BillingGovernanceWarning[];
  previewOnly: true;
};

const REVIEW_VOLUME_WATCH = 5;
const REVIEW_VOLUME_REVIEW_REQUIRED = 15;
const OPEN_ENCOUNTER_WATCH_RATIO = 0.2;
const OPEN_ENCOUNTER_REVIEW_RATIO = 0.35;

function countBuckets(map: Partial<Record<string, number>>): BillingGovernanceCountBucket[] {
  return Object.entries(map)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([key, count]) => ({ key, count: count ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

function sumValues(map: Partial<Record<string, number>>): number {
  return Object.values(map).reduce<number>((acc, n) => acc + (n ?? 0), 0);
}

function reviewVolumeSeverity(count: number): BillingGovernanceSeverity {
  if (count >= REVIEW_VOLUME_REVIEW_REQUIRED) return "REVIEW_REQUIRED";
  if (count >= REVIEW_VOLUME_WATCH) return "WATCH";
  return "OK";
}

export function deriveBillingGovernanceWarnings(
  input: BillingGovernanceAnalyticsInput,
): BillingGovernanceWarning[] {
  const warnings: BillingGovernanceWarning[] = [];
  const { totals } = input;

  const codingReviewCount = sumValues(input.byCodingReviewStatus);
  const chargeReviewCount = sumValues(input.byChargeReviewStatus);
  const notReadyCoding =
    (input.byCodingReviewStatus.NEEDS_DOCUMENTATION_COMPLETION ?? 0) +
    (input.byCodingReviewStatus.NEEDS_PROVIDER_CLARIFICATION ?? 0) +
    (input.byCodingReviewStatus.NEEDS_COMPLIANCE_REVIEW ?? 0);
  const notReadyCharge =
    (input.byChargeReviewStatus.NEEDS_CODER_REVIEW ?? 0) +
    (input.byChargeReviewStatus.NEEDS_PROVIDER_CLARIFICATION ?? 0) +
    (input.byChargeReviewStatus.NOT_BILLABLE_REVIEW ?? 0) +
    (input.byChargeReviewStatus.MISSING_REQUIRED_DATA ?? 0);

  const codingSeverity = reviewVolumeSeverity(notReadyCoding);
  if (codingSeverity !== "OK") {
    warnings.push({
      domain: "CODING_REVIEW",
      severity: codingSeverity,
      reason: "MANY_CODING_REVIEWS",
      count: notReadyCoding,
    });
  }

  const chargeSeverity = reviewVolumeSeverity(notReadyCharge);
  if (chargeSeverity !== "OK") {
    warnings.push({
      domain: "CHARGE_REVIEW",
      severity: chargeSeverity,
      reason: "MANY_CHARGE_REVIEWS",
      count: notReadyCharge,
    });
  }

  if (input.observationSummary.reviewRequiredCount >= REVIEW_VOLUME_WATCH) {
    warnings.push({
      domain: "OBSERVATION_REVIEW",
      severity: reviewVolumeSeverity(input.observationSummary.reviewRequiredCount),
      reason: "OBSERVATION_REVIEW_VOLUME",
      count: input.observationSummary.reviewRequiredCount,
    });
  }

  const conversionTotal =
    input.conversionSummary.ucToEdCount + input.conversionSummary.edToUcCount;
  if (conversionTotal >= REVIEW_VOLUME_WATCH) {
    warnings.push({
      domain: "UC_ED_CONVERSION",
      severity: reviewVolumeSeverity(conversionTotal),
      reason: "UC_ED_CONVERSION_VOLUME",
      count: conversionTotal,
    });
  }

  if (totals.encountersReviewed > 0) {
    const openRatio = totals.openEncounters / totals.encountersReviewed;
    if (openRatio >= OPEN_ENCOUNTER_REVIEW_RATIO) {
      warnings.push({
        domain: "CLASSIFICATION",
        severity: "REVIEW_REQUIRED",
        reason: "MANY_OPEN_ENCOUNTERS",
        count: totals.openEncounters,
      });
    } else if (openRatio >= OPEN_ENCOUNTER_WATCH_RATIO) {
      warnings.push({
        domain: "CLASSIFICATION",
        severity: "WATCH",
        reason: "MANY_OPEN_ENCOUNTERS",
        count: totals.openEncounters,
      });
    }
  }

  if (input.pendingResultsCount >= REVIEW_VOLUME_WATCH) {
    warnings.push({
      domain: "CHARGE_REVIEW",
      severity: reviewVolumeSeverity(input.pendingResultsCount),
      reason: "MANY_PENDING_RESULTS",
      count: input.pendingResultsCount,
    });
  }

  if (input.manualReviewRequiredCount >= REVIEW_VOLUME_WATCH) {
    warnings.push({
      domain: "CLAIM_ASSEMBLY",
      severity: reviewVolumeSeverity(input.manualReviewRequiredCount),
      reason: "MANUAL_REVIEW_REQUIRED",
      count: input.manualReviewRequiredCount,
    });
  }

  const fc = input.facilityConfiguration;
  if (fc.missingBillingIdentityCount > 0) {
    warnings.push({
      domain: "FACILITY_CONFIGURATION",
      severity: "BLOCKED",
      reason: "MISSING_FACILITY_IDENTITY",
      count: fc.missingBillingIdentityCount,
    });
  }
  if (
    fc.missingClassificationModeCount > 0 ||
    fc.hybridControlsDisabledCount > 0 ||
    fc.hospitalEnterpriseIncompleteCount > 0
  ) {
    warnings.push({
      domain: "FACILITY_CONFIGURATION",
      severity: "REVIEW_REQUIRED",
      reason: "CONFIGURATION_INCOMPLETE",
      count:
        fc.missingClassificationModeCount +
        fc.hybridControlsDisabledCount +
        fc.hospitalEnterpriseIncompleteCount,
    });
  }

  const highReviewTotal = notReadyCoding + notReadyCharge;
  if (highReviewTotal >= REVIEW_VOLUME_REVIEW_REQUIRED && codingReviewCount + chargeReviewCount > 0) {
    warnings.push({
      domain: "EXPORT_READINESS",
      severity: "REVIEW_REQUIRED",
      reason: "HIGH_REVIEW_VOLUME",
      count: highReviewTotal,
    });
  }

  return warnings;
}

export function buildBillingGovernanceAnalytics(
  input: BillingGovernanceAnalyticsInput,
): BillingGovernanceAnalyticsResult {
  const byReadinessStatus: BillingGovernanceAnalyticsResult["byReadinessStatus"] = [];

  for (const [status, count] of Object.entries(input.byExportReadinessRoute)) {
    if ((count ?? 0) > 0) {
      byReadinessStatus.push({ domain: "EXPORT_READINESS", status, count: count ?? 0 });
    }
  }
  for (const [status, count] of Object.entries(input.byLedgerProfessionalStatus)) {
    if ((count ?? 0) > 0) {
      byReadinessStatus.push({ domain: "LEDGER_READINESS", status: `PROFESSIONAL_${status}`, count: count ?? 0 });
    }
  }
  for (const [status, count] of Object.entries(input.byLedgerFacilityStatus)) {
    if ((count ?? 0) > 0) {
      byReadinessStatus.push({ domain: "LEDGER_READINESS", status: `FACILITY_${status}`, count: count ?? 0 });
    }
  }
  for (const [status, count] of Object.entries(input.byFacilityFeeStatus)) {
    if ((count ?? 0) > 0) {
      byReadinessStatus.push({ domain: "FACILITY_FEE", status, count: count ?? 0 });
    }
  }
  for (const [status, count] of Object.entries(input.byChargeReviewStatus)) {
    if ((count ?? 0) > 0) {
      byReadinessStatus.push({ domain: "CHARGE_REVIEW", status, count: count ?? 0 });
    }
  }
  for (const [status, count] of Object.entries(input.byCodingReviewStatus)) {
    if ((count ?? 0) > 0) {
      byReadinessStatus.push({ domain: "CODING_REVIEW", status, count: count ?? 0 });
    }
  }
  for (const [status, count] of Object.entries(input.byClaimAssemblyStatus)) {
    if ((count ?? 0) > 0) {
      byReadinessStatus.push({ domain: "CLAIM_ASSEMBLY", status, count: count ?? 0 });
    }
  }

  const byReviewDomain: BillingGovernanceAnalyticsResult["byReviewDomain"] = [
    { domain: "CHARGE_REVIEW" as const, count: sumValues(input.byChargeReviewStatus) },
    { domain: "CODING_REVIEW" as const, count: sumValues(input.byCodingReviewStatus) },
    { domain: "CLAIM_ASSEMBLY" as const, count: sumValues(input.byClaimAssemblyStatus) },
    { domain: "FACILITY_FEE" as const, count: sumValues(input.byFacilityFeeStatus) },
    { domain: "EXPORT_READINESS" as const, count: sumValues(input.byExportReadinessRoute) },
  ].filter((row) => row.count > 0);

  const byClassification = countBuckets(input.byClassification);

  return {
    totals: input.totals,
    byClassification,
    byFacility: input.byFacility,
    byReadinessStatus,
    byReviewDomain,
    conversionSummary: input.conversionSummary,
    observationSummary: input.observationSummary,
    claimAssemblySummary: input.claimAssemblySummary,
    facilityConfiguration: input.facilityConfiguration,
    warnings: deriveBillingGovernanceWarnings(input),
    previewOnly: true,
  };
}

export function incrementGovernanceCount<T extends string>(
  map: Partial<Record<T, number>>,
  key: T,
): void {
  map[key] = (map[key] ?? 0) + 1;
}
