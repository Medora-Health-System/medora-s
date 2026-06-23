import { describe, expect, it } from "vitest";
import {
  buildAmoxicillinClavulanateRemediationReport,
  buildEdGapRecertificationReport,
  buildEdHighRiskSafetyRegressionReport,
  buildPovidoneIodineRemediationReport,
  runEdCatalogGapRemediationCertification,
} from "./edCatalogGapRemediation.js";
import { buildEDActivationGapAnalysisReport } from "./tranche3EdActivationGapAnalysis.js";

describe("MEDUI.MEDICATION.TRANCHE_3_ED_CATALOG_GAP_REMEDIATION.1", () => {
  it("01 — Amoxicillin-Clavulanate catalog gap closed or documented", () => {
    const report = buildAmoxicillinClavulanateRemediationReport();
    expect(report.catalogSupportPresent).toBe(true);
    expect(report.catalogCode).toContain("AMOXICILLIN_CLAVULANIC_ACID");
  });

  it("02 — Povidone-Iodine catalog gap closed or documented", () => {
    const report = buildPovidoneIodineRemediationReport();
    expect(report.catalogSupportPresent).toBe(true);
    expect(report.catalogCode).toBe("POVIDONE_IODINE_10_SOLUTION_TOPICAL");
  });

  it("03 — Canonical family safety passes", () => {
    const report = runEdCatalogGapRemediationCertification();
    expect(report.amoxicillinClavulanate.canonicalFamily).toContain("amoxicillin");
    expect(report.povidoneIodine.canonicalFamily).toContain("povidone");
  });

  it("04 — Duplicate protection passes", () => {
    const report = buildPovidoneIodineRemediationReport();
    expect(["PASS", "REVIEW_REQUIRED"]).toContain(report.duplicateProtection);
  });

  it("05 — MAR readiness passes or documented", () => {
    const report = runEdCatalogGapRemediationCertification();
    expect(report.amoxicillinClavulanate.marCompatible || report.amoxicillinClavulanate.blockers.includes("MAR_NOT_READY")).toBe(true);
    expect(report.povidoneIodine.marCompatible || report.povidoneIodine.blockers.includes("MAR_NOT_READY")).toBe(true);
  });

  it("06 — Billing/inventory readiness passes or documented", () => {
    const report = runEdCatalogGapRemediationCertification();
    expect(report.amoxicillinClavulanate.billingReady || report.amoxicillinClavulanate.blockers.includes("BILLING_NOT_READY")).toBe(true);
    expect(report.povidoneIodine.inventoryReady || report.povidoneIodine.blockers.includes("INVENTORY_NOT_READY")).toBe(true);
  });

  it("07 — EN/FR labels pass", () => {
    const report = runEdCatalogGapRemediationCertification();
    expect(report.amoxicillinClavulanate.i18nReady).toBe(true);
    expect(report.povidoneIodine.i18nReady).toBe(true);
  });

  it("08 — ED gap analysis recalculates", () => {
    const report = buildEdGapRecertificationReport();
    expect(report.missingCatalogSupportCount).toBe(0);
    expect(buildEDActivationGapAnalysisReport().bucketCounts.MISSING_CATALOG_SUPPORT).toBe(0);
  });

  it("09 — High-risk exclusions remain", () => {
    const report = buildEdHighRiskSafetyRegressionReport();
    expect(Object.values(report).every(Boolean)).toBe(true);
  });

  it("10 — Release gate certification preserves no-runtime-change compatibility", () => {
    const report = runEdCatalogGapRemediationCertification();
    expect(report.finalDecision).toBe("ED_CATALOG_GAPS_CLEARED");
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.providerSearchChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
