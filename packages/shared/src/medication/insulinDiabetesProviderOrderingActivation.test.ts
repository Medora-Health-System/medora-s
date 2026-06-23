import { describe, expect, it } from "vitest";
import {
  buildDiabetesBillingInventoryReport,
  buildDiabetesClinicalSafetyReport,
  buildDiabetesHighRiskExclusionReport,
  buildDiabetesI18nCertificationReport,
  buildDiabetesMarActivationReport,
  buildDiabetesMedicationInventoryReport,
  buildDiabetesPharmacyWorkflowReport,
  buildDiabetesProviderOrderingEligibilityReport,
  buildDiabetesProviderSearchReport,
  buildDiabetesRollbackReport,
  buildInsulinDiabetesActivationBaselineReport,
  buildInsulinDiabetesProviderOrderingActivationRegistry,
  buildInsulinSafetyCertificationReport,
  isActiveInsulinDiabetesProviderOrderingMedication,
  listActiveInsulinDiabetesProviderOrderingCatalogCodes,
  rollbackInsulinDiabetesProviderOrderingActivation,
  runInsulinDiabetesProviderOrderingActivationReport,
  validateInsulinDiabetesProviderOrderPlacement,
} from "./insulinDiabetesProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.INSULIN_DIABETES_PROVIDER_ORDERING_ACTIVATION.1", () => {
  it("01 — inventory audits insulin and non-insulin diabetes medications", () => {
    const report = buildDiabetesMedicationInventoryReport();
    expect(report.auditedMedications).toContain("Regular insulin");
    expect(report.auditedMedications).toContain("Metformin");
    expect(report.auditedMedications).toContain("Tirzepatide");
    expect(report.totalRows).toBeGreaterThan(20);
  });

  it("02 — eligibility activates only fully ready rows", () => {
    const report = buildDiabetesProviderOrderingEligibilityReport();
    expect(report.eligibleCatalogCodes).toContain("INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE");
    expect(report.eligibleCatalogCodes).toContain("INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE");
    expect(report.eligibleCatalogCodes).toContain("SITAGLIPTIN_100_MG_COMPRIME_ORALE");
    expect(report.excludedRows.some((row) => row.blockers.includes("INSULIN_DRIP_EXCLUDED"))).toBe(true);
    expect(report.excludedRows.some((row) => row.orderabilityStatus === "MISSING")).toBe(true);
  });

  it("03 — provider ordering is active for eligible diabetes medications", () => {
    const code = listActiveInsulinDiabetesProviderOrderingCatalogCodes()[0]!;
    expect(isActiveInsulinDiabetesProviderOrderingMedication(code)).toBe(true);
    expect(validateInsulinDiabetesProviderOrderPlacement({ catalogCode: code }).allowed).toBe(true);
  });

  it("04 — insulin safety supports basal, bolus, and correction insulin", () => {
    const report = buildInsulinSafetyCertificationReport();
    expect(report.basalInsulinSupported).toBe(true);
    expect(report.bolusInsulinSupported).toBe(true);
    expect(report.correctionInsulinSupported).toBe(true);
    expect(report.insulinDripsActivated).toBe(false);
    expect(report.blockers).toEqual([]);
  });

  it("05 — diabetes safety warnings are advisory only", () => {
    const report = buildDiabetesClinicalSafetyReport();
    expect(report.hypoglycemiaWarnings).toBe("ADVISORY");
    expect(report.renalWarnings).toBe("ADVISORY");
    expect(report.weightVisibility).toBe("ADVISORY");
    expect(report.glucoseVisibility).toBe("ADVISORY");
    expect(report.lastA1cVisibility).toBe("ADVISORY");
    expect(report.blocksProviderOrdering).toBe(false);
  });

  it("06 — MAR scheduling is immediate", () => {
    const report = buildDiabetesMarActivationReport();
    expect(report.providerOrderPersistsImmediately).toBe(true);
    expect(report.schedulesImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalRequiredForScheduling).toBe(false);
  });

  it("07 — pharmacy visibility remains nonblocking", () => {
    const report = buildDiabetesPharmacyWorkflowReport();
    expect(report.pharmacyMayReview).toBe(true);
    expect(report.pharmacyMayClarify).toBe(true);
    expect(report.pharmacyMaySubstitute).toBe(true);
    expect(report.pharmacyMaySupply).toBe(true);
    expect(report.pharmacyMayMarkUnavailable).toBe(true);
    expect(report.pharmacyMayBlockOrdering).toBe(false);
  });

  it("08 — billing readiness passes for activated rows", () => {
    expect(buildDiabetesBillingInventoryReport().billingReady).toBe(true);
  });

  it("09 — inventory readiness passes for activated rows", () => {
    expect(buildDiabetesBillingInventoryReport().inventoryReady).toBe(true);
  });

  it("10 — rollback removes future search and ordering", () => {
    const registry = buildInsulinDiabetesProviderOrderingActivationRegistry();
    const first = registry.entries[0]!;
    const rolledBack = rollbackInsulinDiabetesProviderOrderingActivation({
      registry,
      catalogCode: first.catalogCode,
      reason: "test rollback",
    });
    expect(isActiveInsulinDiabetesProviderOrderingMedication(first.catalogCode, rolledBack)).toBe(false);
    expect(validateInsulinDiabetesProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed).toBe(false);
    expect(buildDiabetesRollbackReport().preservesAuditTrail).toBe(true);
  });

  it("11 — EN localization has no FR leakage", () => {
    const report = runInsulinDiabetesProviderOrderingActivationReport();
    expect(report.i18n.enLeakageCount).toBe(0);
    expect(report.i18n.enHasFrLeakage).toBe(false);
  });

  it("12 — FR localization has no EN leakage", () => {
    const report = runInsulinDiabetesProviderOrderingActivationReport();
    expect(report.i18n.frLeakageCount).toBe(0);
    expect(report.i18n.frHasEnLeakage).toBe(false);
  });

  it("13 — release gate certification is active", () => {
    const baseline = buildInsulinDiabetesActivationBaselineReport();
    const highRisk = buildDiabetesHighRiskExclusionReport();
    const search = buildDiabetesProviderSearchReport();
    const i18n = buildDiabetesI18nCertificationReport();
    const report = runInsulinDiabetesProviderOrderingActivationReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.anticoagulationActive).toBe(true);
    expect(highRisk.insulinDripsNotActivated).toBe(true);
    expect(search.duplicateRows).toBe(0);
    expect(i18n.decision).toBe("PASS");
    expect(report.finalDecision).toBe("INSULIN_DIABETES_PROVIDER_ORDERING_ACTIVE");
  });
});
