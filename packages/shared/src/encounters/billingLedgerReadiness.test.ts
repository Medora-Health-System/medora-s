import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_BILLING_LEDGER_READINESS_KEYS,
  resolveProfessionalFacilityBillingLedger,
} from "./billingLedgerReadiness.js";

const completeInput = {
  hasPrimaryDiagnosis: true,
  hasProfessionalProvider: true,
  hasProcedureCodes: true,
  hasFacilityBillingIdentity: true,
  hasPayer: true,
  encounterStatus: "CLOSED",
  billingExportRoute: "PROFESSIONAL_CLAIM" as const,
};

describe("billingLedgerReadiness (19UCED.4)", () => {
  it("clinic → professional applies, facility not applicable", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "CLINIC_VISIT",
      billingExportRoute: "PROFESSIONAL_CLAIM",
    });
    expect(r.professional.applies).toBe(true);
    expect(r.professional.status).toBe("READY");
    expect(r.facility.applies).toBe(false);
    expect(r.facility.status).toBe("NOT_APPLICABLE");
    expect(r.exportGrouping.professionalPackagePreview).toBe(true);
    expect(r.exportGrouping.facilityPackagePreview).toBe(false);
  });

  it("UC → professional applies, facility not applicable", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "URGENT_CARE",
      billingExportRoute: "PROFESSIONAL_CLAIM",
    });
    expect(r.professional.applies).toBe(true);
    expect(r.facility.applies).toBe(false);
    expect(r.facility.status).toBe("NOT_APPLICABLE");
  });

  it("ED → both apply", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      billingExportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
    });
    expect(r.professional.applies).toBe(true);
    expect(r.facility.applies).toBe(true);
    expect(r.professional.status).toBe("READY");
    expect(r.facility.status).toBe("READY");
    expect(r.exportGrouping.professionalPackagePreview).toBe(true);
    expect(r.exportGrouping.facilityPackagePreview).toBe(true);
  });

  it("observation → facility applies; professional review/future by default", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "OBSERVATION",
      billingExportRoute: "FACILITY_CLAIM",
    });
    expect(r.facility.applies).toBe(true);
    expect(r.facility.status).toBe("READY");
    expect(r.professional.applies).toBe(true);
    expect(r.professional.status).toBe("REVIEW_REQUIRED");
    expect(r.professional.reasons).toContain("FACILITY_OBSERVATION_REVIEW");
  });

  it("observation hospital enterprise → both can be ready", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "OBSERVATION",
      billingExportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
      facilityBillingWorkflowMode: "HOSPITAL_ENTERPRISE",
    });
    expect(r.professional.applies).toBe(true);
    expect(r.professional.status).toBe("READY");
    expect(r.facility.applies).toBe(true);
  });

  it("inpatient → facility applies; professional not applicable", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "INPATIENT",
      billingExportRoute: "FACILITY_CLAIM",
    });
    expect(r.facility.applies).toBe(true);
    expect(r.professional.applies).toBe(false);
    expect(r.professional.status).toBe("NOT_APPLICABLE");
    expect(r.facility.warnings).toContain("FACILITY_INPATIENT_REVIEW");
  });

  it("telehealth → professional only", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "TELEHEALTH",
      billingExportRoute: "PROFESSIONAL_CLAIM",
    });
    expect(r.professional.applies).toBe(true);
    expect(r.facility.applies).toBe(false);
  });

  it("procedure → manual review on both sides", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "PROCEDURE",
      billingExportRoute: "REVIEW_REQUIRED",
    });
    expect(r.professional.status).toBe("REVIEW_REQUIRED");
    expect(r.facility.status).toBe("REVIEW_REQUIRED");
    expect(r.requiresManualReview).toBe(true);
  });

  it("missing professional provider → professional review", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "CLINIC_VISIT",
      hasProfessionalProvider: false,
    });
    expect(r.professional.status).toBe("REVIEW_REQUIRED");
    expect(r.professional.reasons).toContain("PROFESSIONAL_PROVIDER_REQUIRED");
  });

  it("missing facility identity → facility review for ED", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      billingExportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
      hasFacilityBillingIdentity: false,
    });
    expect(r.facility.status).toBe("REVIEW_REQUIRED");
    expect(r.facility.reasons).toContain("FACILITY_BILLING_IDENTITY_REQUIRED");
  });

  it("missing diagnosis → both applicable sides review", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      billingExportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
      hasPrimaryDiagnosis: false,
    });
    expect(r.professional.reasons).toContain("PROFESSIONAL_DIAGNOSIS_REQUIRED");
    expect(r.facility.reasons).toContain("FACILITY_DIAGNOSIS_REQUIRED");
  });

  it("open encounter adds warning", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "URGENT_CARE",
      encounterStatus: "OPEN",
    });
    expect(r.professional.warnings).toContain("ENCOUNTER_NOT_CLOSED");
    expect(r.professional.status).toBe("READY");
  });

  it("output excludes forbidden PHI keys", () => {
    const r = resolveProfessionalFacilityBillingLedger({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
      billingExportRoute: "BOTH_PROFESSIONAL_AND_FACILITY",
    });
    const keys = JSON.stringify(r);
    for (const forbidden of FORBIDDEN_BILLING_LEDGER_READINESS_KEYS) {
      expect(keys).not.toContain(`"${forbidden}"`);
    }
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
      const r = resolveProfessionalFacilityBillingLedger({
        ...completeInput,
        billingClassification,
        billingExportRoute:
          billingClassification === "EMERGENCY_DEPARTMENT"
            ? "BOTH_PROFESSIONAL_AND_FACILITY"
            : billingClassification === "OBSERVATION" || billingClassification === "INPATIENT"
              ? "FACILITY_CLAIM"
              : billingClassification === "PROCEDURE"
                ? "REVIEW_REQUIRED"
                : "PROFESSIONAL_CLAIM",
      });
      expect(r.overallStatus).toBeTruthy();
      expect(r.professional.status).toBeTruthy();
      expect(r.facility.status).toBeTruthy();
    }
  });
});
