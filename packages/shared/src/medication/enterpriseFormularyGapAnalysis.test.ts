import { beforeAll, describe, expect, it } from "vitest";
import {
  buildEnterpriseDomainCoverageReport,
  buildEnterpriseFormularyBaselineReport,
  buildEnterpriseFormularyRoadmapReport,
  buildEnterpriseMedicationInventoryReport,
  buildFormularyCompletenessProjectionReport,
  buildHospitalWorkflowCoverageReport,
  buildSpecialtyMedicationGapReport,
  buildTopMissingMedicationReport,
  resetEnterpriseFormularyGapAnalysisCaches,
  runEnterpriseFormularyGapAnalysisReport,
} from "./enterpriseFormularyGapAnalysis.js";
import { prewarmProviderOrderableCatalogCodesRegistry } from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDICATION.ENTERPRISE_FORMULARY_GAP_ANALYSIS.1", () => {
  beforeAll(() => {
    resetEnterpriseFormularyGapAnalysisCaches();
    prewarmProviderOrderableCatalogCodesRegistry();
  });
  it("01 — catalog inventory includes full audit fields and totals", () => {
    const report = buildEnterpriseMedicationInventoryReport();
    expect(report.totalCatalogRows).toBeGreaterThanOrEqual(600);
    expect(report.totalCanonicalFamilies).toBeGreaterThan(300);
    expect(report.totalProviderOrderableRows).toBeGreaterThan(0);
    expect(report.totalActivatedRows + report.totalInactiveRows).toBe(report.totalCatalogRows);
    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        catalogCode: expect.any(String),
        displayNameEn: expect.any(String),
        displayNameFr: expect.any(String),
        canonicalFamily: expect.any(String),
        route: expect.any(String),
        form: expect.any(String),
        activationSource: expect.any(String),
        providerOrderable: expect.any(Boolean),
        MARReady: expect.any(Boolean),
        BillingReady: expect.any(Boolean),
        InventoryReady: expect.any(Boolean),
      })
    );
  });

  it("02 — domain coverage audits all requested major care settings", () => {
    const report = buildEnterpriseDomainCoverageReport();
    expect(report.rows).toHaveLength(20);
    expect(report.rows.map((row) => row.domain)).toContain("Emergency Department");
    expect(report.rows.map((row) => row.domain)).toContain("ICU / Critical Care");
    expect(report.rows.map((row) => row.domain)).toContain("Oncology");
    expect(report.rows.every((row) => row.coveragePercent >= 0 && row.coveragePercent <= 100)).toBe(true);
  });

  it("03 — workflow coverage audits hospital workflows", () => {
    const report = buildHospitalWorkflowCoverageReport();
    expect(report.rows).toHaveLength(19);
    expect(report.rows.map((row) => row.workflow)).toContain("Sepsis");
    expect(report.rows.map((row) => row.workflow)).toContain("Pediatric Respiratory Distress");
    expect(report.rows.every((row) => row.readinessPercent >= 0 && row.readinessPercent <= 100)).toBe(true);
  });

  it("04 — specialty gap analysis includes the requested specialty medications", () => {
    const report = buildSpecialtyMedicationGapReport();
    expect(report.rows.some((row) => row.specialty === "Neurology" && row.medication === "Keppra IV")).toBe(true);
    expect(report.rows.some((row) => row.specialty === "Infectious Disease" && row.medication === "Linezolid")).toBe(true);
    expect(report.rows.some((row) => row.specialty === "Pediatrics" && row.medication === "Rotavirus")).toBe(true);
    expect(report.rows.some((row) => row.gapType !== "NONE")).toBe(true);
  });

  it("05 — missing medication ranking is scored and capped at the top 200", () => {
    const report = buildTopMissingMedicationReport();
    expect(report.targetCount).toBe(200);
    expect(report.rows.length).toBeGreaterThan(0);
    expect(report.rows.length).toBeLessThanOrEqual(200);
    expect(report.rows[0]?.rank).toBe(1);
    expect(report.rows.every((row, index) => row.rank === index + 1)).toBe(true);
    expect(report.rows.some((row) => row.catalogGap || row.activationGap || row.MARGap || row.billingGap || row.inventoryGap)).toBe(true);
  });

  it("06 — completeness projection advances toward enterprise range", () => {
    const report = buildFormularyCompletenessProjectionReport();
    expect(report.currentCompletenessScore).toBeGreaterThan(0);
    expect(report.projectedAfterNeurologyExpansion).toBeGreaterThan(report.currentCompletenessScore);
    expect(report.projectedAfterThrombolyticGovernance).toBeGreaterThan(report.projectedAfterControlledSubstanceGovernance);
    expect(report.targetEnterpriseMedicationRange).toBe("600-1000+");
  });

  it("07 — roadmap returns the top 10 ranked phases", () => {
    const report = buildEnterpriseFormularyRoadmapReport();
    expect(report.rows).toHaveLength(10);
    expect(report.rows.every((row, index) => row.rank === index + 1)).toBe(true);
    expect(report.rows.some((row) => row.phase.includes("Infectious Disease"))).toBe(true);
    expect(report.rows.some((row) => row.phase.includes("Pediatrics"))).toBe(true);
  });

  it("08 — EN localization has no French leakage", () => {
    const report = runEnterpriseFormularyGapAnalysisReport();
    expect(report.i18nCertification.enLeakageCount).toBe(0);
  });

  it("09 — FR localization has no English leakage", () => {
    const report = runEnterpriseFormularyGapAnalysisReport();
    expect(report.i18nCertification.frLeakageCount).toBe(0);
    expect(report.i18nCertification.missingTranslations).toBe(0);
  });

  it("10 — release gate is audit-only and identifies enterprise gaps", () => {
    const baseline = buildEnterpriseFormularyBaselineReport();
    const report = runEnterpriseFormularyGapAnalysisReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.anticoagulationActive).toBe(true);
    expect(baseline.insulinDiabetesActive).toBe(true);
    expect(baseline.vaccineProviderOrderingActive).toBe(true);
    expect(report.compatibility).toEqual({
      activationChanged: false,
      providerSearchChanged: false,
      orderabilityChanged: false,
      marBehaviorChanged: false,
      billingChanged: false,
      inventoryChanged: false,
      migrationsRequired: false,
    });
    expect(report.finalDecision).toBe("ENTERPRISE_FORMULARY_PARTIAL");
  });
});
