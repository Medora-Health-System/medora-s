import { describe, expect, it } from "vitest";
import {
  buildCriticalCareCoverageAuditReport,
  buildCriticalCareRepoReadinessReport,
  CRITICAL_CARE_COVERAGE_GROUPS,
  runCriticalCareCertification,
} from "./criticalCareCoverageAudit.js";

describe("CriticalCareCoverageAuditReport", () => {
  it("runs the critical care certification orchestrator", () => {
    expect(runCriticalCareCertification().ticket).toBe("MEDUI.MEDICATION.CRITICAL_CARE_COVERAGE.1");
  });

  it("reports repo readiness surfaces", () => {
    const report = buildCriticalCareRepoReadinessReport();
    expect(report.medicationEngineMaturityBaseline).toBe(4.1);
    expect(report.governedActivationStatus).toBe(true);
    expect(report.canonicalFamilyStatus).toBe(true);
    expect(report.duplicateProtectionStatus).toBe(true);
  });

  it("audits all critical-care groups", () => {
    expect(Object.keys(buildCriticalCareCoverageAuditReport().byGroup)).toHaveLength(CRITICAL_CARE_COVERAGE_GROUPS.length);
  });

  it("audits vasopressors", () => {
    expect(buildCriticalCareCoverageAuditReport().byGroup.VASOPRESSORS.expected).toBe(5);
  });

  it("audits sedation", () => {
    expect(buildCriticalCareCoverageAuditReport().byGroup.SEDATION.expected).toBe(4);
  });

  it("audits analgesia", () => {
    expect(buildCriticalCareCoverageAuditReport().byGroup.ANALGESIA.expected).toBe(3);
  });

  it("audits paralytics", () => {
    expect(buildCriticalCareCoverageAuditReport().byGroup.PARALYTICS.expected).toBe(4);
  });

  it("audits RSI", () => {
    expect(buildCriticalCareCoverageAuditReport().byGroup.RSI.expected).toBe(4);
  });

  it("audits ICU infusions", () => {
    expect(buildCriticalCareCoverageAuditReport().byGroup.ICU_INFUSIONS.expected).toBe(7);
  });

  it("audits hyperkalemia", () => {
    expect(buildCriticalCareCoverageAuditReport().byGroup.HYPERKALEMIA.expected).toBe(5);
  });

  it("audits mechanical ventilation bundles", () => {
    expect(buildCriticalCareCoverageAuditReport().byGroup.MECHANICAL_VENTILATION.expected).toBe(3);
  });

  it("finds most expected ICU meds in catalog", () => {
    const report = buildCriticalCareCoverageAuditReport();
    expect(report.presentCount).toBeGreaterThan(25);
    expect(report.totalExpectedMedications).toBe(35);
  });

  it("reports missing medications without creating catalog rows", () => {
    const report = buildCriticalCareCoverageAuditReport();
    expect(report.missingCount).toBeGreaterThanOrEqual(0);
    expect(report.presentCount + report.missingCount).toBe(report.totalExpectedMedications);
  });
});
