import { z } from "zod";
import type { BillingClassification } from "./billingClassification.js";
import { billingClassificationSchema } from "./billingClassification.js";
import type { EncounterBillingExportReadinessResult } from "./billingExportReadiness.js";
import type { ProfessionalFacilityBillingLedgerResult } from "./billingLedgerReadiness.js";
import type { FacilityFeeOperationalReadinessResult } from "./facilityFeeOperationalReadiness.js";
import type { FacilityBillingClassificationMode } from "./facilityBillingWorkflow.js";

/** Phase 19UCED.6 — charge capture / revenue review workspace (preview only). */
export const chargeReviewStatusSchema = z.enum([
  "READY_FOR_BILLING_REVIEW",
  "NEEDS_CODER_REVIEW",
  "NEEDS_PROVIDER_CLARIFICATION",
  "NEEDS_FACILITY_REVIEW",
  "MISSING_REQUIRED_DATA",
  "HOLD_FOR_PENDING_RESULTS",
  "HOLD_FOR_OPEN_ENCOUNTER",
  "NOT_BILLABLE_REVIEW",
  "COMPLETED_REVIEW",
]);
export type ChargeReviewStatus = z.infer<typeof chargeReviewStatusSchema>;

export const chargeReviewDomainSchema = z.enum([
  "PROFESSIONAL",
  "FACILITY",
  "OBSERVATION",
  "INPATIENT",
  "PROCEDURE",
  "TELEHEALTH",
  "GENERAL",
]);
export type ChargeReviewDomain = z.infer<typeof chargeReviewDomainSchema>;

export const chargeReviewReasonSchema = z.enum([
  "MISSING_PRIMARY_DIAGNOSIS",
  "MISSING_PROVIDER_ATTRIBUTION",
  "MISSING_FACILITY_BILLING_IDENTITY",
  "MISSING_PAYER",
  "OPEN_ENCOUNTER",
  "PENDING_RESULTS",
  "UNKNOWN_BILLING_SIDE",
  "OBSERVATION_EXTENDED_REVIEW",
  "BOARDING_REVIEW",
  "INPATIENT_REVIEW",
  "PROCEDURE_CODE_REVIEW",
  "FACILITY_REVENUE_REVIEW",
  "MANUAL_REVIEW_REQUIRED",
  "DOCUMENTATION_INTEGRITY_REVIEW",
  "BILLING_CLASSIFICATION_REVIEW",
]);
export type ChargeReviewReason = z.infer<typeof chargeReviewReasonSchema>;

export const FORBIDDEN_CHARGE_REVIEW_KEYS = [
  "patientName",
  "diagnosisText",
  "diagnosisDescription",
  "payerName",
  "memberId",
  "policyNumber",
  "providerName",
  "clinicalNote",
  "chiefComplaint",
  "hpi",
  "assessment",
  "plan",
  "reimbursementAmount",
  "claimPayload",
  "cptAutoCode",
] as const;

export type ChargeCaptureReviewInput = {
  billingClassification: BillingClassification;
  encounterStatus?: string | null;
  exportReadiness: Pick<
    EncounterBillingExportReadinessResult,
    "route" | "formReadiness" | "requiresManualReview" | "missingItems" | "warnings"
  >;
  ledgerReadiness: Pick<
    ProfessionalFacilityBillingLedgerResult,
    "overallStatus" | "professional" | "facility" | "requiresManualReview"
  >;
  facilityFeeReadiness: Pick<
    FacilityFeeOperationalReadinessResult,
    "readinessStatus" | "operationalFlags" | "requiresManualReview" | "warnings" | "reasons"
  >;
  hasPrimaryDiagnosis: boolean;
  hasProviderAttribution: boolean;
  hasPayer: boolean;
  hasPendingResults?: boolean;
  hasUnknownBillingSideEvents?: boolean;
  hasProcedureCodes?: boolean;
  encounterAgeMinutes?: number;
  facilityBillingWorkflowMode?: FacilityBillingClassificationMode | null;
  /** When billing finalization is complete — operational review done (read-only signal). */
  billingReviewCompleted?: boolean;
  /** When false, open encounters may still appear in queue with hold status. */
  allowOpenEncounterReview?: boolean;
};

export type ChargeCaptureReviewResult = {
  status: ChargeReviewStatus;
  domains: ChargeReviewDomain[];
  reasons: ChargeReviewReason[];
  warnings: ChargeReviewReason[];
  requiresCoderReview: boolean;
  requiresProviderClarification: boolean;
  requiresFacilityReview: boolean;
  hold: boolean;
  readyForReview: boolean;
  previewOnly: true;
};

function domainsForClassification(classification: BillingClassification): ChargeReviewDomain[] {
  switch (classification) {
    case "CLINIC_VISIT":
    case "URGENT_CARE":
      return ["PROFESSIONAL", "GENERAL"];
    case "EMERGENCY_DEPARTMENT":
      return ["PROFESSIONAL", "FACILITY", "GENERAL"];
    case "OBSERVATION":
      return ["OBSERVATION", "FACILITY", "GENERAL"];
    case "INPATIENT":
      return ["INPATIENT", "FACILITY", "GENERAL"];
    case "PROCEDURE":
      return ["PROCEDURE", "PROFESSIONAL", "GENERAL"];
    case "TELEHEALTH":
      return ["TELEHEALTH", "PROFESSIONAL", "GENERAL"];
    default:
      return ["GENERAL"];
  }
}

function uniqueReasons(items: ChargeReviewReason[]): ChargeReviewReason[] {
  return [...new Set(items)];
}

function isOpenEncounter(status: string | null | undefined): boolean {
  return Boolean(status && status !== "CLOSED");
}

/**
 * Composes 19UCED.3–5 readiness layers into a single charge-review operational status.
 * PHI-safe — no names, diagnosis text, payer details, or claim payloads.
 */
export function resolveChargeCaptureReview(input: ChargeCaptureReviewInput): ChargeCaptureReviewResult {
  const classification = billingClassificationSchema.parse(input.billingClassification);
  const domains = domainsForClassification(classification);
  const reasons: ChargeReviewReason[] = [];
  const warnings: ChargeReviewReason[] = [];

  const openEncounter = isOpenEncounter(input.encounterStatus);
  const allowOpenReview = input.allowOpenEncounterReview === true;

  if (input.exportReadiness.route === "NO_CLAIM_EXPORT") {
    return {
      status: "NOT_BILLABLE_REVIEW",
      domains,
      reasons: uniqueReasons(["BILLING_CLASSIFICATION_REVIEW", ...reasons]),
      warnings: uniqueReasons(warnings),
      requiresCoderReview: false,
      requiresProviderClarification: false,
      requiresFacilityReview: false,
      hold: false,
      readyForReview: false,
      previewOnly: true,
    };
  }

  if (!input.hasPrimaryDiagnosis) {
    reasons.push("MISSING_PRIMARY_DIAGNOSIS");
  }
  if (!input.hasPayer) {
    reasons.push("MISSING_PAYER");
  }
  if (!input.hasProviderAttribution) {
    reasons.push("MISSING_PROVIDER_ATTRIBUTION");
  }
  if (
    input.exportReadiness.missingItems.includes("MISSING_FACILITY_BILLING_IDENTITY") ||
    input.ledgerReadiness.facility.reasons.includes("FACILITY_BILLING_IDENTITY_REQUIRED") ||
    input.facilityFeeReadiness.reasons.includes("FACILITY_IDENTITY_REQUIRED")
  ) {
    reasons.push("MISSING_FACILITY_BILLING_IDENTITY");
  }
  if (input.hasUnknownBillingSideEvents) {
    reasons.push("UNKNOWN_BILLING_SIDE");
  }
  if (classification === "PROCEDURE" || input.exportReadiness.route === "REVIEW_REQUIRED") {
    reasons.push("PROCEDURE_CODE_REVIEW");
  }
  if (input.facilityFeeReadiness.operationalFlags.extendedObservation) {
    reasons.push("OBSERVATION_EXTENDED_REVIEW");
  }
  if (input.facilityFeeReadiness.operationalFlags.boardingReview) {
    reasons.push("BOARDING_REVIEW");
  }
  if (input.facilityFeeReadiness.operationalFlags.inpatientReview) {
    reasons.push("INPATIENT_REVIEW");
  }
  if (
    input.facilityFeeReadiness.readinessStatus === "REVIEW_REQUIRED" &&
    (classification === "EMERGENCY_DEPARTMENT" ||
      classification === "OBSERVATION" ||
      classification === "INPATIENT")
  ) {
    reasons.push("FACILITY_REVENUE_REVIEW");
  }
  if (
    input.exportReadiness.requiresManualReview ||
    input.ledgerReadiness.requiresManualReview ||
    input.facilityFeeReadiness.requiresManualReview
  ) {
    reasons.push("MANUAL_REVIEW_REQUIRED");
  }
  if (input.exportReadiness.route === "REVIEW_REQUIRED") {
    reasons.push("BILLING_CLASSIFICATION_REVIEW");
  }

  if (openEncounter && !allowOpenReview) {
    reasons.push("OPEN_ENCOUNTER");
    warnings.push("OPEN_ENCOUNTER");
  }
  if (input.hasPendingResults) {
    warnings.push("PENDING_RESULTS");
  }

  const requiresCoderReview =
    Boolean(input.hasUnknownBillingSideEvents) ||
    classification === "PROCEDURE" ||
    input.exportReadiness.route === "REVIEW_REQUIRED" ||
    input.ledgerReadiness.professional.reasons.includes("PROFESSIONAL_PROCEDURE_REVIEW");

  const requiresProviderClarification =
    !input.hasProviderAttribution ||
    input.ledgerReadiness.professional.reasons.includes("PROFESSIONAL_PROVIDER_REQUIRED");

  const requiresFacilityReview =
    reasons.includes("MISSING_FACILITY_BILLING_IDENTITY") ||
    reasons.includes("OBSERVATION_EXTENDED_REVIEW") ||
    reasons.includes("BOARDING_REVIEW") ||
    reasons.includes("INPATIENT_REVIEW") ||
    reasons.includes("FACILITY_REVENUE_REVIEW") ||
    input.ledgerReadiness.facility.status === "REVIEW_REQUIRED" ||
    input.facilityFeeReadiness.readinessStatus === "REVIEW_REQUIRED";

  const hold =
    (openEncounter && !allowOpenReview) || Boolean(input.hasPendingResults);

  let status: ChargeReviewStatus;

  if (input.billingReviewCompleted && !hold && reasons.length === 0) {
    status = "COMPLETED_REVIEW";
  } else if (openEncounter && !allowOpenReview) {
    status = "HOLD_FOR_OPEN_ENCOUNTER";
  } else if (!input.hasPrimaryDiagnosis || !input.hasPayer) {
    status = "MISSING_REQUIRED_DATA";
  } else if (requiresCoderReview) {
    status = "NEEDS_CODER_REVIEW";
  } else if (requiresProviderClarification) {
    status = "NEEDS_PROVIDER_CLARIFICATION";
  } else if (requiresFacilityReview) {
    status = "NEEDS_FACILITY_REVIEW";
  } else if (input.hasPendingResults) {
    status = "HOLD_FOR_PENDING_RESULTS";
  } else if (
    input.exportReadiness.route !== "REVIEW_REQUIRED" &&
    input.ledgerReadiness.overallStatus !== "BLOCKED"
  ) {
    status = "READY_FOR_BILLING_REVIEW";
  } else {
    status = "NEEDS_CODER_REVIEW";
  }

  const readyForReview = status === "READY_FOR_BILLING_REVIEW" || status === "COMPLETED_REVIEW";

  return {
    status,
    domains,
    reasons: uniqueReasons(reasons),
    warnings: uniqueReasons(warnings),
    requiresCoderReview,
    requiresProviderClarification,
    requiresFacilityReview,
    hold,
    readyForReview,
    previewOnly: true,
  };
}
