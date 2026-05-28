import { describe, expect, it } from "vitest";
import {
  BILLING_EXPORT_READINESS_AUDIT_KEYS,
  FORBIDDEN_BILLING_EXPORT_READINESS_KEYS,
  evaluateFacilityBillingIdentityComplete,
  resolveEncounterBillingExportReadiness,
} from "./billingExportReadiness.js";

const completeInput = {
  facilityBillingIdentityComplete: true,
  hasPrimaryDiagnosis: true,
  hasProcedureCodes: true,
  hasPayer: true,
  encounterStatus: "CLOSED",
} as const;

describe("billingExportReadiness (19UCED.3)", () => {
  it("clinic visit routes professional / CMS-1500", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "CLINIC_VISIT",
    });
    expect(r.route).toBe("PROFESSIONAL_CLAIM");
    expect(r.formReadiness).toBe("CMS_1500_READY");
    expect(r.reasons).toContain("CLINIC_VISIT_PROFESSIONAL");
    expect(r.requiresManualReview).toBe(false);
  });

  it("urgent care routes professional / CMS-1500", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "URGENT_CARE",
    });
    expect(r.route).toBe("PROFESSIONAL_CLAIM");
    expect(r.formReadiness).toBe("CMS_1500_READY");
    expect(r.reasons).toContain("URGENT_CARE_PROFESSIONAL");
  });

  it("ED routes both professional and facility", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
    });
    expect(r.route).toBe("BOTH_PROFESSIONAL_AND_FACILITY");
    expect(r.formReadiness).toBe("BOTH_READY");
    expect(r.reasons).toContain("ED_FACILITY_AND_PROFESSIONAL");
  });

  it("observation routes facility / UB-04 by default", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "OBSERVATION",
    });
    expect(r.route).toBe("FACILITY_CLAIM");
    expect(r.formReadiness).toBe("UB_04_READY");
    expect(r.reasons).toContain("OBSERVATION_FACILITY");
  });

  it("observation hospital enterprise can route both", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "OBSERVATION",
      facilityBillingWorkflowMode: "HOSPITAL_ENTERPRISE",
    });
    expect(r.route).toBe("BOTH_PROFESSIONAL_AND_FACILITY");
    expect(r.formReadiness).toBe("BOTH_READY");
  });

  it("inpatient routes facility / UB-04", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "INPATIENT",
    });
    expect(r.route).toBe("FACILITY_CLAIM");
    expect(r.formReadiness).toBe("UB_04_READY");
    expect(r.reasons).toContain("INPATIENT_FACILITY");
  });

  it("procedure requires manual review", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "PROCEDURE",
    });
    expect(r.route).toBe("REVIEW_REQUIRED");
    expect(r.formReadiness).toBe("REVIEW_REQUIRED");
    expect(r.requiresManualReview).toBe(true);
    expect(r.missingItems).toContain("MANUAL_REVIEW_REQUIRED");
  });

  it("telehealth routes professional / CMS-1500", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "TELEHEALTH",
    });
    expect(r.route).toBe("PROFESSIONAL_CLAIM");
    expect(r.formReadiness).toBe("CMS_1500_READY");
    expect(r.reasons).toContain("TELEHEALTH_PROFESSIONAL");
  });

  it("missing primary diagnosis forces review required", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      hasPrimaryDiagnosis: false,
      billingClassification: "CLINIC_VISIT",
    });
    expect(r.missingItems).toContain("MISSING_DIAGNOSIS");
    expect(r.requiresManualReview).toBe(true);
    expect(r.formReadiness).toBe("REVIEW_REQUIRED");
  });

  it("missing facility billing identity for ED forces review required", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      facilityBillingIdentityComplete: false,
      billingClassification: "EMERGENCY_DEPARTMENT",
    });
    expect(r.missingItems).toContain("MISSING_FACILITY_BILLING_IDENTITY");
    expect(r.requiresManualReview).toBe(true);
    expect(r.formReadiness).toBe("REVIEW_REQUIRED");
  });

  it("missing payer forces review required", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      hasPayer: false,
      billingClassification: "URGENT_CARE",
    });
    expect(r.missingItems).toContain("MISSING_PAYER");
    expect(r.requiresManualReview).toBe(true);
  });

  it("missing procedure codes is warning only", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      hasProcedureCodes: false,
      billingClassification: "CLINIC_VISIT",
    });
    expect(r.warnings).toContain("MISSING_PROCEDURE_CODE");
    expect(r.missingItems).not.toContain("MISSING_PROCEDURE_CODE");
    expect(r.requiresManualReview).toBe(false);
  });

  it("open encounter adds warning but does not block preview route", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      encounterStatus: "OPEN",
      billingClassification: "URGENT_CARE",
    });
    expect(r.warnings).toContain("ENCOUNTER_NOT_CLOSED");
    expect(r.route).toBe("PROFESSIONAL_CLAIM");
  });

  it("facility billing identity completeness helper", () => {
    expect(
      evaluateFacilityBillingIdentityComplete({
        billingLegalName: "Hospital",
        billingAddressLine1: "1 Main",
        billingCity: "Port-au-Prince",
        billingCountry: "Haiti",
      }),
    ).toBe(true);
    expect(
      evaluateFacilityBillingIdentityComplete({
        billingLegalName: "",
        billingAddressLine1: "1 Main",
        billingCity: "Port-au-Prince",
        billingCountry: "Haiti",
      }),
    ).toBe(false);
  });

  it("readiness output has no forbidden PHI keys in shape", () => {
    const r = resolveEncounterBillingExportReadiness({
      ...completeInput,
      billingClassification: "EMERGENCY_DEPARTMENT",
    });
    const keys = Object.keys(r);
    for (const forbidden of FORBIDDEN_BILLING_EXPORT_READINESS_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
    expect(BILLING_EXPORT_READINESS_AUDIT_KEYS.length).toBeGreaterThan(0);
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
      const r = resolveEncounterBillingExportReadiness({
        ...completeInput,
        billingClassification,
      });
      expect(r.route).toBeTruthy();
      expect(r.formReadiness).toBeTruthy();
      expect(Array.isArray(r.reasons)).toBe(true);
    }
  });
});
