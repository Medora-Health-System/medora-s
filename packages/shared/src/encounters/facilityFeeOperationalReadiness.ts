import { z } from "zod";
import type { BillingClassification } from "./billingClassification.js";
import { billingClassificationSchema } from "./billingClassification.js";
import type { ClaimExportRoute } from "./billingExportReadiness.js";
import { claimExportRouteSchema } from "./billingExportReadiness.js";
import type { FacilityBillingClassificationMode } from "./facilityBillingWorkflow.js";

/** Phase 19UCED.5 — facility-fee / observation operational billing readiness (preview only). */
export const EXTENDED_OBSERVATION_REVIEW_MINUTES = 24 * 60;
export const ED_OBSERVATION_CANDIDATE_MINUTES = 8 * 60;

export const facilityFeeOperationalCategorySchema = z.enum([
  "EMERGENCY_FACILITY",
  "OBSERVATION_FACILITY",
  "INPATIENT_FACILITY",
  "URGENT_CARE_FACILITY",
  "PROCEDURE_FACILITY",
  "NOT_APPLICABLE",
]);
export type FacilityFeeOperationalCategory = z.infer<typeof facilityFeeOperationalCategorySchema>;

export const observationOperationalStatusSchema = z.enum([
  "NOT_OBSERVATION",
  "OBSERVATION_CANDIDATE",
  "ACTIVE_OBSERVATION",
  "EXTENDED_OBSERVATION_REVIEW",
  "OBSERVATION_COMPLETED",
  "OBSERVATION_TO_INPATIENT_REVIEW",
]);
export type ObservationOperationalStatus = z.infer<typeof observationOperationalStatusSchema>;

export const facilityFeeReadinessStatusSchema = z.enum([
  "READY",
  "REVIEW_REQUIRED",
  "NOT_APPLICABLE",
  "BLOCKED",
]);
export type FacilityFeeReadinessStatus = z.infer<typeof facilityFeeReadinessStatusSchema>;

export const facilityFeeReasonSchema = z.enum([
  "OBSERVATION_REQUIRES_REVIEW",
  "FACILITY_IDENTITY_REQUIRED",
  "MISSING_PRIMARY_DIAGNOSIS",
  "MISSING_PROVIDER_ATTRIBUTION",
  "MISSING_OBSERVATION_DOCUMENTATION",
  "EXTENDED_LENGTH_OF_STAY_REVIEW",
  "BOARDING_REVIEW_REQUIRED",
  "INPATIENT_REVIEW_REQUIRED",
  "REVENUE_CODE_REVIEW_REQUIRED",
  "ENCOUNTER_NOT_CLOSED",
  "MANUAL_REVIEW_REQUIRED",
  "NOT_APPLICABLE_FOR_CLASSIFICATION",
]);
export type FacilityFeeReason = z.infer<typeof facilityFeeReasonSchema>;

export const FORBIDDEN_FACILITY_FEE_READINESS_KEYS = [
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
] as const;

export type FacilityFeeOperationalFlags = {
  observationCandidate: boolean;
  boardingReview: boolean;
  extendedObservation: boolean;
  inpatientReview: boolean;
};

export type FacilityFeeOperationalReadinessInput = {
  billingClassification: BillingClassification;
  exportRoute: ClaimExportRoute;
  encounterStatus?: string | null;
  encounterDurationMinutes?: number | null;
  hasPrimaryDiagnosis: boolean;
  hasProviderAttribution: boolean;
  hasFacilityBillingIdentity: boolean;
  observationStatus?: ObservationOperationalStatus | null;
  facilityBillingWorkflowMode?: FacilityBillingClassificationMode | null;
  disposition?: string | null;
  boardingOperational?: boolean;
  extendedObservationLos?: boolean;
  observationToInpatientPending?: boolean;
  hasObservationDocumentation?: boolean;
};

export type FacilityFeeOperationalReadinessResult = {
  facilityFeeCategory: FacilityFeeOperationalCategory;
  observationOperationalStatus: ObservationOperationalStatus;
  readinessStatus: FacilityFeeReadinessStatus;
  reasons: FacilityFeeReason[];
  warnings: FacilityFeeReason[];
  requiresManualReview: boolean;
  operationalFlags: FacilityFeeOperationalFlags;
};

function facilityFeeCategoryForClassification(
  classification: BillingClassification,
): FacilityFeeOperationalCategory {
  switch (classification) {
    case "EMERGENCY_DEPARTMENT":
      return "EMERGENCY_FACILITY";
    case "OBSERVATION":
      return "OBSERVATION_FACILITY";
    case "INPATIENT":
      return "INPATIENT_FACILITY";
    case "URGENT_CARE":
      return "URGENT_CARE_FACILITY";
    case "PROCEDURE":
      return "PROCEDURE_FACILITY";
    default:
      return "NOT_APPLICABLE";
  }
}

function deriveObservationOperationalStatus(
  input: FacilityFeeOperationalReadinessInput,
  classification: BillingClassification,
): ObservationOperationalStatus {
  if (input.observationStatus) {
    return observationOperationalStatusSchema.parse(input.observationStatus);
  }

  if (classification === "OBSERVATION") {
    if (input.encounterStatus === "CLOSED") return "OBSERVATION_COMPLETED";
    if (input.observationToInpatientPending) return "OBSERVATION_TO_INPATIENT_REVIEW";
    if (
      input.extendedObservationLos ||
      (typeof input.encounterDurationMinutes === "number" &&
        input.encounterDurationMinutes >= EXTENDED_OBSERVATION_REVIEW_MINUTES)
    ) {
      return "EXTENDED_OBSERVATION_REVIEW";
    }
    return "ACTIVE_OBSERVATION";
  }

  if (classification === "INPATIENT" && input.observationToInpatientPending) {
    return "OBSERVATION_TO_INPATIENT_REVIEW";
  }

  if (
    classification === "EMERGENCY_DEPARTMENT" &&
    input.encounterStatus !== "CLOSED" &&
    !input.disposition?.trim() &&
    typeof input.encounterDurationMinutes === "number" &&
    input.encounterDurationMinutes >= ED_OBSERVATION_CANDIDATE_MINUTES
  ) {
    return "OBSERVATION_CANDIDATE";
  }

  return "NOT_OBSERVATION";
}

function buildOperationalFlags(
  input: FacilityFeeOperationalReadinessInput,
  classification: BillingClassification,
  observationOperationalStatus: ObservationOperationalStatus,
): FacilityFeeOperationalFlags {
  const observationCandidate = observationOperationalStatus === "OBSERVATION_CANDIDATE";
  const boardingReview = Boolean(
    input.boardingOperational &&
      (classification === "EMERGENCY_DEPARTMENT" || classification === "OBSERVATION"),
  );
  const extendedObservation =
    observationOperationalStatus === "EXTENDED_OBSERVATION_REVIEW" ||
    Boolean(input.extendedObservationLos) ||
    (typeof input.encounterDurationMinutes === "number" &&
      input.encounterDurationMinutes >= EXTENDED_OBSERVATION_REVIEW_MINUTES);
  const inpatientReview =
    classification === "INPATIENT" ||
    observationOperationalStatus === "OBSERVATION_TO_INPATIENT_REVIEW";

  return {
    observationCandidate,
    boardingReview,
    extendedObservation,
    inpatientReview,
  };
}

/**
 * Deterministic facility-fee / observation operational readiness preview.
 * PHI-safe — no names, diagnosis text, payer details, or reimbursement data.
 */
export function resolveFacilityFeeOperationalReadiness(
  input: FacilityFeeOperationalReadinessInput,
): FacilityFeeOperationalReadinessResult {
  const classification = billingClassificationSchema.parse(input.billingClassification);
  claimExportRouteSchema.parse(input.exportRoute);

  const facilityFeeCategory = facilityFeeCategoryForClassification(classification);
  const observationOperationalStatus = deriveObservationOperationalStatus(input, classification);
  const operationalFlags = buildOperationalFlags(input, classification, observationOperationalStatus);

  const reasons: FacilityFeeReason[] = [];
  const warnings: FacilityFeeReason[] = [];

  if (facilityFeeCategory === "NOT_APPLICABLE") {
    return {
      facilityFeeCategory,
      observationOperationalStatus,
      readinessStatus: "NOT_APPLICABLE",
      reasons: ["NOT_APPLICABLE_FOR_CLASSIFICATION"],
      warnings: [],
      requiresManualReview: false,
      operationalFlags,
    };
  }

  if (!input.hasFacilityBillingIdentity) reasons.push("FACILITY_IDENTITY_REQUIRED");
  if (!input.hasPrimaryDiagnosis) reasons.push("MISSING_PRIMARY_DIAGNOSIS");
  if (!input.hasProviderAttribution) reasons.push("MISSING_PROVIDER_ATTRIBUTION");

  if (classification === "PROCEDURE") {
    reasons.push("MANUAL_REVIEW_REQUIRED");
  }

  if (classification === "OBSERVATION" || classification === "INPATIENT") {
    if (input.hasObservationDocumentation === false) {
      warnings.push("MISSING_OBSERVATION_DOCUMENTATION");
    }
  }

  if (operationalFlags.extendedObservation) {
    warnings.push("EXTENDED_LENGTH_OF_STAY_REVIEW");
    if (classification === "OBSERVATION") reasons.push("OBSERVATION_REQUIRES_REVIEW");
  }

  if (operationalFlags.boardingReview) {
    warnings.push("BOARDING_REVIEW_REQUIRED");
  }

  if (operationalFlags.inpatientReview) {
    warnings.push("INPATIENT_REVIEW_REQUIRED");
    if (classification === "INPATIENT") reasons.push("INPATIENT_REVIEW_REQUIRED");
  }

  if (operationalFlags.observationCandidate) {
    warnings.push("OBSERVATION_REQUIRES_REVIEW");
  }

  if (observationOperationalStatus === "OBSERVATION_TO_INPATIENT_REVIEW") {
    reasons.push("INPATIENT_REVIEW_REQUIRED");
  }

  if (classification === "URGENT_CARE") {
    reasons.push("OBSERVATION_REQUIRES_REVIEW");
  }

  warnings.push("REVENUE_CODE_REVIEW_REQUIRED");

  if (input.encounterStatus && input.encounterStatus !== "CLOSED") {
    warnings.push("ENCOUNTER_NOT_CLOSED");
  }

  let readinessStatus: FacilityFeeReadinessStatus = reasons.length > 0 ? "REVIEW_REQUIRED" : "READY";

  if (classification === "INPATIENT") {
    readinessStatus = "REVIEW_REQUIRED";
    if (!reasons.includes("INPATIENT_REVIEW_REQUIRED")) {
      reasons.push("INPATIENT_REVIEW_REQUIRED");
    }
  }

  if (classification === "PROCEDURE") {
    readinessStatus = "REVIEW_REQUIRED";
  }

  const requiresManualReview =
    readinessStatus === "REVIEW_REQUIRED" ||
    classification === "PROCEDURE" ||
    classification === "INPATIENT";

  return {
    facilityFeeCategory,
    observationOperationalStatus,
    readinessStatus,
    reasons: [...new Set(reasons)],
    warnings: [...new Set(warnings)],
    requiresManualReview,
    operationalFlags,
  };
}
