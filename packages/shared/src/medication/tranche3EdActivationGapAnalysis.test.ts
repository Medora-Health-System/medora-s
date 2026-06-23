import { describe, expect, it } from "vitest";
import { buildEDActivationGapAnalysisReport } from "./tranche3EdActivationGapAnalysis.js";

describe("MEDUI.MEDICATION.TRANCHE_3_ED_ACTIVATION_GAP_ANALYSIS.1", () => {
  it("builds ED provider-orderable inventory for every audited ED row", () => {
    const report = buildEDActivationGapAnalysisReport();
    expect(report.ED_PROVIDER_ORDERABLE_INVENTORY.length).toBeGreaterThan(40);
    expect(report.ED_PROVIDER_ORDERABLE_INVENTORY.every((row) => row.workflowId && row.medication)).toBe(true);
  });

  it("explains why SAFE_ED_ACTIVATION_CANDIDATES is zero", () => {
    const report = buildEDActivationGapAnalysisReport();
    expect(report.safeEdActivationCandidateCount).toBe(0);
    expect(report.blockerSummary.length).toBeGreaterThan(0);
    expect(report.bucketCounts.MISSING_CATALOG_SUPPORT + report.bucketCounts.NOT_READY + report.bucketCounts.DUPLICATE_PROTECTED).toBeGreaterThan(0);
  });

  it("classifies provider-orderable rows separately from new Tranche 3 candidates", () => {
    const report = buildEDActivationGapAnalysisReport();
    expect(report.bucketCounts.ALREADY_PROVIDER_ORDERABLE).toBeGreaterThan(0);
    expect(report.ED_PROVIDER_ORDERABLE_INVENTORY.some((row) => row.activationSource === "ALREADY_PROVIDER_ORDERABLE")).toBe(true);
  });

  it("confirms ED catalog-support gaps are cleared after remediation", () => {
    const report = buildEDActivationGapAnalysisReport();
    expect(report.bucketCounts.MISSING_CATALOG_SUPPORT).toBe(0);
    expect(report.ED_PROVIDER_ORDERABLE_INVENTORY.some((row) => row.bucket === "MISSING_CATALOG_SUPPORT")).toBe(false);
  });

  it("keeps high-risk medications excluded", () => {
    const report = buildEDActivationGapAnalysisReport();
    expect(report.bucketCounts.HIGH_RISK_EXCLUDED).toBeGreaterThan(0);
    expect(report.ED_PROVIDER_ORDERABLE_INVENTORY.some((row) => row.exclusionReasonIfNotOrderable === "High-risk ED medication excluded")).toBe(true);
  });

  it("returns partial-needed decision when no safe candidates exist but catalog/not-ready gaps remain", () => {
    const report = buildEDActivationGapAnalysisReport();
    expect(report.finalDecision).toBe("TRANCHE_3_PARTIAL_NEEDED");
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.providerSearchChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
