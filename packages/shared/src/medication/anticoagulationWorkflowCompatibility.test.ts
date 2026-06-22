import { describe, expect, it } from "vitest";
import { buildAnticoagulationWorkflowCompatibilityReport } from "./anticoagulationWorkflowCompatibility.js";
import {
  buildAnticoagulationBillingCertificationReport,
  buildAnticoagulationI18nCertificationReport,
  buildAnticoagulationMarGovernanceReport,
  buildAnticoagulationMaturityProjectionReport,
} from "./anticoagulationCoverageAudit.js";

describe("AnticoagulationWorkflowCompatibilityReport", () => {
  it("audits anticoagulation workflows", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.length).toBe(7);
  });

  it("audits DVT workflow", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.some((w) => w.workflow === "DVT")).toBe(true);
  });

  it("audits PE workflow", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.some((w) => w.workflow === "PE")).toBe(true);
  });

  it("audits atrial fibrillation workflow", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.some((w) => w.workflow === "ATRIAL_FIBRILLATION")).toBe(true);
  });

  it("audits mechanical valve workflow", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.some((w) => w.workflow === "MECHANICAL_VALVE")).toBe(true);
  });

  it("audits stroke workflow", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.some((w) => w.workflow === "STROKE")).toBe(true);
  });

  it("audits STEMI workflow", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.some((w) => w.workflow === "STEMI")).toBe(true);
  });

  it("audits hypercoagulable states workflow", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.some((w) => w.workflow === "HYPERCOAGULABLE_STATES")).toBe(true);
  });

  it("requires monitoring for all workflows", () => {
    expect(buildAnticoagulationWorkflowCompatibilityReport().workflows.every((w) => w.monitoringRequired)).toBe(true);
  });

  it("audits MAR governance", () => {
    const report = buildAnticoagulationMarGovernanceReport();
    expect(report.infusionLifecycle).toBe(true);
    expect(report.startStopRequirements).toBe(true);
    expect(report.routeAuthority).toBe(true);
    expect(report.auditLogging).toBe(true);
  });

  it("audits billing certification", () => {
    const report = buildAnticoagulationBillingCertificationReport();
    expect(report.decision).toBe("PASS");
    expect(report.billingRowsAudited).toBeGreaterThan(0);
  });

  it("passes i18n certification", () => {
    const report = buildAnticoagulationI18nCertificationReport();
    expect(report.decision).toBe("PASS");
    expect(report.enLeakageCount).toBe(0);
    expect(report.frLeakageCount).toBe(0);
  });

  it("projects maturity from 4.3 to 4.4", () => {
    const report = buildAnticoagulationMaturityProjectionReport();
    expect(report.currentScore).toBe(4.3);
    expect(report.projectedAfterAnticoagulationThrombolytics).toBe(4.4);
  });

  it("projects vaccine completion to 4.5", () => {
    expect(buildAnticoagulationMaturityProjectionReport().projectedAfterVaccineCompletion).toBe(4.5);
  });
});
