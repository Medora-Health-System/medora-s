import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS,
  resolveClaimAssemblyPreview,
  type ClaimAssemblyPreviewInput,
} from "./claimAssemblyPreview.js";

const readyExport = {
  route: "PROFESSIONAL_CLAIM" as const,
  formReadiness: "CMS_1500_READY" as const,
  requiresManualReview: false,
  missingItems: [] as const,
};

const readyLedger = {
  requiresManualReview: false,
  professional: { applies: true, status: "READY" as const, reasons: [] as const, warnings: [] as const },
  facility: { applies: false, status: "NOT_APPLICABLE" as const, reasons: [] as const, warnings: [] as const },
};

const readyFacilityFee = {
  readinessStatus: "NOT_APPLICABLE" as const,
  requiresManualReview: false,
  operationalFlags: {
    observationCandidate: false,
    boardingReview: false,
    extendedObservation: false,
    inpatientReview: false,
  },
};

const readyChargeReview = {
  status: "READY_FOR_BILLING_REVIEW" as const,
  readyForReview: true,
  hold: false,
  requiresCoderReview: false,
  requiresProviderClarification: false,
  requiresFacilityReview: false,
};

const readyCodingReview = {
  status: "READY_FOR_CODING_REVIEW" as const,
  readyForCodingReview: true,
  hold: false,
  requiresProviderClarification: false,
  requiresFacilityReview: false,
  requiresComplianceReview: false,
  requiresObservationReview: false,
};

const completeInput: ClaimAssemblyPreviewInput = {
  billingClassification: "URGENT_CARE",
  exportReadiness: readyExport,
  ledgerReadiness: readyLedger,
  facilityFeeReadiness: readyFacilityFee,
  chargeReview: readyChargeReview,
  codingReview: readyCodingReview,
  encounterStatus: "CLOSED",
  hasPrimaryDiagnosis: true,
  hasPayer: true,
  hasProviderAttribution: true,
  hasFacilityBillingIdentity: true,
  hasProfessionalLedger: true,
  hasFacilityLedger: false,
  hasPendingResults: false,
};

describe("claimAssemblyPreview (19UCED.8)", () => {
  it("UC → professional CMS-1500 preview", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      billingClassification: "URGENT_CARE",
    });
    expect(r.packageType).toBe("PROFESSIONAL_CMS_1500");
    expect(r.professionalPackage.applies).toBe(true);
    expect(r.facilityPackage.applies).toBe(false);
    expect(r.status).toBe("READY_FOR_EXPORT_REVIEW");
  });

  it("clinic → professional CMS-1500 preview", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      billingClassification: "CLINIC_VISIT",
    });
    expect(r.packageType).toBe("PROFESSIONAL_CMS_1500");
    expect(r.professionalPackage.applies).toBe(true);
  });

  it("ED → both professional + facility preview", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      exportReadiness: {
        route: "BOTH_PROFESSIONAL_AND_FACILITY",
        formReadiness: "BOTH_READY",
        requiresManualReview: false,
        missingItems: [],
      },
      ledgerReadiness: {
        requiresManualReview: false,
        professional: { applies: true, status: "READY", reasons: [], warnings: [] },
        facility: { applies: true, status: "READY", reasons: [], warnings: [] },
      },
      facilityFeeReadiness: {
        readinessStatus: "READY",
        requiresManualReview: false,
        operationalFlags: {
          observationCandidate: false,
          boardingReview: false,
          extendedObservation: false,
          inpatientReview: false,
        },
      },
      hasFacilityLedger: true,
    });
    expect(r.packageType).toBe("BOTH_PROFESSIONAL_AND_FACILITY");
    expect(r.professionalPackage.applies).toBe(true);
    expect(r.facilityPackage.applies).toBe(true);
  });

  it("observation → facility UB-04 preview", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      billingClassification: "OBSERVATION",
      exportReadiness: {
        route: "FACILITY_CLAIM",
        formReadiness: "UB_04_READY",
        requiresManualReview: false,
        missingItems: [],
      },
      ledgerReadiness: {
        requiresManualReview: false,
        professional: { applies: true, status: "READY", reasons: [], warnings: [] },
        facility: { applies: true, status: "READY", reasons: [], warnings: [] },
      },
      facilityFeeReadiness: {
        readinessStatus: "READY",
        requiresManualReview: false,
        operationalFlags: {
          observationCandidate: false,
          boardingReview: false,
          extendedObservation: false,
          inpatientReview: false,
        },
      },
      hasFacilityLedger: true,
    });
    expect(r.packageType).toBe("FACILITY_UB_04");
    expect(r.facilityPackage.applies).toBe(true);
    expect(r.professionalPackage.applies).toBe(false);
  });

  it("inpatient → facility UB-04 preview", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      billingClassification: "INPATIENT",
      exportReadiness: {
        route: "FACILITY_CLAIM",
        formReadiness: "UB_04_READY",
        requiresManualReview: false,
        missingItems: [],
      },
      ledgerReadiness: {
        requiresManualReview: false,
        professional: { applies: false, status: "NOT_APPLICABLE", reasons: [], warnings: [] },
        facility: { applies: true, status: "READY", reasons: [], warnings: [] },
      },
      facilityFeeReadiness: {
        readinessStatus: "REVIEW_REQUIRED",
        requiresManualReview: true,
        operationalFlags: {
          observationCandidate: false,
          boardingReview: false,
          extendedObservation: false,
          inpatientReview: true,
        },
      },
      hasFacilityLedger: true,
    });
    expect(r.packageType).toBe("FACILITY_UB_04");
    expect(r.facilityPackage.applies).toBe(true);
  });

  it("telehealth → professional preview", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      billingClassification: "TELEHEALTH",
    });
    expect(r.packageType).toBe("TELEHEALTH_PROFESSIONAL");
    expect(r.professionalPackage.applies).toBe(true);
  });

  it("procedure → review only", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      billingClassification: "PROCEDURE",
      exportReadiness: {
        route: "REVIEW_REQUIRED",
        formReadiness: "REVIEW_REQUIRED",
        requiresManualReview: true,
        missingItems: [],
      },
    });
    expect(r.packageType).toBe("PROCEDURE_REVIEW");
    expect(r.status).toBe("NEEDS_CODING_REVIEW");
    expect(r.reasons).toContain("PROCEDURE_REVIEW_REQUIRED");
  });

  it("open encounter → hold", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      encounterStatus: "OPEN",
    });
    expect(r.status).toBe("HOLD_FOR_OPEN_ENCOUNTER");
    expect(r.warnings).toContain("OPEN_ENCOUNTER");
  });

  it("missing diagnosis/payer/provider/facility identity → not ready", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      hasPrimaryDiagnosis: false,
      hasPayer: false,
      hasProviderAttribution: false,
      hasFacilityBillingIdentity: false,
      billingClassification: "EMERGENCY_DEPARTMENT",
      exportReadiness: {
        route: "BOTH_PROFESSIONAL_AND_FACILITY",
        formReadiness: "BOTH_READY",
        requiresManualReview: true,
        missingItems: ["MISSING_DIAGNOSIS", "MISSING_PAYER"],
      },
      ledgerReadiness: {
        requiresManualReview: false,
        professional: { applies: true, status: "REVIEW_REQUIRED", reasons: [], warnings: [] },
        facility: { applies: true, status: "REVIEW_REQUIRED", reasons: [], warnings: [] },
      },
    });
    expect(r.status).toBe("NOT_READY");
    expect(r.reasons).toContain("MISSING_PRIMARY_DIAGNOSIS");
    expect(r.reasons).toContain("MISSING_PAYER");
  });

  it("coding review not ready → not ready", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      codingReview: {
        ...readyCodingReview,
        readyForCodingReview: false,
        status: "NEEDS_PROVIDER_CLARIFICATION",
        requiresProviderClarification: true,
      },
    });
    expect(r.status).toBe("NEEDS_PROVIDER_CLARIFICATION");
    expect(r.reasons).toContain("CODING_REVIEW_REQUIRED");
  });

  it("charge review not ready → not ready", () => {
    const r = resolveClaimAssemblyPreview({
      ...completeInput,
      chargeReview: {
        ...readyChargeReview,
        readyForReview: false,
        status: "NEEDS_CODER_REVIEW",
        requiresCoderReview: true,
      },
    });
    expect(r.status).toBe("NEEDS_CHARGE_REVIEW");
    expect(r.reasons).toContain("CHARGE_REVIEW_REQUIRED");
  });

  it("no PHI keys in output", () => {
    const r = resolveClaimAssemblyPreview(completeInput);
    for (const forbidden of FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS) {
      expect(r).not.toHaveProperty(forbidden);
    }
    expect(JSON.stringify(r)).not.toContain("claimPayload");
  });

  it("exhaustive classification coverage", () => {
    const classifications = [
      "CLINIC_VISIT",
      "URGENT_CARE",
      "EMERGENCY_DEPARTMENT",
      "OBSERVATION",
      "INPATIENT",
      "PROCEDURE",
      "TELEHEALTH",
    ] as const;
    for (const billingClassification of classifications) {
      const r = resolveClaimAssemblyPreview({
        ...completeInput,
        billingClassification,
        exportReadiness:
          billingClassification === "EMERGENCY_DEPARTMENT"
            ? {
                route: "BOTH_PROFESSIONAL_AND_FACILITY",
                formReadiness: "BOTH_READY",
                requiresManualReview: false,
                missingItems: [],
              }
            : billingClassification === "OBSERVATION" || billingClassification === "INPATIENT"
              ? {
                  route: "FACILITY_CLAIM",
                  formReadiness: "UB_04_READY",
                  requiresManualReview: false,
                  missingItems: [],
                }
              : billingClassification === "PROCEDURE"
                ? {
                    route: "REVIEW_REQUIRED",
                    formReadiness: "REVIEW_REQUIRED",
                    requiresManualReview: true,
                    missingItems: [],
                  }
                : readyExport,
      });
      expect(r.previewOnly).toBe(true);
      expect(r.packageType).toBeDefined();
    }
  });
});
