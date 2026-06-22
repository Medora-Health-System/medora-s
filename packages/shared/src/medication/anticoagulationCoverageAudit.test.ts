import { describe, expect, it } from "vitest";
import {
  ANTICOAGULATION_EXPECTATIONS,
  buildAnticoagulationCoverageAuditReport,
  buildAnticoagulationRepoReadinessReport,
  runAnticoagulationThrombolyticGovernanceCertification,
} from "./anticoagulationCoverageAudit.js";

describe("AnticoagulationCoverageAuditReport", () => {
  it("runs the anticoagulation/thrombolytic orchestrator", () => {
    expect(runAnticoagulationThrombolyticGovernanceCertification().ticket).toBe(
      "MEDUI.MEDICATION.ANTICOAGULATION_AND_THROMBOLYTIC_GOVERNANCE.1"
    );
  });

  it("reports repo readiness baseline", () => {
    const report = buildAnticoagulationRepoReadinessReport();
    expect(report.medicationMaturityBaseline).toBe(4.3);
    expect(report.governedActivationStatus).toBe(true);
    expect(report.duplicateProtectionStatus).toBe(true);
    expect(report.providerSearchCanonicalizationStatus).toBe(true);
  });

  it("audits all expected anticoagulation rows", () => {
    expect(buildAnticoagulationCoverageAuditReport().totalExpected).toBe(ANTICOAGULATION_EXPECTATIONS.length);
  });

  it("audits heparin infusion", () => {
    const row = buildAnticoagulationCoverageAuditReport().rows.find((r) => r.medication === "Heparin infusion");
    expect(row).toBeDefined();
    expect(row?.present).toBe(true);
  });

  it("audits heparin SQ", () => {
    expect(buildAnticoagulationCoverageAuditReport().rows.find((r) => r.medication === "Heparin SQ")?.present).toBe(true);
  });

  it("audits enoxaparin", () => {
    expect(buildAnticoagulationCoverageAuditReport().rows.find((r) => r.medication === "Enoxaparin")?.present).toBe(true);
  });

  it("audits oral anticoagulants", () => {
    const rows = buildAnticoagulationCoverageAuditReport().rows.filter((r) => r.groupId === "ORAL_ANTICOAGULANTS");
    expect(rows.length).toBe(5);
    expect(rows.some((r) => r.medication === "Warfarin")).toBe(true);
  });

  it("audits reversal agents", () => {
    const rows = buildAnticoagulationCoverageAuditReport().rows.filter((r) => r.groupId === "REVERSAL_AGENTS");
    expect(rows.length).toBe(5);
  });

  it("reports missing anticoagulation rows without creating catalog entries", () => {
    const report = buildAnticoagulationCoverageAuditReport();
    expect(report.presentCount + report.missingCount).toBe(report.totalExpected);
  });

  it("keeps anticoagulants restricted or governed", () => {
    expect(buildAnticoagulationCoverageAuditReport().restrictedCount).toBeGreaterThan(0);
  });

  it("reports MAR readiness evidence", () => {
    expect(buildAnticoagulationCoverageAuditReport().rows.some((r) => r.marReady)).toBe(true);
  });

  it("reports billing readiness evidence", () => {
    expect(buildAnticoagulationCoverageAuditReport().rows.some((r) => r.billingReady)).toBe(true);
  });

  it("reports inventory readiness evidence", () => {
    expect(buildAnticoagulationCoverageAuditReport().rows.some((r) => r.inventoryReady)).toBe(true);
  });
});
