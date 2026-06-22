import { describe, expect, it } from "vitest";
import {
  buildEmergencyDepartmentCoverageAudit,
  buildEmergencyVaccineCompatibilityReport,
  buildTranche3MedicationEngineMaturityProjectionReport,
  certifyEmergencyMedicationI18n,
  runTranche3EmergencyMedicationReadiness,
} from "./tranche3EmergencyMedicationReadiness.js";

describe("EmergencyMedicationI18nCertification", () => {
  it("runs i18n certification", () => {
    expect(["PASS", "FAIL"]).toContain(certifyEmergencyMedicationI18n().decision);
  });

  it("audits ED medication rows", () => {
    expect(certifyEmergencyMedicationI18n().rowsAudited).toBeGreaterThan(0);
  });

  it("has zero English leakage into French", () => {
    expect(certifyEmergencyMedicationI18n().frLeakageCount).toBe(0);
  });

  it("has zero French leakage into English", () => {
    expect(certifyEmergencyMedicationI18n().enLeakageCount).toBe(0);
  });

  it("has no missing localization for audited ED rows", () => {
    expect(certifyEmergencyMedicationI18n().missingLocalizationCount).toBe(0);
  });

  it("preserves Tdap EN/FR localization", () => {
    const report = buildEmergencyVaccineCompatibilityReport();
    expect(report.enFrLocalization).toBe(true);
    expect(report.languageLeakage).toBe(false);
  });

  it("maturity projection starts at 4.0", () => {
    expect(buildTranche3MedicationEngineMaturityProjectionReport().currentScore).toBe(4.0);
  });

  it("maturity projection lands in expected Tranche 3 range", () => {
    const projection = buildTranche3MedicationEngineMaturityProjectionReport();
    expect(projection.projectedAfterTranche3).toBeGreaterThanOrEqual(4.1);
    expect(projection.projectedAfterTranche3).toBeLessThanOrEqual(4.2);
  });

  it("maturity projection targets 4.5", () => {
    expect(buildTranche3MedicationEngineMaturityProjectionReport().targetScore).toBe(4.5);
  });

  it("maturity projection keeps remaining blockers", () => {
    expect(buildTranche3MedicationEngineMaturityProjectionReport().remainingBlockers).toContain("Critical Care");
  });

  it("orchestrator reports compatibility as no mutation", () => {
    const report = runTranche3EmergencyMedicationReadiness();
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.providerSearchChanged).toBe(false);
    expect(report.compatibility.formularyStatusChanged).toBe(false);
  });

  it("orchestrator includes all required major reports", () => {
    const report = runTranche3EmergencyMedicationReadiness();
    expect(report.coverageAudit.totalExpectedMedications).toBeGreaterThan(0);
    expect(report.activationEligibility.totalEvaluated).toBeGreaterThan(0);
    expect(report.duplicateProtection.providerSearchCollisionDecision).toBe("SAFE");
  });

  it("coverage rows retain medication names for i18n review", () => {
    expect(buildEmergencyDepartmentCoverageAudit().rows.every((row) => row.medication.trim().length > 0)).toBe(true);
  });
}
);
