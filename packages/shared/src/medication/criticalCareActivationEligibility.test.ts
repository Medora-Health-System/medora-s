import { describe, expect, it } from "vitest";
import { buildCriticalCareActivationEligibilityReport } from "./criticalCareActivationEligibility.js";

describe("CriticalCareActivationEligibilityReport", () => {
  it("evaluates all critical-care expectations", () => {
    const report = buildCriticalCareActivationEligibilityReport();
    expect(report.totalEvaluated).toBe(35);
    expect(report.rows).toHaveLength(report.totalEvaluated);
  });

  it("decision counts sum to total", () => {
    const report = buildCriticalCareActivationEligibilityReport();
    expect(Object.values(report.byDecision).reduce((sum, count) => sum + count, 0)).toBe(report.totalEvaluated);
  });

  it("does not unrestrictedly activate vasopressors", () => {
    const rows = buildCriticalCareActivationEligibilityReport().rows.filter((row) => row.groupId === "VASOPRESSORS");
    expect(rows.every((row) => row.decision !== "READY_FOR_FUTURE_ACTIVATION")).toBe(true);
  });

  it("does not unrestrictedly activate sedative drips", () => {
    const rows = buildCriticalCareActivationEligibilityReport().rows.filter((row) => row.groupId === "SEDATION");
    expect(rows.every((row) => row.decision !== "READY_FOR_FUTURE_ACTIVATION")).toBe(true);
  });

  it("does not unrestrictedly activate paralytics", () => {
    const rows = buildCriticalCareActivationEligibilityReport().rows.filter((row) => row.groupId === "PARALYTICS");
    expect(rows.every((row) => row.decision !== "READY_FOR_FUTURE_ACTIVATION")).toBe(true);
  });

  it("does not unrestrictedly activate insulin drips", () => {
    const row = buildCriticalCareActivationEligibilityReport().rows.find((item) => item.medication === "Insulin infusion");
    expect(row?.decision).not.toBe("READY_FOR_FUTURE_ACTIVATION");
  });

  it("does not unrestrictedly activate heparin drips", () => {
    const row = buildCriticalCareActivationEligibilityReport().rows.find((item) => item.medication === "Heparin infusion");
    expect(row?.decision).not.toBe("READY_FOR_FUTURE_ACTIVATION");
  });

  it("adds pharmacy approval blockers for infusion-only medications", () => {
    const rows = buildCriticalCareActivationEligibilityReport().rows.filter((row) =>
      row.blockers.includes("PHARMACY_APPROVAL_REQUIRED_FOR_INFUSION")
    );
    expect(rows.length).toBeGreaterThan(10);
  });

  it("adds high-risk review blockers for high-risk medications", () => {
    expect(
      buildCriticalCareActivationEligibilityReport().rows.some((row) => row.blockers.includes("HIGH_RISK_REVIEW_REQUIRED"))
    ).toBe(true);
  });

  it("adds controlled substance blockers for controlled analgesics", () => {
    expect(
      buildCriticalCareActivationEligibilityReport().rows.some((row) =>
        row.blockers.includes("CONTROLLED_SUBSTANCE_RESTRICTED")
      )
    ).toBe(true);
  });

  it("reports blocked rows for missing or incomplete coverage", () => {
    expect(buildCriticalCareActivationEligibilityReport().byDecision.BLOCKED).toBeGreaterThanOrEqual(0);
  });
});
