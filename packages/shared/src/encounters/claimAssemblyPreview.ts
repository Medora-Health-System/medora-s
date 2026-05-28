import { z } from "zod";
import type { BillingClassification } from "./billingClassification.js";
import { billingClassificationSchema } from "./billingClassification.js";
import type { ChargeCaptureReviewResult } from "./chargeCaptureReview.js";
import type { CodingIntegrityReviewResult } from "./codingIntegrityReview.js";
import type { EncounterBillingExportReadinessResult } from "./billingExportReadiness.js";
import type { ProfessionalFacilityBillingLedgerResult } from "./billingLedgerReadiness.js";
import type { FacilityFeeOperationalReadinessResult } from "./facilityFeeOperationalReadiness.js";

/** Phase 19UCED.8 — claim assembly / export orchestration preview (no claim submission). */
export const claimAssemblyPreviewStatusSchema = z.enum([
  "READY_FOR_EXPORT_REVIEW",
  "NEEDS_CODING_REVIEW",
  "NEEDS_CHARGE_REVIEW",
  "NEEDS_FACILITY_REVIEW",
  "NEEDS_PROVIDER_CLARIFICATION",
  "HOLD_FOR_OPEN_ENCOUNTER",
  "HOLD_FOR_PENDING_RESULTS",
  "NOT_READY",
  "NOT_APPLICABLE",
]);
export type ClaimAssemblyPreviewStatus = z.infer<typeof claimAssemblyPreviewStatusSchema>;

export const claimAssemblyPackageTypeSchema = z.enum([
  "PROFESSIONAL_CMS_1500",
  "FACILITY_UB_04",
  "BOTH_PROFESSIONAL_AND_FACILITY",
  "TELEHEALTH_PROFESSIONAL",
  "PROCEDURE_REVIEW",
  "NO_PACKAGE",
]);
export type ClaimAssemblyPackageType = z.infer<typeof claimAssemblyPackageTypeSchema>;

export const claimAssemblyReasonSchema = z.enum([
  "BILLING_CLASSIFICATION_REVIEW",
  "MISSING_PRIMARY_DIAGNOSIS",
  "MISSING_PAYER",
  "MISSING_PROVIDER_ATTRIBUTION",
  "MISSING_FACILITY_BILLING_IDENTITY",
  "CHARGE_REVIEW_REQUIRED",
  "CODING_REVIEW_REQUIRED",
  "FACILITY_FEE_REVIEW_REQUIRED",
  "OBSERVATION_REVIEW_REQUIRED",
  "OPEN_ENCOUNTER",
  "PENDING_RESULTS",
  "UNKNOWN_BILLING_SIDE",
  "PROCEDURE_REVIEW_REQUIRED",
  "MANUAL_REVIEW_REQUIRED",
  "NO_EXPORT_FOR_CLASSIFICATION",
]);
export type ClaimAssemblyReason = z.infer<typeof claimAssemblyReasonSchema>;

export const FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS = [
  "patientName",
  "diagnosisText",
  "diagnosisDescription",
  "payerName",
  "memberId",
  "policyNumber",
  "providerName",
  "clinicalNote",
  "HPI",
  "ROS",
  "MDMText",
  "assessment",
  "plan",
  "reimbursementAmount",
  "claimPayload",
  "x12Payload",
  "cptAutoCode",
  "icdAutoCode",
] as const;

export type ClaimAssemblyPackagePreview = {
  applies: boolean;
  ready: boolean;
  reasons: ClaimAssemblyReason[];
  warnings: ClaimAssemblyReason[];
};

export type ClaimAssemblyPreviewInput = {
  billingClassification: BillingClassification;
  exportReadiness: Pick<
    EncounterBillingExportReadinessResult,
    "route" | "formReadiness" | "requiresManualReview" | "missingItems"
  >;
  ledgerReadiness: Pick<
    ProfessionalFacilityBillingLedgerResult,
    "professional" | "facility" | "requiresManualReview"
  >;
  facilityFeeReadiness: Pick<
    FacilityFeeOperationalReadinessResult,
    "readinessStatus" | "requiresManualReview" | "operationalFlags"
  >;
  chargeReview: Pick<
    ChargeCaptureReviewResult,
    | "status"
    | "readyForReview"
    | "hold"
    | "requiresCoderReview"
    | "requiresProviderClarification"
    | "requiresFacilityReview"
  >;
  codingReview: Pick<
    CodingIntegrityReviewResult,
    | "status"
    | "readyForCodingReview"
    | "hold"
    | "requiresProviderClarification"
    | "requiresFacilityReview"
    | "requiresComplianceReview"
    | "requiresObservationReview"
  >;
  encounterStatus?: string | null;
  hasPrimaryDiagnosis: boolean;
  hasPayer: boolean;
  hasProviderAttribution: boolean;
  hasFacilityBillingIdentity: boolean;
  hasProfessionalLedger: boolean;
  hasFacilityLedger: boolean;
  hasUnknownBillingSideEvents?: boolean;
  hasPendingResults?: boolean;
};

export type ClaimAssemblyPreviewResult = {
  status: ClaimAssemblyPreviewStatus;
  packageType: ClaimAssemblyPackageType;
  professionalPackage: ClaimAssemblyPackagePreview;
  facilityPackage: ClaimAssemblyPackagePreview;
  reasons: ClaimAssemblyReason[];
  warnings: ClaimAssemblyReason[];
  requiresManualReview: boolean;
  previewOnly: true;
};

function uniqueReasons(items: ClaimAssemblyReason[]): ClaimAssemblyReason[] {
  return [...new Set(items)];
}

function isOpenEncounter(status: string | null | undefined): boolean {
  return Boolean(status && status !== "CLOSED");
}

function packageTypeForClassification(
  classification: BillingClassification,
  exportRoute: EncounterBillingExportReadinessResult["route"],
): ClaimAssemblyPackageType {
  if (exportRoute === "NO_CLAIM_EXPORT") return "NO_PACKAGE";
  if (exportRoute === "REVIEW_REQUIRED" || classification === "PROCEDURE") {
    return "PROCEDURE_REVIEW";
  }
  switch (classification) {
    case "CLINIC_VISIT":
    case "URGENT_CARE":
      return "PROFESSIONAL_CMS_1500";
    case "TELEHEALTH":
      return "TELEHEALTH_PROFESSIONAL";
    case "EMERGENCY_DEPARTMENT":
      return "BOTH_PROFESSIONAL_AND_FACILITY";
    case "OBSERVATION":
    case "INPATIENT":
      return "FACILITY_UB_04";
    default:
      return "NO_PACKAGE";
  }
}

function professionalApplies(packageType: ClaimAssemblyPackageType): boolean {
  return (
    packageType === "PROFESSIONAL_CMS_1500" ||
    packageType === "BOTH_PROFESSIONAL_AND_FACILITY" ||
    packageType === "TELEHEALTH_PROFESSIONAL"
  );
}

function facilityApplies(packageType: ClaimAssemblyPackageType): boolean {
  return packageType === "FACILITY_UB_04" || packageType === "BOTH_PROFESSIONAL_AND_FACILITY";
}

/**
 * Deterministic claim assembly / export orchestration preview.
 * PHI-safe — no claim payloads, payer details, diagnosis text, or reimbursement data.
 */
export function resolveClaimAssemblyPreview(input: ClaimAssemblyPreviewInput): ClaimAssemblyPreviewResult {
  const classification = billingClassificationSchema.parse(input.billingClassification);
  const packageType = packageTypeForClassification(classification, input.exportReadiness.route);
  const reasons: ClaimAssemblyReason[] = [];
  const warnings: ClaimAssemblyReason[] = [];
  const openEncounter = isOpenEncounter(input.encounterStatus);

  if (packageType === "NO_PACKAGE" || input.exportReadiness.route === "NO_CLAIM_EXPORT") {
    return {
      status: "NOT_APPLICABLE",
      packageType: "NO_PACKAGE",
      professionalPackage: { applies: false, ready: false, reasons: ["NO_EXPORT_FOR_CLASSIFICATION"], warnings: [] },
      facilityPackage: { applies: false, ready: false, reasons: ["NO_EXPORT_FOR_CLASSIFICATION"], warnings: [] },
      reasons: ["NO_EXPORT_FOR_CLASSIFICATION"],
      warnings: [],
      requiresManualReview: false,
      previewOnly: true,
    };
  }

  if (packageType === "PROCEDURE_REVIEW") {
    reasons.push("PROCEDURE_REVIEW_REQUIRED");
    reasons.push("BILLING_CLASSIFICATION_REVIEW");
  }

  if (!input.hasPrimaryDiagnosis) reasons.push("MISSING_PRIMARY_DIAGNOSIS");
  if (!input.hasPayer) reasons.push("MISSING_PAYER");
  if (!input.hasProviderAttribution) reasons.push("MISSING_PROVIDER_ATTRIBUTION");
  if (!input.hasFacilityBillingIdentity && facilityApplies(packageType)) {
    reasons.push("MISSING_FACILITY_BILLING_IDENTITY");
  }
  if (input.hasUnknownBillingSideEvents) reasons.push("UNKNOWN_BILLING_SIDE");
  if (openEncounter) {
    reasons.push("OPEN_ENCOUNTER");
    warnings.push("OPEN_ENCOUNTER");
  }
  if (input.hasPendingResults) {
    reasons.push("PENDING_RESULTS");
    warnings.push("PENDING_RESULTS");
  }
  if (!input.chargeReview.readyForReview && input.chargeReview.status !== "COMPLETED_REVIEW") {
    reasons.push("CHARGE_REVIEW_REQUIRED");
  }
  if (!input.codingReview.readyForCodingReview && input.codingReview.status !== "COMPLETED_REVIEW") {
    reasons.push("CODING_REVIEW_REQUIRED");
  }
  if (
    input.facilityFeeReadiness.readinessStatus === "REVIEW_REQUIRED" ||
    input.facilityFeeReadiness.operationalFlags.extendedObservation
  ) {
    reasons.push("FACILITY_FEE_REVIEW_REQUIRED");
  }
  if (input.facilityFeeReadiness.operationalFlags.inpatientReview) {
    reasons.push("OBSERVATION_REVIEW_REQUIRED");
  }
  if (
    input.exportReadiness.requiresManualReview ||
    input.ledgerReadiness.requiresManualReview ||
    input.facilityFeeReadiness.requiresManualReview ||
    input.chargeReview.requiresCoderReview ||
    input.codingReview.requiresComplianceReview
  ) {
    reasons.push("MANUAL_REVIEW_REQUIRED");
  }

  const profApplies = professionalApplies(packageType);
  const facApplies = facilityApplies(packageType);

  const professionalReasons: ClaimAssemblyReason[] = [];
  const facilityReasons: ClaimAssemblyReason[] = [];

  if (profApplies) {
    if (!input.hasPrimaryDiagnosis) professionalReasons.push("MISSING_PRIMARY_DIAGNOSIS");
    if (!input.hasPayer) professionalReasons.push("MISSING_PAYER");
    if (!input.hasProviderAttribution) professionalReasons.push("MISSING_PROVIDER_ATTRIBUTION");
    if (input.hasUnknownBillingSideEvents) professionalReasons.push("UNKNOWN_BILLING_SIDE");
    if (!input.chargeReview.readyForReview) professionalReasons.push("CHARGE_REVIEW_REQUIRED");
    if (!input.codingReview.readyForCodingReview) professionalReasons.push("CODING_REVIEW_REQUIRED");
    if (input.ledgerReadiness.professional.status !== "READY") {
      professionalReasons.push("MANUAL_REVIEW_REQUIRED");
    }
    if (!input.hasProfessionalLedger) {
      professionalReasons.push("CHARGE_REVIEW_REQUIRED");
    }
  }

  if (facApplies) {
    if (!input.hasFacilityBillingIdentity) facilityReasons.push("MISSING_FACILITY_BILLING_IDENTITY");
    if (!input.hasPrimaryDiagnosis) facilityReasons.push("MISSING_PRIMARY_DIAGNOSIS");
    if (input.facilityFeeReadiness.readinessStatus === "REVIEW_REQUIRED") {
      facilityReasons.push("FACILITY_FEE_REVIEW_REQUIRED");
    }
    if (input.chargeReview.requiresFacilityReview || input.codingReview.requiresFacilityReview) {
      facilityReasons.push("FACILITY_FEE_REVIEW_REQUIRED");
    }
    if (input.ledgerReadiness.facility.status !== "READY") {
      facilityReasons.push("MANUAL_REVIEW_REQUIRED");
    }
    if (!input.hasFacilityLedger && packageType !== "FACILITY_UB_04") {
      facilityReasons.push("CHARGE_REVIEW_REQUIRED");
    }
  }

  const professionalPackage: ClaimAssemblyPackagePreview = {
    applies: profApplies,
    ready:
      profApplies &&
      professionalReasons.length === 0 &&
      input.ledgerReadiness.professional.status === "READY" &&
      !openEncounter &&
      !input.hasPendingResults,
    reasons: uniqueReasons(professionalReasons),
    warnings: openEncounter ? ["OPEN_ENCOUNTER"] : input.hasPendingResults ? ["PENDING_RESULTS"] : [],
  };

  const facilityPackage: ClaimAssemblyPackagePreview = {
    applies: facApplies,
    ready:
      facApplies &&
      facilityReasons.length === 0 &&
      input.ledgerReadiness.facility.status === "READY" &&
      !openEncounter &&
      !input.hasPendingResults,
    reasons: uniqueReasons(facilityReasons),
    warnings: openEncounter ? ["OPEN_ENCOUNTER"] : input.hasPendingResults ? ["PENDING_RESULTS"] : [],
  };

  const requiresManualReview =
    reasons.includes("MANUAL_REVIEW_REQUIRED") ||
    packageType === "PROCEDURE_REVIEW" ||
    input.chargeReview.requiresCoderReview ||
    input.codingReview.requiresComplianceReview;

  let status: ClaimAssemblyPreviewStatus;

  if (openEncounter) {
    status = "HOLD_FOR_OPEN_ENCOUNTER";
  } else if (input.hasPendingResults && !professionalPackage.ready && !facilityPackage.ready) {
    status = "HOLD_FOR_PENDING_RESULTS";
  } else if (
    !input.hasPrimaryDiagnosis ||
    !input.hasPayer ||
    (facApplies && !input.hasFacilityBillingIdentity)
  ) {
    status = "NOT_READY";
  } else if (
    input.chargeReview.requiresProviderClarification ||
    input.codingReview.requiresProviderClarification
  ) {
    status = "NEEDS_PROVIDER_CLARIFICATION";
  } else if (!input.codingReview.readyForCodingReview) {
    status = "NEEDS_CODING_REVIEW";
  } else if (!input.chargeReview.readyForReview) {
    status = "NEEDS_CHARGE_REVIEW";
  } else if (facApplies && !facilityPackage.ready) {
    status = "NEEDS_FACILITY_REVIEW";
  } else if (packageType === "PROCEDURE_REVIEW") {
    status = "NEEDS_CODING_REVIEW";
  } else if (
    (profApplies ? professionalPackage.ready : true) &&
    (facApplies ? facilityPackage.ready : true)
  ) {
    status = "READY_FOR_EXPORT_REVIEW";
  } else {
    status = "NOT_READY";
  }

  return {
    status,
    packageType,
    professionalPackage,
    facilityPackage,
    reasons: uniqueReasons(reasons),
    warnings: uniqueReasons(warnings),
    requiresManualReview,
    previewOnly: true,
  };
}
