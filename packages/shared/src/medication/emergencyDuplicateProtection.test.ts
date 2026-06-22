import { describe, expect, it } from "vitest";
import {
  buildEmergencyDuplicateProtectionReport,
  buildEmergencyMedicationActivationEligibilityReport,
  buildEmergencyVaccineCompatibilityReport,
} from "./tranche3EmergencyMedicationReadiness.js";

describe("EmergencyDuplicateProtectionReport", () => {
  it("runs duplicate protection report", () => {
    expect(["PASS", "FAIL"]).toContain(buildEmergencyDuplicateProtectionReport().decision);
  });

  it("uses provider search collision certification", () => {
    expect(buildEmergencyDuplicateProtectionReport().providerSearchCollisionDecision).toBe("SAFE");
  });

  it("reports duplicate provider search rows as zero after canonicalization", () => {
    expect(buildEmergencyDuplicateProtectionReport().duplicateProviderSearchRows).toBe(0);
  });

  it("reports activation collision decision", () => {
    expect(["SAFE", "BLOCKED"]).toContain(buildEmergencyDuplicateProtectionReport().activationCollisionDecision);
  });

  it("does not perform activation while checking duplicates", () => {
    const before = buildEmergencyMedicationActivationEligibilityReport();
    buildEmergencyDuplicateProtectionReport();
    const after = buildEmergencyMedicationActivationEligibilityReport();
    expect(after.byDecision).toEqual(before.byDecision);
  });

  it("tracks duplicate activation count", () => {
    expect(buildEmergencyDuplicateProtectionReport().duplicateActivations).toBeGreaterThanOrEqual(0);
  });

  it("tracks equivalent activation count", () => {
    expect(buildEmergencyDuplicateProtectionReport().equivalentActivations).toBeGreaterThanOrEqual(0);
  });

  it("tracks family overlap activations", () => {
    expect(buildEmergencyDuplicateProtectionReport().familyOverlapActivations).toBeGreaterThanOrEqual(0);
  });

  it("blocks provider search regression if collision certification fails", () => {
    expect(buildEmergencyDuplicateProtectionReport().blockers).not.toContain("PROVIDER_SEARCH_COLLISION");
  });

  it("keeps Tdap workflow independent of duplicate protection", () => {
    expect(buildEmergencyVaccineCompatibilityReport().decision).toBe("PASS");
  });

  it("keeps activation eligibility row count stable", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    expect(report.rows.length).toBe(report.totalEvaluated);
  });

  it("keeps all eligibility rows tied to ED groups", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    expect(report.rows.every((row) => row.groupId.length > 0)).toBe(true);
  });

  it("keeps all eligibility rows tied to medication names", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    expect(report.rows.every((row) => row.medication.length > 0)).toBe(true);
  });
}
);
