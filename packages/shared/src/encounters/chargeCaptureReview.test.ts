import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_CHARGE_REVIEW_KEYS,
  resolveChargeCaptureReview,
  type ChargeCaptureReviewInput,
} from "./chargeCaptureReview.js";

const readyExport = {
  route: "PROFESSIONAL_CLAIM" as const,
  formReadiness: "CMS_1500_READY" as const,
  requiresManualReview: false,
  missingItems: [] as const,
  warnings: [] as const,
};

const readyLedger = {
  overallStatus: "READY" as const,
  professional: { applies: true, status: "READY" as const, reasons: [] as const, warnings: [] as const },
  facility: { applies: false, status: "NOT_APPLICABLE" as const, reasons: [] as const, warnings: [] as const },
  requiresManualReview: false,
};

const readyFacilityFee = {
  readinessStatus: "NOT_APPLICABLE" as const,
  operationalFlags: {
    observationCandidate: false,
    boardingReview: false,
    extendedObservation: false,
    inpatientReview: false,
  },
  requiresManualReview: false,
  warnings: [] as const,
  reasons: [] as const,
};

const completeInput: ChargeCaptureReviewInput = {
  billingClassification: "CLINIC_VISIT",
  encounterStatus: "CLOSED",
  exportReadiness: readyExport,
  ledgerReadiness: readyLedger,
  facilityFeeReadiness: readyFacilityFee,
  hasPrimaryDiagnosis: true,
  hasProviderAttribution: true,
  hasPayer: true,
  hasPendingResults: false,
  hasUnknownBillingSideEvents: false,
  hasProcedureCodes: true,
};

describe("chargeCaptureReview (19UCED.6)", () => {
  it("ready state when all readiness layers OK", () => {
    const r = resolveChargeCaptureReview(completeInput);
    expect(r.status).toBe("READY_FOR_BILLING_REVIEW");
    expect(r.readyForReview).toBe(true);
    expect(r.previewOnly).toBe(true);
    expect(r.hold).toBe(false);
  });

  it("open encounter → hold", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      encounterStatus: "OPEN",
    });
    expect(r.status).toBe("HOLD_FOR_OPEN_ENCOUNTER");
    expect(r.hold).toBe(true);
    expect(r.reasons).toContain("OPEN_ENCOUNTER");
  });

  it("missing diagnosis → missing required data", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      hasPrimaryDiagnosis: false,
      exportReadiness: {
        ...readyExport,
        missingItems: ["MISSING_DIAGNOSIS"],
      },
    });
    expect(r.status).toBe("MISSING_REQUIRED_DATA");
    expect(r.reasons).toContain("MISSING_PRIMARY_DIAGNOSIS");
  });

  it("unknown billing side → coder review", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      hasUnknownBillingSideEvents: true,
    });
    expect(r.status).toBe("NEEDS_CODER_REVIEW");
    expect(r.requiresCoderReview).toBe(true);
    expect(r.reasons).toContain("UNKNOWN_BILLING_SIDE");
  });

  it("facility identity missing → facility review", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      exportReadiness: {
        route: "BOTH_PROFESSIONAL_AND_FACILITY",
        formReadiness: "BOTH_READY",
        requiresManualReview: true,
        missingItems: ["MISSING_FACILITY_BILLING_IDENTITY"],
        warnings: [],
      },
      ledgerReadiness: {
        ...readyLedger,
        facility: {
          applies: true,
          status: "REVIEW_REQUIRED",
          reasons: ["FACILITY_BILLING_IDENTITY_REQUIRED"],
          warnings: [],
        },
      },
    });
    expect(r.status).toBe("NEEDS_FACILITY_REVIEW");
    expect(r.requiresFacilityReview).toBe(true);
    expect(r.reasons).toContain("MISSING_FACILITY_BILLING_IDENTITY");
  });

  it("observation extended → facility review", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      billingClassification: "OBSERVATION",
      exportReadiness: {
        route: "FACILITY_CLAIM",
        formReadiness: "UB_04_READY",
        requiresManualReview: false,
        missingItems: [],
        warnings: [],
      },
      ledgerReadiness: {
        ...readyLedger,
        facility: {
          applies: true,
          status: "READY",
          reasons: [],
          warnings: [],
        },
      },
      facilityFeeReadiness: {
        readinessStatus: "REVIEW_REQUIRED",
        operationalFlags: {
          observationCandidate: false,
          boardingReview: false,
          extendedObservation: true,
          inpatientReview: false,
        },
        requiresManualReview: true,
        warnings: ["EXTENDED_LENGTH_OF_STAY_REVIEW"],
        reasons: [],
      },
    });
    expect(r.status).toBe("NEEDS_FACILITY_REVIEW");
    expect(r.reasons).toContain("OBSERVATION_EXTENDED_REVIEW");
  });

  it("procedure classification → coder review", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      billingClassification: "PROCEDURE",
      exportReadiness: {
        route: "REVIEW_REQUIRED",
        formReadiness: "REVIEW_REQUIRED",
        requiresManualReview: true,
        missingItems: [],
        warnings: [],
      },
    });
    expect(r.status).toBe("NEEDS_CODER_REVIEW");
    expect(r.reasons).toContain("PROCEDURE_CODE_REVIEW");
  });

  it("pending results → hold warning", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      hasPendingResults: true,
    });
    expect(r.warnings).toContain("PENDING_RESULTS");
    expect(r.hold).toBe(true);
    expect(r.status).toBe("HOLD_FOR_PENDING_RESULTS");
  });

  it("no PHI keys in output", () => {
    const r = resolveChargeCaptureReview(completeInput);
    const keys = Object.keys(r);
    for (const forbidden of FORBIDDEN_CHARGE_REVIEW_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
    expect(JSON.stringify(r)).not.toContain("patientName");
    expect(JSON.stringify(r)).not.toContain("diagnosisText");
  });

  it("exhaustive classification/domain coverage", () => {
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
      const r = resolveChargeCaptureReview({
        ...completeInput,
        billingClassification,
        exportReadiness:
          billingClassification === "EMERGENCY_DEPARTMENT"
            ? {
                route: "BOTH_PROFESSIONAL_AND_FACILITY",
                formReadiness: "BOTH_READY",
                requiresManualReview: false,
                missingItems: [],
                warnings: [],
              }
            : billingClassification === "OBSERVATION"
              ? {
                  route: "FACILITY_CLAIM",
                  formReadiness: "UB_04_READY",
                  requiresManualReview: false,
                  missingItems: [],
                  warnings: [],
                }
              : billingClassification === "INPATIENT"
                ? {
                    route: "FACILITY_CLAIM",
                    formReadiness: "UB_04_READY",
                    requiresManualReview: false,
                    missingItems: [],
                    warnings: [],
                  }
                : billingClassification === "PROCEDURE"
                  ? {
                      route: "REVIEW_REQUIRED",
                      formReadiness: "REVIEW_REQUIRED",
                      requiresManualReview: true,
                      missingItems: [],
                      warnings: [],
                    }
                  : readyExport,
      });
      expect(r.domains.length).toBeGreaterThan(0);
      expect(r.previewOnly).toBe(true);
    }
  });

  it("missing provider → provider clarification", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      hasProviderAttribution: false,
    });
    expect(r.status).toBe("NEEDS_PROVIDER_CLARIFICATION");
    expect(r.requiresProviderClarification).toBe(true);
  });

  it("completed review when billing finalized signal", () => {
    const r = resolveChargeCaptureReview({
      ...completeInput,
      billingReviewCompleted: true,
    });
    expect(r.status).toBe("COMPLETED_REVIEW");
    expect(r.readyForReview).toBe(true);
  });
});
