import { describe, expect, it } from "vitest";
import {
  buildEmergencyVaccineCompatibilityReport,
  buildEmergencyWorkflowCompatibilityReport,
} from "./tranche3EmergencyMedicationReadiness.js";

describe("EmergencyWorkflowCompatibilityReport", () => {
  it("runs workflow compatibility report", () => {
    const report = buildEmergencyWorkflowCompatibilityReport();
    expect(["PASS", "FAIL"]).toContain(report.decision);
    expect(report.workflows.length).toBeGreaterThan(0);
  });

  it("audits stroke workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "STROKE")).toBe(true);
  });

  it("audits STEMI/ACS workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "STEMI_ACS")).toBe(true);
  });

  it("audits sepsis workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "SEPSIS")).toBe(true);
  });

  it("audits DKA workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "DKA")).toBe(true);
  });

  it("audits asthma/COPD workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "ASTHMA_COPD")).toBe(true);
  });

  it("audits anaphylaxis workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "ANAPHYLAXIS")).toBe(true);
  });

  it("audits behavioral health workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "BEHAVIORAL_HEALTH")).toBe(true);
  });

  it("audits trauma workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "TRAUMA")).toBe(true);
  });

  it("audits RSI workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.groupId === "RSI")).toBe(true);
  });

  it("has at least one order-entry compatible ED workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.orderEntryCompatible)).toBe(true);
  });

  it("has at least one MAR-compatible ED workflow", () => {
    expect(buildEmergencyWorkflowCompatibilityReport().workflows.some((w) => w.marCompatible)).toBe(true);
  });

  it("preserves Tdap vaccine compatibility", () => {
    expect(buildEmergencyVaccineCompatibilityReport().tdapPresent).toBe(true);
  });

  it("preserves vaccine manufacturer, lot, expiration, VIS, CVX, and billing", () => {
    const report = buildEmergencyVaccineCompatibilityReport();
    expect(report.manufacturerSelection).toBe(true);
    expect(report.lotNumber).toBe(true);
    expect(report.expiration).toBe(true);
    expect(report.vis).toBe(true);
    expect(report.cvx).toBe(true);
    expect(report.billing).toBe(true);
  });
}
);
