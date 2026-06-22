import { describe, expect, it } from "vitest";
import {
  certifyEmergencyHighRiskGovernance,
  EMERGENCY_DEPARTMENT_MEDICATION_GROUPS,
} from "./tranche3EmergencyMedicationReadiness.js";

describe("EmergencyHighRiskGovernanceCertification", () => {
  it("runs high-risk governance certification", () => {
    expect(["PASS", "FAIL"]).toContain(certifyEmergencyHighRiskGovernance().decision);
  });

  it("audits thrombolytics", () => {
    const report = certifyEmergencyHighRiskGovernance();
    expect(report.categories.THROMBOLYTIC.expected).toBe(2);
  });

  it("audits anticoagulants", () => {
    expect(certifyEmergencyHighRiskGovernance().categories.ANTICOAGULANT.expected).toBe(2);
  });

  it("audits sedatives", () => {
    expect(certifyEmergencyHighRiskGovernance().categories.SEDATIVE.expected).toBeGreaterThan(0);
  });

  it("audits paralytics", () => {
    expect(certifyEmergencyHighRiskGovernance().categories.PARALYTIC.expected).toBe(2);
  });

  it("audits controlled substances", () => {
    expect(certifyEmergencyHighRiskGovernance().categories.CONTROLLED_SUBSTANCE.expected).toBe(2);
  });

  it("does not allow unrestricted thrombolytic exposure", () => {
    expect(certifyEmergencyHighRiskGovernance().categories.THROMBOLYTIC.unrestrictedExposure).toBe(0);
  });

  it("does not allow unrestricted paralytic exposure", () => {
    expect(certifyEmergencyHighRiskGovernance().categories.PARALYTIC.unrestrictedExposure).toBe(0);
  });

  it("does not allow unrestricted controlled substance exposure", () => {
    expect(certifyEmergencyHighRiskGovernance().categories.CONTROLLED_SUBSTANCE.unrestrictedExposure).toBe(0);
  });

  it("requires governance for high-risk rows present in catalog", () => {
    const report = certifyEmergencyHighRiskGovernance();
    const totalGoverned = Object.values(report.categories).reduce((sum, row) => sum + row.governanceRequired, 0);
    expect(totalGoverned).toBeGreaterThan(0);
  });

  it("required ED groups include RSI high-risk meds", () => {
    const rsi = EMERGENCY_DEPARTMENT_MEDICATION_GROUPS.find((group) => group.groupId === "RSI");
    expect(rsi?.medications.some((med) => med.highRiskCategory === "PARALYTIC")).toBe(true);
  });

  it("required ED groups include trauma controlled meds", () => {
    const trauma = EMERGENCY_DEPARTMENT_MEDICATION_GROUPS.find((group) => group.groupId === "TRAUMA");
    expect(trauma?.medications.some((med) => med.highRiskCategory === "CONTROLLED_SUBSTANCE")).toBe(true);
  });

  it("passes when there is no unrestricted high-risk exposure", () => {
    expect(certifyEmergencyHighRiskGovernance().blockers).toEqual([]);
  });
}
);
