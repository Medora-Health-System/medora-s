import { z } from "zod";
import type { BillingClassification } from "./billingClassification.js";
import { billingClassificationSchema } from "./billingClassification.js";
import type { FacilityBillingClassificationMode } from "./facilityBillingWorkflow.js";

/** Phase 19UCED.3 — export routing preview (no claim submission). */
export const claimExportRouteSchema = z.enum([
  "PROFESSIONAL_CLAIM",
  "FACILITY_CLAIM",
  "BOTH_PROFESSIONAL_AND_FACILITY",
  "NO_CLAIM_EXPORT",
  "REVIEW_REQUIRED",
]);
export type ClaimExportRoute = z.infer<typeof claimExportRouteSchema>;

export const claimFormReadinessSchema = z.enum([
  "CMS_1500_READY",
  "UB_04_READY",
  "BOTH_READY",
  "NOT_READY",
  "REVIEW_REQUIRED",
]);
export type ClaimFormReadiness = z.infer<typeof claimFormReadinessSchema>;

export const billingRouteReasonSchema = z.enum([
  "CLINIC_VISIT_PROFESSIONAL",
  "URGENT_CARE_PROFESSIONAL",
  "ED_FACILITY_AND_PROFESSIONAL",
  "OBSERVATION_FACILITY",
  "INPATIENT_FACILITY",
  "PROCEDURE_REVIEW_REQUIRED",
  "TELEHEALTH_PROFESSIONAL",
  "MISSING_FACILITY_BILLING_IDENTITY",
  "MISSING_DIAGNOSIS",
  "MISSING_PROCEDURE_CODE",
  "MISSING_PAYER",
  "MANUAL_REVIEW_REQUIRED",
  "ENCOUNTER_NOT_CLOSED",
  "NO_EXPORT_FOR_CLASSIFICATION",
]);
export type BillingRouteReason = z.infer<typeof billingRouteReasonSchema>;

/** PHI-safe audit keys for billing export readiness responses. */
export const BILLING_EXPORT_READINESS_AUDIT_KEYS = [
  "encounterId",
  "facilityId",
  "billingClassification",
  "route",
  "formReadiness",
  "requiresManualReview",
  "reasonCount",
  "warningCount",
] as const;

export const FORBIDDEN_BILLING_EXPORT_READINESS_KEYS = [
  "patientName",
  "diagnosisText",
  "diagnosisDescription",
  "payerName",
  "memberId",
  "policyNumber",
  "chiefComplaint",
  "providerNote",
  "freeTextClinicalRationale",
] as const;

export type FacilityBillingIdentityInput = {
  billingLegalName?: string | null;
  billingAddressLine1?: string | null;
  billingCity?: string | null;
  billingStateProvince?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  billingNpi?: string | null;
  taxIdEin?: string | null;
};

/** Readiness-only completeness — does not block clinical workflow. */
export function evaluateFacilityBillingIdentityComplete(input: FacilityBillingIdentityInput): boolean {
  const legal = Boolean(input.billingLegalName?.trim());
  const address = Boolean(input.billingAddressLine1?.trim());
  const city = Boolean(input.billingCity?.trim());
  const country = Boolean(input.billingCountry?.trim());
  return legal && address && city && country;
}

export type EncounterBillingExportReadinessInput = {
  billingClassification: BillingClassification;
  facilityBillingIdentityComplete: boolean;
  hasPrimaryDiagnosis: boolean;
  hasProcedureCodes: boolean;
  hasPayer: boolean;
  facilityBillingWorkflowMode?: FacilityBillingClassificationMode | null;
  encounterStatus?: string | null;
};

export type EncounterBillingExportReadinessResult = {
  route: ClaimExportRoute;
  formReadiness: ClaimFormReadiness;
  reasons: BillingRouteReason[];
  warnings: BillingRouteReason[];
  requiresManualReview: boolean;
  missingItems: BillingRouteReason[];
};

function baseRouteForClassification(
  classification: BillingClassification,
  mode?: FacilityBillingClassificationMode | null,
): { route: ClaimExportRoute; formReadiness: ClaimFormReadiness; reasons: BillingRouteReason[] } {
  switch (classification) {
    case "CLINIC_VISIT":
      return {
        route: "PROFESSIONAL_CLAIM",
        formReadiness: "CMS_1500_READY",
        reasons: ["CLINIC_VISIT_PROFESSIONAL"],
      };
    case "URGENT_CARE":
      return {
        route: "PROFESSIONAL_CLAIM",
        formReadiness: "CMS_1500_READY",
        reasons: ["URGENT_CARE_PROFESSIONAL"],
      };
    case "EMERGENCY_DEPARTMENT":
      return {
        route: "BOTH_PROFESSIONAL_AND_FACILITY",
        formReadiness: "BOTH_READY",
        reasons: ["ED_FACILITY_AND_PROFESSIONAL"],
      };
    case "OBSERVATION":
      return {
        route: mode === "HOSPITAL_ENTERPRISE" ? "BOTH_PROFESSIONAL_AND_FACILITY" : "FACILITY_CLAIM",
        formReadiness: mode === "HOSPITAL_ENTERPRISE" ? "BOTH_READY" : "UB_04_READY",
        reasons: ["OBSERVATION_FACILITY"],
      };
    case "INPATIENT":
      return {
        route: "FACILITY_CLAIM",
        formReadiness: "UB_04_READY",
        reasons: ["INPATIENT_FACILITY"],
      };
    case "PROCEDURE":
      return {
        route: "REVIEW_REQUIRED",
        formReadiness: "REVIEW_REQUIRED",
        reasons: ["PROCEDURE_REVIEW_REQUIRED"],
      };
    case "TELEHEALTH":
      return {
        route: "PROFESSIONAL_CLAIM",
        formReadiness: "CMS_1500_READY",
        reasons: ["TELEHEALTH_PROFESSIONAL"],
      };
    default:
      return {
        route: "NO_CLAIM_EXPORT",
        formReadiness: "NOT_READY",
        reasons: ["NO_EXPORT_FOR_CLASSIFICATION"],
      };
  }
}

function requiresFacilityIdentity(route: ClaimExportRoute): boolean {
  return route === "FACILITY_CLAIM" || route === "BOTH_PROFESSIONAL_AND_FACILITY";
}

function requiresProfessionalIdentity(route: ClaimExportRoute): boolean {
  return route === "PROFESSIONAL_CLAIM" || route === "BOTH_PROFESSIONAL_AND_FACILITY";
}

/**
 * Deterministic billing/export routing preview from encounter billing classification.
 * PHI-safe — no names, diagnosis text, payer details, or clinical narrative.
 */
export function resolveEncounterBillingExportReadiness(
  input: EncounterBillingExportReadinessInput,
): EncounterBillingExportReadinessResult {
  const classification = billingClassificationSchema.parse(input.billingClassification);
  const base = baseRouteForClassification(classification, input.facilityBillingWorkflowMode);

  const missingItems: BillingRouteReason[] = [];
  const warnings: BillingRouteReason[] = [];
  let route = base.route;
  let formReadiness = base.formReadiness;
  const reasons = [...base.reasons];

  if (!input.hasPrimaryDiagnosis) {
    missingItems.push("MISSING_DIAGNOSIS");
  }
  if (!input.hasPayer) {
    missingItems.push("MISSING_PAYER");
  }
  if (requiresFacilityIdentity(route) && !input.facilityBillingIdentityComplete) {
    missingItems.push("MISSING_FACILITY_BILLING_IDENTITY");
  }
  if (!input.hasProcedureCodes) {
    warnings.push("MISSING_PROCEDURE_CODE");
  }
  if (input.encounterStatus && input.encounterStatus !== "CLOSED") {
    warnings.push("ENCOUNTER_NOT_CLOSED");
  }

  if (classification === "PROCEDURE") {
    missingItems.push("MANUAL_REVIEW_REQUIRED");
  }

  const requiresManualReview =
    missingItems.length > 0 ||
    route === "REVIEW_REQUIRED" ||
    classification === "PROCEDURE";

  if (requiresManualReview && route !== "REVIEW_REQUIRED" && route !== "NO_CLAIM_EXPORT") {
    formReadiness = "REVIEW_REQUIRED";
  } else if (missingItems.length > 0) {
    if (formReadiness === "BOTH_READY") {
      formReadiness = "REVIEW_REQUIRED";
    } else if (formReadiness === "CMS_1500_READY" && requiresProfessionalIdentity(route)) {
      formReadiness = "REVIEW_REQUIRED";
    } else if (formReadiness === "UB_04_READY" && requiresFacilityIdentity(route)) {
      formReadiness = "REVIEW_REQUIRED";
    }
  }

  if (classification === "PROCEDURE") {
    route = "REVIEW_REQUIRED";
    formReadiness = "REVIEW_REQUIRED";
  }

  return {
    route,
    formReadiness,
    reasons,
    warnings,
    requiresManualReview,
    missingItems: [...new Set(missingItems)],
  };
}
