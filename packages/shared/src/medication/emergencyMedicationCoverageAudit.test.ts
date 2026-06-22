import { describe, expect, it } from "vitest";
import {
  buildEmergencyDepartmentCoverageAudit,
  buildTranche3RepoReadinessReport,
  EMERGENCY_DEPARTMENT_MEDICATION_GROUPS,
  runTranche3EmergencyMedicationReadiness,
} from "./tranche3EmergencyMedicationReadiness.js";

describe("EmergencyDepartmentCoverageAudit", () => {
  it("runs the Tranche 3 orchestrator", () => {
    expect(runTranche3EmergencyMedicationReadiness().ticket).toBe("MEDUI.MEDICATION.EXPANSION_TRANCHE_3_ED.1");
  });

  it("reports repo readiness surfaces", () => {
    const report = buildTranche3RepoReadinessReport();
    expect(report.governedActivationFramework).toBe(true);
    expect(report.canonicalMedicationFamilySystem).toBe(true);
    expect(report.duplicateCollisionPrevention).toBe(true);
  });

  it("audits all required ED medication groups", () => {
    const audit = buildEmergencyDepartmentCoverageAudit();
    expect(Object.keys(audit.byGroup)).toHaveLength(EMERGENCY_DEPARTMENT_MEDICATION_GROUPS.length);
  });

  it("includes stroke coverage", () => {
    const audit = buildEmergencyDepartmentCoverageAudit();
    expect(audit.byGroup.STROKE.expected).toBeGreaterThan(0);
  });

  it("includes STEMI / ACS coverage", () => {
    expect(buildEmergencyDepartmentCoverageAudit().byGroup.STEMI_ACS.expected).toBeGreaterThan(0);
  });

  it("includes sepsis coverage", () => {
    expect(buildEmergencyDepartmentCoverageAudit().byGroup.SEPSIS.expected).toBeGreaterThan(0);
  });

  it("includes DKA coverage", () => {
    expect(buildEmergencyDepartmentCoverageAudit().byGroup.DKA.expected).toBeGreaterThan(0);
  });

  it("includes asthma/COPD coverage", () => {
    expect(buildEmergencyDepartmentCoverageAudit().byGroup.ASTHMA_COPD.expected).toBeGreaterThan(0);
  });

  it("includes anaphylaxis coverage", () => {
    expect(buildEmergencyDepartmentCoverageAudit().byGroup.ANAPHYLAXIS.expected).toBeGreaterThan(0);
  });

  it("includes behavioral health coverage", () => {
    expect(buildEmergencyDepartmentCoverageAudit().byGroup.BEHAVIORAL_HEALTH.expected).toBeGreaterThan(0);
  });

  it("includes trauma coverage", () => {
    expect(buildEmergencyDepartmentCoverageAudit().byGroup.TRAUMA.expected).toBeGreaterThan(0);
  });

  it("includes RSI coverage", () => {
    expect(buildEmergencyDepartmentCoverageAudit().byGroup.RSI.expected).toBeGreaterThan(0);
  });

  it("finds at least some ED medications in the catalog", () => {
    const audit = buildEmergencyDepartmentCoverageAudit();
    expect(audit.presentCount).toBeGreaterThan(20);
    expect(audit.totalExpectedMedications).toBeGreaterThan(40);
  });
});
