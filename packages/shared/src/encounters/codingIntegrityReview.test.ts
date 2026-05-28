import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_CODING_REVIEW_KEYS,
  resolveCodingIntegrityReview,
  type CodingIntegrityReviewInput,
} from "./codingIntegrityReview.js";

const readyExport = {
  route: "PROFESSIONAL_CLAIM" as const,
  requiresManualReview: false,
  missingItems: [] as const,
};

const readyLedger = {
  overallStatus: "READY" as const,
  requiresManualReview: false,
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
  observationOperationalStatus: "NOT_OBSERVATION" as const,
};

const readyChargeReview = {
  status: "READY_FOR_BILLING_REVIEW" as const,
  requiresCoderReview: false,
  requiresProviderClarification: false,
  requiresFacilityReview: false,
};

const completeInput: CodingIntegrityReviewInput = {
  billingClassification: "URGENT_CARE",
  encounterStatus: "CLOSED",
  exportReadiness: readyExport,
  ledgerReadiness: readyLedger,
  facilityFeeReadiness: readyFacilityFee,
  chargeReview: readyChargeReview,
  hasPrimaryDiagnosis: true,
  hasProviderAttribution: true,
  hasMDM: true,
  hasDispositionDocumentation: true,
  hasReassessment: true,
  hasPendingResults: false,
};

describe("codingIntegrityReview (19UCED.7)", () => {
  it("missing diagnosis → documentation completion review", () => {
    const r = resolveCodingIntegrityReview({
      ...completeInput,
      hasPrimaryDiagnosis: false,
    });
    expect(r.status).toBe("NEEDS_DOCUMENTATION_COMPLETION");
    expect(r.reasons).toContain("MISSING_PRIMARY_DIAGNOSIS");
  });

  it("missing MDM → provider clarification", () => {
    const r = resolveCodingIntegrityReview({
      ...completeInput,
      hasMDM: false,
    });
    expect(r.status).toBe("NEEDS_PROVIDER_CLARIFICATION");
    expect(r.requiresProviderClarification).toBe(true);
    expect(r.reasons).toContain("MISSING_MDM");
  });

  it("missing disposition documentation → review", () => {
    const r = resolveCodingIntegrityReview({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      hasDispositionDocumentation: false,
    });
    expect(r.status).toBe("NEEDS_DOCUMENTATION_COMPLETION");
    expect(r.reasons).toContain("MISSING_DISPOSITION_DOCUMENTATION");
  });

  it("observation extended → observation review", () => {
    const r = resolveCodingIntegrityReview({
      ...completeInput,
      billingClassification: "OBSERVATION",
      facilityFeeReadiness: {
        readinessStatus: "REVIEW_REQUIRED",
        requiresManualReview: true,
        operationalFlags: {
          observationCandidate: false,
          boardingReview: false,
          extendedObservation: true,
          inpatientReview: false,
        },
        observationOperationalStatus: "EXTENDED_OBSERVATION_REVIEW",
      },
      encounterAgeMinutes: 24 * 60 + 30,
    });
    expect(r.status).toBe("NEEDS_OBSERVATION_REVIEW");
    expect(r.requiresObservationReview).toBe(true);
    expect(r.reasons).toContain("OBSERVATION_DOCUMENTATION_REVIEW");
  });

  it("pending results → hold warning", () => {
    const r = resolveCodingIntegrityReview({
      ...completeInput,
      hasPendingResults: true,
    });
    expect(r.warnings).toContain("PENDING_RESULTS_REVIEW");
    expect(r.hold).toBe(true);
    expect(r.status).toBe("HOLD_FOR_PENDING_RESULTS");
  });

  it("open encounter → hold", () => {
    const r = resolveCodingIntegrityReview({
      ...completeInput,
      encounterStatus: "OPEN",
    });
    expect(r.status).toBe("HOLD_FOR_OPEN_ENCOUNTER");
    expect(r.reasons).toContain("OPEN_ENCOUNTER_REVIEW");
  });

  it("completed documentation → ready for coding review", () => {
    const r = resolveCodingIntegrityReview(completeInput);
    expect(r.status).toBe("READY_FOR_CODING_REVIEW");
    expect(r.readyForCodingReview).toBe(true);
    expect(r.previewOnly).toBe(true);
  });

  it("no PHI keys in output", () => {
    const r = resolveCodingIntegrityReview(completeInput);
    for (const forbidden of FORBIDDEN_CODING_REVIEW_KEYS) {
      expect(r).not.toHaveProperty(forbidden);
    }
    expect(JSON.stringify(r)).not.toContain("patientName");
  });

  it("exhaustive domain/status coverage", () => {
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
      const r = resolveCodingIntegrityReview({
        ...completeInput,
        billingClassification,
        exportReadiness:
          billingClassification === "PROCEDURE"
            ? { route: "REVIEW_REQUIRED", requiresManualReview: true, missingItems: [] }
            : readyExport,
      });
      expect(r.domains.length).toBeGreaterThan(0);
      expect(r.previewOnly).toBe(true);
    }
  });
});
