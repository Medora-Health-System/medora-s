import { z } from "zod";
import type { BillingClassification } from "./billingClassification.js";
import { billingClassificationSchema } from "./billingClassification.js";
import type { ChargeCaptureReviewResult } from "./chargeCaptureReview.js";
import type { EncounterBillingExportReadinessResult } from "./billingExportReadiness.js";
import type { ProfessionalFacilityBillingLedgerResult } from "./billingLedgerReadiness.js";
import type { FacilityFeeOperationalReadinessResult, ObservationOperationalStatus } from "./facilityFeeOperationalReadiness.js";
import {
  ED_OBSERVATION_CANDIDATE_MINUTES,
} from "./facilityFeeOperationalReadiness.js";
import type { FacilityBillingClassificationMode } from "./facilityBillingWorkflow.js";
import {
  dispositionDocumentationApplies,
  professionalDocumentationApplies,
} from "./documentationCompletenessFlags.js";

/** Phase 19UCED.7 — coding integrity / documentation review (preview only). */
export const codingIntegrityStatusSchema = z.enum([
  "READY_FOR_CODING_REVIEW",
  "NEEDS_PROVIDER_CLARIFICATION",
  "NEEDS_DOCUMENTATION_COMPLETION",
  "NEEDS_OBSERVATION_REVIEW",
  "NEEDS_FACILITY_REVIEW",
  "NEEDS_COMPLIANCE_REVIEW",
  "HOLD_FOR_OPEN_ENCOUNTER",
  "HOLD_FOR_PENDING_RESULTS",
  "COMPLETED_REVIEW",
]);
export type CodingIntegrityStatus = z.infer<typeof codingIntegrityStatusSchema>;

export const codingIntegrityDomainSchema = z.enum([
  "PROFESSIONAL_DOCUMENTATION",
  "FACILITY_DOCUMENTATION",
  "OBSERVATION_DOCUMENTATION",
  "DISPOSITION_DOCUMENTATION",
  "PROCEDURE_DOCUMENTATION",
  "TELEHEALTH_DOCUMENTATION",
  "COMPLIANCE",
  "GENERAL",
]);
export type CodingIntegrityDomain = z.infer<typeof codingIntegrityDomainSchema>;

export const codingIntegrityReasonSchema = z.enum([
  "MISSING_PRIMARY_DIAGNOSIS",
  "MISSING_PROVIDER_ATTRIBUTION",
  "MISSING_MDM",
  "MISSING_DISPOSITION_DOCUMENTATION",
  "MISSING_REASSESSMENT",
  "OBSERVATION_DOCUMENTATION_REVIEW",
  "INPATIENT_DOCUMENTATION_REVIEW",
  "PROCEDURE_DOCUMENTATION_REVIEW",
  "PENDING_RESULTS_REVIEW",
  "OPEN_ENCOUNTER_REVIEW",
  "FACILITY_DOCUMENTATION_REVIEW",
  "MANUAL_COMPLIANCE_REVIEW",
  "DOCUMENTATION_INTEGRITY_REVIEW",
  "BILLING_CLASSIFICATION_REVIEW",
  "MANUAL_PROVIDER_CLARIFICATION",
]);
export type CodingIntegrityReason = z.infer<typeof codingIntegrityReasonSchema>;

export const FORBIDDEN_CODING_REVIEW_KEYS = [
  "patientName",
  "diagnosisText",
  "diagnosisDescription",
  "providerName",
  "payerName",
  "clinicalNote",
  "HPI",
  "ROS",
  "MDMText",
  "assessment",
  "plan",
  "reimbursementAmount",
  "claimPayload",
  "autoCodedCPT",
  "autoCodedICD",
] as const;

export type CodingIntegrityReviewInput = {
  billingClassification: BillingClassification;
  encounterStatus?: string | null;
  exportReadiness: Pick<
    EncounterBillingExportReadinessResult,
    "route" | "requiresManualReview" | "missingItems"
  >;
  ledgerReadiness: Pick<
    ProfessionalFacilityBillingLedgerResult,
    "overallStatus" | "requiresManualReview" | "facility"
  >;
  facilityFeeReadiness: Pick<
    FacilityFeeOperationalReadinessResult,
    "readinessStatus" | "requiresManualReview" | "operationalFlags" | "observationOperationalStatus"
  >;
  chargeReview: Pick<
    ChargeCaptureReviewResult,
    "status" | "requiresCoderReview" | "requiresProviderClarification" | "requiresFacilityReview"
  >;
  hasPrimaryDiagnosis: boolean;
  hasProviderAttribution: boolean;
  hasMDM?: boolean;
  hasDispositionDocumentation?: boolean;
  hasReassessment?: boolean;
  hasPendingResults?: boolean;
  observationStatus?: ObservationOperationalStatus | null;
  encounterAgeMinutes?: number;
  facilityBillingWorkflowMode?: FacilityBillingClassificationMode | null;
  codingReviewCompleted?: boolean;
};

export type CodingIntegrityReviewResult = {
  status: CodingIntegrityStatus;
  domains: CodingIntegrityDomain[];
  reasons: CodingIntegrityReason[];
  warnings: CodingIntegrityReason[];
  requiresProviderClarification: boolean;
  requiresFacilityReview: boolean;
  requiresComplianceReview: boolean;
  requiresObservationReview: boolean;
  readyForCodingReview: boolean;
  hold: boolean;
  previewOnly: true;
};

function uniqueReasons(items: CodingIntegrityReason[]): CodingIntegrityReason[] {
  return [...new Set(items)];
}

function domainsForClassification(classification: BillingClassification): CodingIntegrityDomain[] {
  switch (classification) {
    case "CLINIC_VISIT":
    case "URGENT_CARE":
      return ["PROFESSIONAL_DOCUMENTATION", "DISPOSITION_DOCUMENTATION", "GENERAL"];
    case "EMERGENCY_DEPARTMENT":
      return [
        "PROFESSIONAL_DOCUMENTATION",
        "FACILITY_DOCUMENTATION",
        "DISPOSITION_DOCUMENTATION",
        "GENERAL",
      ];
    case "OBSERVATION":
      return [
        "OBSERVATION_DOCUMENTATION",
        "FACILITY_DOCUMENTATION",
        "DISPOSITION_DOCUMENTATION",
        "GENERAL",
      ];
    case "INPATIENT":
      return ["FACILITY_DOCUMENTATION", "DISPOSITION_DOCUMENTATION", "GENERAL"];
    case "PROCEDURE":
      return ["PROCEDURE_DOCUMENTATION", "PROFESSIONAL_DOCUMENTATION", "GENERAL"];
    case "TELEHEALTH":
      return ["TELEHEALTH_DOCUMENTATION", "PROFESSIONAL_DOCUMENTATION", "GENERAL"];
    default:
      return ["GENERAL"];
  }
}

function isOpenEncounter(status: string | null | undefined): boolean {
  return Boolean(status && status !== "CLOSED");
}

function longStayReassessmentExpected(
  classification: BillingClassification,
  encounterAgeMinutes: number | undefined,
): boolean {
  if (typeof encounterAgeMinutes !== "number") return false;
  if (classification === "EMERGENCY_DEPARTMENT") {
    return encounterAgeMinutes >= ED_OBSERVATION_CANDIDATE_MINUTES;
  }
  if (classification === "OBSERVATION") {
    return encounterAgeMinutes >= ED_OBSERVATION_CANDIDATE_MINUTES;
  }
  return false;
}

/**
 * Composes 19UCED.3–6 readiness with documentation completeness metadata.
 * Review-only — no auto-coding, no claim generation, no clinical mutation.
 */
export function resolveCodingIntegrityReview(input: CodingIntegrityReviewInput): CodingIntegrityReviewResult {
  const classification = billingClassificationSchema.parse(input.billingClassification);
  const domains = domainsForClassification(classification);
  const reasons: CodingIntegrityReason[] = [];
  const warnings: CodingIntegrityReason[] = [];

  const openEncounter = isOpenEncounter(input.encounterStatus);
  const hasMDM = input.hasMDM === true;
  const hasDispositionDocumentation = input.hasDispositionDocumentation === true;
  const hasReassessment = input.hasReassessment === true;

  if (!input.hasPrimaryDiagnosis) {
    reasons.push("MISSING_PRIMARY_DIAGNOSIS");
  }
  if (!input.hasProviderAttribution) {
    reasons.push("MISSING_PROVIDER_ATTRIBUTION");
  }
  if (professionalDocumentationApplies(classification) && !hasMDM) {
    reasons.push("MISSING_MDM");
  }
  if (
    dispositionDocumentationApplies(classification) &&
    !openEncounter &&
    !hasDispositionDocumentation
  ) {
    reasons.push("MISSING_DISPOSITION_DOCUMENTATION");
  }
  if (
    longStayReassessmentExpected(classification, input.encounterAgeMinutes) &&
    !hasReassessment
  ) {
    reasons.push("MISSING_REASSESSMENT");
  }

  const observationStatus =
    input.observationStatus ?? input.facilityFeeReadiness.observationOperationalStatus;
  if (
    classification === "OBSERVATION" ||
    observationStatus === "EXTENDED_OBSERVATION_REVIEW" ||
    observationStatus === "ACTIVE_OBSERVATION" ||
    input.facilityFeeReadiness.operationalFlags.extendedObservation
  ) {
    if (
      classification === "OBSERVATION" ||
      input.facilityFeeReadiness.operationalFlags.extendedObservation ||
      observationStatus === "EXTENDED_OBSERVATION_REVIEW"
    ) {
      reasons.push("OBSERVATION_DOCUMENTATION_REVIEW");
    }
  }

  if (classification === "INPATIENT" || input.facilityFeeReadiness.operationalFlags.inpatientReview) {
    reasons.push("INPATIENT_DOCUMENTATION_REVIEW");
  }
  if (classification === "PROCEDURE" || input.exportReadiness.route === "REVIEW_REQUIRED") {
    reasons.push("PROCEDURE_DOCUMENTATION_REVIEW");
  }
  if (input.facilityFeeReadiness.readinessStatus === "REVIEW_REQUIRED") {
    reasons.push("FACILITY_DOCUMENTATION_REVIEW");
  }
  if (
    input.exportReadiness.requiresManualReview ||
    input.ledgerReadiness.requiresManualReview ||
    input.facilityFeeReadiness.requiresManualReview ||
    input.chargeReview.requiresCoderReview
  ) {
    reasons.push("MANUAL_COMPLIANCE_REVIEW");
  }
  if (input.chargeReview.requiresProviderClarification) {
    reasons.push("MANUAL_PROVIDER_CLARIFICATION");
  }
  if (input.exportReadiness.route === "REVIEW_REQUIRED") {
    reasons.push("BILLING_CLASSIFICATION_REVIEW");
  }
  if (reasons.includes("MISSING_MDM") || reasons.includes("MISSING_REASSESSMENT")) {
    reasons.push("DOCUMENTATION_INTEGRITY_REVIEW");
  }

  if (openEncounter) {
    reasons.push("OPEN_ENCOUNTER_REVIEW");
    warnings.push("OPEN_ENCOUNTER_REVIEW");
  }
  if (input.hasPendingResults) {
    warnings.push("PENDING_RESULTS_REVIEW");
  }

  const requiresProviderClarification =
    !input.hasProviderAttribution ||
    !hasMDM ||
    reasons.includes("MISSING_REASSESSMENT") ||
    input.chargeReview.requiresProviderClarification ||
    reasons.includes("MANUAL_PROVIDER_CLARIFICATION");

  const requiresFacilityReview =
    input.chargeReview.requiresFacilityReview ||
    reasons.includes("FACILITY_DOCUMENTATION_REVIEW") ||
    reasons.includes("INPATIENT_DOCUMENTATION_REVIEW") ||
    input.ledgerReadiness.facility.status === "REVIEW_REQUIRED";

  const requiresObservationReview =
    reasons.includes("OBSERVATION_DOCUMENTATION_REVIEW") ||
    observationStatus === "EXTENDED_OBSERVATION_REVIEW" ||
    input.facilityFeeReadiness.operationalFlags.extendedObservation;

  const requiresComplianceReview =
    reasons.includes("MANUAL_COMPLIANCE_REVIEW") ||
    reasons.includes("DOCUMENTATION_INTEGRITY_REVIEW") ||
    reasons.includes("BILLING_CLASSIFICATION_REVIEW");

  const hold = openEncounter || Boolean(input.hasPendingResults);

  let status: CodingIntegrityStatus;

  if (input.codingReviewCompleted && !hold && reasons.length === 0) {
    status = "COMPLETED_REVIEW";
  } else if (openEncounter) {
    status = "HOLD_FOR_OPEN_ENCOUNTER";
  } else if (!input.hasPrimaryDiagnosis || reasons.includes("MISSING_DISPOSITION_DOCUMENTATION")) {
    status = "NEEDS_DOCUMENTATION_COMPLETION";
  } else if (requiresProviderClarification) {
    status = "NEEDS_PROVIDER_CLARIFICATION";
  } else if (requiresObservationReview) {
    status = "NEEDS_OBSERVATION_REVIEW";
  } else if (requiresFacilityReview) {
    status = "NEEDS_FACILITY_REVIEW";
  } else if (requiresComplianceReview) {
    status = "NEEDS_COMPLIANCE_REVIEW";
  } else if (input.hasPendingResults) {
    status = "HOLD_FOR_PENDING_RESULTS";
  } else if (
    input.exportReadiness.route !== "NO_CLAIM_EXPORT" &&
    input.ledgerReadiness.overallStatus !== "BLOCKED"
  ) {
    status = "READY_FOR_CODING_REVIEW";
  } else {
    status = "NEEDS_COMPLIANCE_REVIEW";
  }

  const readyForCodingReview =
    status === "READY_FOR_CODING_REVIEW" || status === "COMPLETED_REVIEW";

  return {
    status,
    domains,
    reasons: uniqueReasons(reasons),
    warnings: uniqueReasons(warnings),
    requiresProviderClarification,
    requiresFacilityReview,
    requiresComplianceReview,
    requiresObservationReview,
    readyForCodingReview,
    hold,
    previewOnly: true,
  };
}
