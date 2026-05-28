import { describe, expect, it } from "vitest";
import {
  EXTENDED_OBSERVATION_REVIEW_MINUTES,
  FORBIDDEN_FACILITY_FEE_READINESS_KEYS,
  resolveFacilityFeeOperationalReadiness,
} from "./facilityFeeOperationalReadiness.js";

const completeInput = {
  exportRoute: "FACILITY_CLAIM" as const,
  encounterStatus: "CLOSED",
  hasPrimaryDiagnosis: true,
  hasProviderAttribution: true,
  hasFacilityBillingIdentity: true,
  hasObservationDocumentation: true,
};

describe("facilityFeeOperationalReadiness (19UCED.5)", () => {
  it("ED → emergency facility ready", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      exportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
    });
    expect(r.facilityFeeCategory).toBe("EMERGENCY_FACILITY");
    expect(r.readinessStatus).toBe("READY");
    expect(r.observationOperationalStatus).toBe("NOT_OBSERVATION");
  });

  it("observation → active observation", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "OBSERVATION",
      encounterStatus: "OPEN",
      encounterDurationMinutes: 120,
    });
    expect(r.facilityFeeCategory).toBe("OBSERVATION_FACILITY");
    expect(r.observationOperationalStatus).toBe("ACTIVE_OBSERVATION");
  });

  it("observation LOS extended → review warning", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "OBSERVATION",
      encounterStatus: "OPEN",
      encounterDurationMinutes: EXTENDED_OBSERVATION_REVIEW_MINUTES + 30,
    });
    expect(r.observationOperationalStatus).toBe("EXTENDED_OBSERVATION_REVIEW");
    expect(r.operationalFlags.extendedObservation).toBe(true);
    expect(r.warnings).toContain("EXTENDED_LENGTH_OF_STAY_REVIEW");
    expect(r.requiresManualReview).toBe(true);
  });

  it("inpatient → inpatient facility review", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "INPATIENT",
    });
    expect(r.facilityFeeCategory).toBe("INPATIENT_FACILITY");
    expect(r.readinessStatus).toBe("REVIEW_REQUIRED");
    expect(r.operationalFlags.inpatientReview).toBe(true);
  });

  it("telehealth → not applicable", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "TELEHEALTH",
      exportRoute: "PROFESSIONAL_CLAIM",
    });
    expect(r.facilityFeeCategory).toBe("NOT_APPLICABLE");
    expect(r.readinessStatus).toBe("NOT_APPLICABLE");
  });

  it("missing facility identity → review required", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      exportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
      hasFacilityBillingIdentity: false,
    });
    expect(r.reasons).toContain("FACILITY_IDENTITY_REQUIRED");
    expect(r.readinessStatus).toBe("REVIEW_REQUIRED");
  });

  it("missing diagnosis → review required", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      exportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
      hasPrimaryDiagnosis: false,
    });
    expect(r.reasons).toContain("MISSING_PRIMARY_DIAGNOSIS");
    expect(r.readinessStatus).toBe("REVIEW_REQUIRED");
  });

  it("observation candidate warning for prolonged ED", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      exportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
      encounterStatus: "OPEN",
      disposition: null,
      encounterDurationMinutes: 500,
    });
    expect(r.observationOperationalStatus).toBe("OBSERVATION_CANDIDATE");
    expect(r.operationalFlags.observationCandidate).toBe(true);
    expect(r.warnings).toContain("OBSERVATION_REQUIRES_REVIEW");
  });

  it("boarding review flag", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      exportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
      encounterStatus: "OPEN",
      boardingOperational: true,
    });
    expect(r.operationalFlags.boardingReview).toBe(true);
    expect(r.warnings).toContain("BOARDING_REVIEW_REQUIRED");
  });

  it("output excludes forbidden PHI keys in shape", () => {
    const r = resolveFacilityFeeOperationalReadiness({
      ...completeInput,
      billingClassification: "OBSERVATION",
      encounterStatus: "OPEN",
    });
    const keys = Object.keys(r);
    for (const forbidden of FORBIDDEN_FACILITY_FEE_READINESS_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
    expect(JSON.stringify(r)).not.toContain("patientName");
  });

  it("exhaustive billingClassification coverage", () => {
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
      const r = resolveFacilityFeeOperationalReadiness({
        ...completeInput,
        billingClassification,
        exportRoute:
          billingClassification === "EMERGENCY_DEPARTMENT"
            ? "BOTH_PROFESSIONAL_AND_FACILITY"
            : billingClassification === "OBSERVATION" || billingClassification === "INPATIENT"
              ? "FACILITY_CLAIM"
              : billingClassification === "PROCEDURE"
                ? "REVIEW_REQUIRED"
                : "PROFESSIONAL_CLAIM",
      });
      expect(r.facilityFeeCategory).toBeTruthy();
      expect(r.observationOperationalStatus).toBeTruthy();
      expect(r.readinessStatus).toBeTruthy();
    }
  });
});
