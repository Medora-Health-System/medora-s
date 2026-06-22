import { describe, expect, it } from "vitest";
import {
  buildCriticalCareInfusionGovernanceReport,
  buildCriticalCareWorkflowCompatibilityReport,
} from "./criticalCareWorkflowCompatibility.js";

describe("CriticalCareWorkflowCompatibilityReport", () => {
  it("runs workflow compatibility report", () => {
    const report = buildCriticalCareWorkflowCompatibilityReport();
    expect(["PASS", "FAIL"]).toContain(report.decision);
    expect(report.workflows.length).toBe(10);
  });

  it("audits septic shock", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "SEPTIC_SHOCK")).toBe(true);
  });

  it("audits cardiogenic shock", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "CARDIOGENIC_SHOCK")).toBe(true);
  });

  it("audits neuro ICU", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "NEURO_ICU")).toBe(true);
  });

  it("audits mechanical ventilation", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "MECHANICAL_VENTILATION")).toBe(true);
  });

  it("audits RSI", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "RSI")).toBe(true);
  });

  it("audits post-intubation sedation", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "POST_INTUBATION_SEDATION")).toBe(true);
  });

  it("audits hyperkalemia", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "HYPERKALEMIA")).toBe(true);
  });

  it("audits DKA", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "DKA")).toBe(true);
  });

  it("audits hypertensive emergency", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "HYPERTENSIVE_EMERGENCY")).toBe(true);
  });

  it("audits atrial fibrillation RVR", () => {
    expect(buildCriticalCareWorkflowCompatibilityReport().workflows.some((w) => w.workflowId === "ATRIAL_FIBRILLATION_RVR")).toBe(true);
  });

  it("reports infusion governance rows", () => {
    expect(buildCriticalCareInfusionGovernanceReport().rows.length).toBeGreaterThan(20);
  });

  it("marks infusion-only rows as requiring start/stop governance", () => {
    expect(buildCriticalCareInfusionGovernanceReport().rows.some((row) => row.startStopRequired)).toBe(true);
  });

  it("requires route authority for governed ICU medications", () => {
    expect(buildCriticalCareInfusionGovernanceReport().rows.every((row) => row.routeAuthorityRequired)).toBe(true);
  });
});
