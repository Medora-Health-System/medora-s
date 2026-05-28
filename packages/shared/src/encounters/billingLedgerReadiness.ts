import { z } from "zod";
import type { BillingClassification } from "./billingClassification.js";
import { billingClassificationSchema } from "./billingClassification.js";
import type { ClaimExportRoute } from "./billingExportReadiness.js";
import { claimExportRouteSchema } from "./billingExportReadiness.js";
import type { FacilityBillingClassificationMode } from "./facilityBillingWorkflow.js";

/** Phase 19UCED.4 — professional vs facility ledger separation (preview only). */
export const billingLedgerSideSchema = z.enum(["PROFESSIONAL", "FACILITY"]);
export type BillingLedgerSide = z.infer<typeof billingLedgerSideSchema>;

export const billingLedgerReadinessStatusSchema = z.enum([
  "READY",
  "REVIEW_REQUIRED",
  "NOT_APPLICABLE",
  "BLOCKED",
]);
export type BillingLedgerReadinessStatus = z.infer<typeof billingLedgerReadinessStatusSchema>;

export const billingLedgerReasonSchema = z.enum([
  "PROFESSIONAL_PROVIDER_REQUIRED",
  "PROFESSIONAL_DIAGNOSIS_REQUIRED",
  "PROFESSIONAL_PROCEDURE_REVIEW",
  "FACILITY_BILLING_IDENTITY_REQUIRED",
  "FACILITY_DIAGNOSIS_REQUIRED",
  "FACILITY_REVENUE_CODE_REVIEW",
  "FACILITY_OBSERVATION_REVIEW",
  "FACILITY_INPATIENT_REVIEW",
  "PAYER_REQUIRED",
  "ENCOUNTER_NOT_CLOSED",
  "MANUAL_REVIEW_REQUIRED",
  "NOT_APPLICABLE_FOR_CLASSIFICATION",
]);
export type BillingLedgerReason = z.infer<typeof billingLedgerReasonSchema>;

export const FORBIDDEN_BILLING_LEDGER_READINESS_KEYS = [
  "patientName",
  "diagnosisDescription",
  "diagnosisText",
  "payerName",
  "memberId",
  "policyNumber",
  "providerName",
  "clinicalNote",
  "chiefComplaint",
  "hpi",
  "assessment",
  "plan",
] as const;

export type BillingLedgerSideReadiness = {
  applies: boolean;
  status: BillingLedgerReadinessStatus;
  reasons: BillingLedgerReason[];
  warnings: BillingLedgerReason[];
};

export type ProfessionalFacilityBillingLedgerInput = {
  billingClassification: BillingClassification;
  billingExportRoute: ClaimExportRoute;
  hasPrimaryDiagnosis: boolean;
  hasProfessionalProvider: boolean;
  hasProcedureCodes: boolean;
  hasFacilityBillingIdentity: boolean;
  hasPayer: boolean;
  encounterStatus?: string | null;
  facilityBillingWorkflowMode?: FacilityBillingClassificationMode | null;
};

export type ProfessionalFacilityBillingLedgerResult = {
  professional: BillingLedgerSideReadiness;
  facility: BillingLedgerSideReadiness;
  overallStatus: BillingLedgerReadinessStatus;
  requiresManualReview: boolean;
  exportGrouping: {
    professionalPackagePreview: boolean;
    facilityPackagePreview: boolean;
  };
};

function professionalApplies(classification: BillingClassification): boolean {
  switch (classification) {
    case "CLINIC_VISIT":
    case "URGENT_CARE":
    case "TELEHEALTH":
    case "EMERGENCY_DEPARTMENT":
      return true;
    case "OBSERVATION":
      return true;
    case "INPATIENT":
      return false;
    case "PROCEDURE":
      return true;
    default:
      return false;
  }
}

function facilityApplies(classification: BillingClassification): boolean {
  switch (classification) {
    case "CLINIC_VISIT":
    case "URGENT_CARE":
    case "TELEHEALTH":
      return false;
    case "EMERGENCY_DEPARTMENT":
    case "OBSERVATION":
    case "INPATIENT":
    case "PROCEDURE":
      return true;
    default:
      return false;
  }
}

function evaluateProfessionalSide(
  input: ProfessionalFacilityBillingLedgerInput,
  classification: BillingClassification,
): BillingLedgerSideReadiness {
  const applies = professionalApplies(classification);
  if (!applies) {
    return {
      applies: false,
      status: "NOT_APPLICABLE",
      reasons: ["NOT_APPLICABLE_FOR_CLASSIFICATION"],
      warnings: [],
    };
  }

  if (classification === "PROCEDURE") {
    return {
      applies: true,
      status: "REVIEW_REQUIRED",
      reasons: ["MANUAL_REVIEW_REQUIRED"],
      warnings: [],
    };
  }

  if (classification === "OBSERVATION" && input.facilityBillingWorkflowMode !== "HOSPITAL_ENTERPRISE") {
    return {
      applies: true,
      status: "REVIEW_REQUIRED",
      reasons: ["FACILITY_OBSERVATION_REVIEW"],
      warnings: [],
    };
  }

  const reasons: BillingLedgerReason[] = [];
  const warnings: BillingLedgerReason[] = [];

  if (!input.hasProfessionalProvider) reasons.push("PROFESSIONAL_PROVIDER_REQUIRED");
  if (!input.hasPrimaryDiagnosis) reasons.push("PROFESSIONAL_DIAGNOSIS_REQUIRED");
  if (!input.hasPayer) reasons.push("PAYER_REQUIRED");
  if (!input.hasProcedureCodes) warnings.push("PROFESSIONAL_PROCEDURE_REVIEW");
  if (input.encounterStatus && input.encounterStatus !== "CLOSED") warnings.push("ENCOUNTER_NOT_CLOSED");

  const status: BillingLedgerReadinessStatus = reasons.length > 0 ? "REVIEW_REQUIRED" : "READY";
  return { applies: true, status, reasons, warnings };
}

function evaluateFacilitySide(
  input: ProfessionalFacilityBillingLedgerInput,
  classification: BillingClassification,
): BillingLedgerSideReadiness {
  const applies = facilityApplies(classification);
  if (!applies) {
    return {
      applies: false,
      status: "NOT_APPLICABLE",
      reasons: ["NOT_APPLICABLE_FOR_CLASSIFICATION"],
      warnings: [],
    };
  }

  if (classification === "PROCEDURE") {
    return {
      applies: true,
      status: "REVIEW_REQUIRED",
      reasons: ["MANUAL_REVIEW_REQUIRED"],
      warnings: [],
    };
  }

  const reasons: BillingLedgerReason[] = [];
  const warnings: BillingLedgerReason[] = [];

  if (!input.hasFacilityBillingIdentity) reasons.push("FACILITY_BILLING_IDENTITY_REQUIRED");
  if (!input.hasPrimaryDiagnosis) reasons.push("FACILITY_DIAGNOSIS_REQUIRED");
  if (!input.hasPayer) reasons.push("PAYER_REQUIRED");
  if (!input.hasProcedureCodes) warnings.push("FACILITY_REVENUE_CODE_REVIEW");
  if (input.encounterStatus && input.encounterStatus !== "CLOSED") warnings.push("ENCOUNTER_NOT_CLOSED");
  if (classification === "OBSERVATION") warnings.push("FACILITY_OBSERVATION_REVIEW");
  if (classification === "INPATIENT") warnings.push("FACILITY_INPATIENT_REVIEW");

  const status: BillingLedgerReadinessStatus = reasons.length > 0 ? "REVIEW_REQUIRED" : "READY";
  return { applies: true, status, reasons, warnings };
}

function deriveOverallStatus(
  professional: BillingLedgerSideReadiness,
  facility: BillingLedgerSideReadiness,
): BillingLedgerReadinessStatus {
  const active = [professional, facility].filter((s) => s.applies);
  if (active.length === 0) return "NOT_APPLICABLE";
  if (active.some((s) => s.status === "BLOCKED")) return "BLOCKED";
  if (active.some((s) => s.status === "REVIEW_REQUIRED")) return "REVIEW_REQUIRED";
  if (active.every((s) => s.status === "READY")) return "READY";
  return "REVIEW_REQUIRED";
}

function exportGroupingPreview(
  classification: BillingClassification,
  route: ClaimExportRoute,
): { professionalPackagePreview: boolean; facilityPackagePreview: boolean } {
  if (route === "NO_CLAIM_EXPORT" || route === "REVIEW_REQUIRED") {
    return {
      professionalPackagePreview: classification !== "INPATIENT",
      facilityPackagePreview: classification !== "CLINIC_VISIT" && classification !== "URGENT_CARE" && classification !== "TELEHEALTH",
    };
  }
  return {
    professionalPackagePreview:
      route === "PROFESSIONAL_CLAIM" || route === "BOTH_PROFESSIONAL_AND_FACILITY",
    facilityPackagePreview: route === "FACILITY_CLAIM" || route === "BOTH_PROFESSIONAL_AND_FACILITY",
  };
}

/**
 * Separates professional vs facility billing ledger readiness from classification and export route.
 * PHI-safe — no names, diagnosis text, payer details, or clinical narrative.
 */
export function resolveProfessionalFacilityBillingLedger(
  input: ProfessionalFacilityBillingLedgerInput,
): ProfessionalFacilityBillingLedgerResult {
  const classification = billingClassificationSchema.parse(input.billingClassification);
  const route = claimExportRouteSchema.parse(input.billingExportRoute);

  const professional = evaluateProfessionalSide(input, classification);
  const facility = evaluateFacilitySide(input, classification);
  const overallStatus = deriveOverallStatus(professional, facility);
  const requiresManualReview =
    overallStatus === "REVIEW_REQUIRED" ||
    overallStatus === "BLOCKED" ||
    classification === "PROCEDURE";

  return {
    professional,
    facility,
    overallStatus,
    requiresManualReview,
    exportGrouping: exportGroupingPreview(classification, route),
  };
}
