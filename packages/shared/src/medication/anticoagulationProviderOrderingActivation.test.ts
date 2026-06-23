import { describe, expect, it } from "vitest";
import {
  buildAnticoagulationActivationBaselineReport,
  buildAnticoagulationBillingInventoryReport,
  buildAnticoagulationClinicalSafetyReport,
  buildAnticoagulationInventoryReport,
  buildAnticoagulationMarActivationReport,
  buildAnticoagulationPharmacyWorkflowReport,
  buildAnticoagulationProviderOrderingActivationRegistry,
  buildAnticoagulationProviderOrderingEligibilityReport,
  buildAnticoagulationProviderSearchReport,
  buildAnticoagulationRollbackReport,
  buildAnticoagulationSafetyGateReport,
  buildThrombolyticExclusionCertificationReport,
  isActiveAnticoagulationProviderOrderingMedication,
  listActiveAnticoagulationProviderOrderingCatalogCodes,
  rollbackAnticoagulationProviderOrderingActivation,
  runAnticoagulationProviderOrderingActivationReport,
  validateAnticoagulationProviderOrderPlacement,
} from "./anticoagulationProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.ANTICOAGULATION_PROVIDER_ORDERING_ACTIVATION.1", () => {
  it("01 — inventory audits requested anticoagulants", () => {
    const report = buildAnticoagulationInventoryReport();
    expect(report.auditedMedications).toEqual(["Heparin", "Enoxaparin", "Warfarin", "Apixaban", "Rivaroxaban", "Dabigatran", "Edoxaban"]);
    expect(report.totalRows).toBeGreaterThanOrEqual(9);
  });

  it("02 — eligibility activates only fully ready rows", () => {
    const report = buildAnticoagulationProviderOrderingEligibilityReport();
    expect(report.eligibleCatalogCodes).toContain("WARFARIN_5_MG_COMPRIME_ORAL");
    expect(report.eligibleCatalogCodes).toContain("APIXABAN_5_MG_COMPRIME_ORAL");
    expect(report.excludedRows.some((row) => row.blockers.includes("DUPLICATE_OR_COLLISION_FINDING"))).toBe(true);
    expect(report.excludedRows.some((row) => row.blockers.includes("MAR_NOT_READY"))).toBe(true);
  });

  it("03 — provider ordering is active for eligible anticoagulants", () => {
    const code = listActiveAnticoagulationProviderOrderingCatalogCodes()[0]!;
    expect(isActiveAnticoagulationProviderOrderingMedication(code)).toBe(true);
    expect(validateAnticoagulationProviderOrderPlacement({ catalogCode: code }).allowed).toBe(true);
  });

  it("04 — MAR scheduling is immediate and nonblocking for pharmacy review", () => {
    const report = buildAnticoagulationMarActivationReport();
    expect(report.providerOrderPersistsImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalRequiredForScheduling).toBe(false);
  });

  it("05 — pharmacy visibility remains nonblocking", () => {
    const report = buildAnticoagulationPharmacyWorkflowReport();
    expect(report.pharmacyMayReview).toBe(true);
    expect(report.pharmacyMayClarify).toBe(true);
    expect(report.pharmacyMaySubstitute).toBe(true);
    expect(report.pharmacyMaySupply).toBe(true);
    expect(report.pharmacyMayMarkUnavailable).toBe(true);
    expect(report.pharmacyMayBlockProviderOrdering).toBe(false);
  });

  it("06 — billing readiness passes for activated rows", () => {
    expect(buildAnticoagulationBillingInventoryReport().billingReady).toBe(true);
  });

  it("07 — inventory readiness passes for activated rows", () => {
    expect(buildAnticoagulationBillingInventoryReport().inventoryReady).toBe(true);
  });

  it("08 — duplicate protection excludes collision rows", () => {
    const report = buildAnticoagulationInventoryReport();
    expect(report.rows.some((row) => row.duplicateSafe === false && row.orderabilityStatus === "EXCLUDED_WITH_BLOCKERS")).toBe(true);
  });

  it("09 — clinical safety advisories do not block provider ordering", () => {
    const report = buildAnticoagulationClinicalSafetyReport();
    expect(report.indicationSupport).toBe("ADVISORY");
    expect(report.bleedingRiskVisibility).toBe("ADVISORY");
    expect(report.inrVisibility).toBe("ADVISORY");
    expect(report.renalFunctionVisibility).toBe("ADVISORY");
    expect(report.weightVisibility).toBe("ADVISORY");
    expect(report.lastLabVisibility).toBe("ADVISORY");
    expect(report.blocksProviderOrdering).toBe(false);
  });

  it("10 — thrombolytics remain excluded", () => {
    const report = buildThrombolyticExclusionCertificationReport();
    expect(report.alteplaseNotActivated).toBe(true);
    expect(report.tenecteplaseNotActivated).toBe(true);
    expect(report.thrombolyticsNotActivated).toBe(true);
    expect(report.activatedThrombolyticCatalogCodes).toEqual([]);
  });

  it("11 — rollback removes future search and ordering", () => {
    const registry = buildAnticoagulationProviderOrderingActivationRegistry();
    const first = registry.entries[0]!;
    const rolledBack = rollbackAnticoagulationProviderOrderingActivation({
      registry,
      catalogCode: first.catalogCode,
      reason: "test rollback",
    });
    expect(isActiveAnticoagulationProviderOrderingMedication(first.catalogCode, rolledBack)).toBe(false);
    expect(validateAnticoagulationProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed).toBe(false);
    expect(buildAnticoagulationRollbackReport().preservesAuditTrail).toBe(true);
  });

  it("12 — EN localization has no FR leakage", () => {
    expect(runAnticoagulationProviderOrderingActivationReport().i18n.enLeakageCount).toBe(0);
    expect(runAnticoagulationProviderOrderingActivationReport().i18n.enHasFrLeakage).toBe(false);
  });

  it("13 — FR localization has no EN leakage", () => {
    expect(runAnticoagulationProviderOrderingActivationReport().i18n.frLeakageCount).toBe(0);
    expect(runAnticoagulationProviderOrderingActivationReport().i18n.frHasEnLeakage).toBe(false);
  });

  it("14 — release gate certification is active", () => {
    const baseline = buildAnticoagulationActivationBaselineReport();
    const search = buildAnticoagulationProviderSearchReport();
    const safety = buildAnticoagulationSafetyGateReport();
    const report = runAnticoagulationProviderOrderingActivationReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.edRemediationCompleted).toBe(true);
    expect(search.medicationCatalogServiceIncludesAnticoagulation).toBe(true);
    expect(Object.values(safety.eachHardStopBlocks).every(Boolean)).toBe(true);
    expect(report.finalDecision).toBe("ANTICOAGULATION_PROVIDER_ORDERING_ACTIVE");
  });
});
