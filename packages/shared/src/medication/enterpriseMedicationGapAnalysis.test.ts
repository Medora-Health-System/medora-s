import { describe, expect, it, beforeEach } from "vitest";
import { prewarmProviderOrderableCatalogCodesRegistry } from "./providerOrderableCatalogCodesRegistry.js";
import {
  buildEnterpriseMedicationCoverageReport,
  buildEnterpriseMedicationGapReport,
  buildDuplicateMedicationReport,
  buildTop100HighestPriorityMissingMedicationReport,
  runEnterpriseMedicationGapAnalysisReport,
  resetEnterpriseMedicationGapAnalysisCaches,
} from "./enterpriseMedicationGapAnalysis.js";

describe("MEDUI.MEDICATION.ENTERPRISE_MEDICATION_GAP_ANALYSIS.1", () => {
  beforeEach(() => {
    resetEnterpriseMedicationGapAnalysisCaches();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("01 — coverage census reflects enterprise registry active count", () => {
    const report = buildEnterpriseMedicationCoverageReport();
    expect(report.totalMedicationCount).toBeGreaterThanOrEqual(600);
    expect(report.totalActiveProviderOrderableCount).toBeGreaterThanOrEqual(200);
    expect(report.domainActiveCounts.controlledSubstance).toBeGreaterThan(0);
  });

  it("02 — gap report classifies missing readiness without activation", () => {
    const report = buildEnterpriseMedicationGapReport();
    expect(report.totalMissingCount).toBeGreaterThan(0);
    expect(report.rows.some((row) => row.activationReadiness !== "READY_FOR_PROVIDER_ORDERING")).toBe(true);
  });

  it("03 — duplicate audit runs safely", () => {
    const report = buildDuplicateMedicationReport();
    expect(report.duplicateCatalogCodes).toBeGreaterThanOrEqual(0);
  });

  it("04 — top 100 missing medications ranked", () => {
    const report = buildTop100HighestPriorityMissingMedicationReport();
    expect(report.rows.length).toBeGreaterThan(0);
    expect(report.rows.length).toBeLessThanOrEqual(100);
  });

  it("05 — full expansion report completes audit", () => {
    const report = runEnterpriseMedicationGapAnalysisReport();
    expect(report.finalDecision).toBe("ENTERPRISE_MEDICATION_GAP_ANALYSIS_COMPLETE");
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.gap.totalMissingCount).toBeGreaterThan(0);
    expect(report.coverage.totalActiveProviderOrderableCount).toBeGreaterThanOrEqual(200);
  });
});
