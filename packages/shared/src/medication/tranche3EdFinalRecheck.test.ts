import { describe, expect, it } from "vitest";
import {
  buildEdProviderOrderabilityAuditReport,
  buildEmergencyOperationalCertificationReport,
  buildFinalEdInventoryReport,
  buildFinalHighRiskExclusionCertificationReport,
  buildMedicationRoadmapRecommendationReport,
  buildSafeEdActivationRecalculationReport,
  buildTranche3FinalDecisionReport,
  buildTranche3FinalRecheckBaselineReport,
  runTranche3EdFinalRecheck,
} from "./tranche3EdFinalRecheck.js";

describe("MEDUI.MEDICATION.TRANCHE_3_ED_FINAL_RECHECK.1", () => {
  it("01 — Final ED inventory", () => {
    const report = buildFinalEdInventoryReport();
    expect(report.totalRows).toBeGreaterThan(40);
    expect(report.rows.every((row) => row.catalogCode)).toBe(true);
  });

  it("02 — Provider orderability audit", () => {
    const report = buildEdProviderOrderabilityAuditReport();
    expect(report.excludedMissingCatalogSupport).toBe(0);
    expect(report.counts.ALREADY_PROVIDER_ORDERABLE + report.counts.ACTIVATED_VIA_TRANCHE_1).toBeGreaterThan(0);
  });

  it("03 — Activation candidate recalculation", () => {
    const report = buildSafeEdActivationRecalculationReport();
    expect(report.candidateCount).toBe(report.SAFE_ED_ACTIVATION_CANDIDATES.length);
    expect(report.reasonNoCandidates).toBeTruthy();
  });

  it("04 — High-risk exclusion", () => {
    const report = buildFinalHighRiskExclusionCertificationReport();
    expect(report.thrombolyticsExcluded).toBe(true);
    expect(report.anticoagulantsExcluded).toBe(true);
    expect(report.pressorsExcluded).toBe(true);
    expect(report.paralyticsExcluded).toBe(true);
    expect(report.sedativesExcluded).toBe(true);
    expect(report.rsiMedicationsExcluded).toBe(true);
    expect(report.criticalCareDripsExcluded).toBe(true);
    expect(report.controlledSubstancesExcluded).toBe(true);
    expect(report.chemotherapyExcluded).toBe(true);
  });

  it("05 — Operational certification", () => {
    const report = buildEmergencyOperationalCertificationReport();
    expect(report.providerSearchSafety).toBe("PASS");
    expect(report.pharmacyVisibility).toBe("PASS");
    expect(["PASS", "PARTIAL"]).toContain(report.duplicateProtection);
  });

  it("06 — Decision engine", () => {
    const report = buildTranche3FinalDecisionReport();
    expect(report.EDCoveragePercent).toBe(100);
    expect(["NO_TRANCHE_3_NEEDED", "TRANCHE_3_PARTIAL_NEEDED", "TRANCHE_3_READY_FOR_SAFE_ACTIVATION"]).toContain(report.finalDecision);
    expect(report.justification.length).toBeGreaterThan(0);
  });

  it("07 — Roadmap recommendation", () => {
    const report = buildMedicationRoadmapRecommendationReport();
    expect(report.nextRecommendedPhase).toBe("Anticoagulation");
    expect(report.recommendations).toHaveLength(5);
  });

  it("08 — EN localization", () => {
    const baseline = buildTranche3FinalRecheckBaselineReport();
    expect(baseline.emergencyI18nCertificationReport).toBe("PASS");
  });

  it("09 — FR localization", () => {
    const inventory = buildFinalEdInventoryReport();
    expect(inventory.rows.every((row) => row.displayNameFr?.trim())).toBe(true);
  });

  it("10 — Release gate report preserves certification-only compatibility", () => {
    const report = runTranche3EdFinalRecheck();
    expect(report.baseline.behavioralHealthRemediation).toBe("PASS");
    expect(report.baseline.edCatalogGapRemediation).toBe("PASS");
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.providerExposureChanged).toBe(false);
    expect(report.compatibility.governanceRulesChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
