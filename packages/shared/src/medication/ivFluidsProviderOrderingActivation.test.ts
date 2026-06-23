import { describe, expect, it, beforeEach } from "vitest";
import {
  buildIvFluidBillingInventoryReport,
  buildIvFluidCatalogRemediationReport,
  buildIvFluidHighRiskSafetyReport,
  buildIvFluidI18nCertificationReport,
  buildIvFluidInventoryReport,
  buildIvFluidMarInfusionGovernanceReport,
  buildIvFluidOrderingWorkflowReport,
  buildIvFluidPediatricSafetyReport,
  buildIvFluidProviderOrderingActivationReport,
  buildIvFluidProviderSearchSafetyReport,
  buildIvFluidsBaselineReport,
  listActiveIvFluidsProviderOrderingCatalogCodes,
  resetIvFluidsProviderOrderingActivationCaches,
  runIvFluidsProviderOrderingExpansionReport,
} from "./ivFluidsProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.IV_FLUIDS_PROVIDER_ORDERING_EXPANSION.1", () => {
  beforeEach(() => {
    resetIvFluidsProviderOrderingActivationCaches();
  });

  it("01 — IV fluid inventory includes NS, D5W, LR, and half-normal fluids", () => {
    const report = buildIvFluidInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(16);
    expect(report.rows.some((row) => row.medication === "NS 0.9% 1000 mL" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "D5W 1000 mL" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "LR 1000 mL" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "0.45% NS 500 mL" && row.catalogCode)).toBe(true);
  });

  it("02 — catalog remediation adds missing crystalloid rows", () => {
    const report = buildIvFluidCatalogRemediationReport();
    expect(report.rows.every((row) => row.catalogPresent || row.catalogCode === "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS")).toBe(true);
    expect(report.additiveProtocolSupported).toBe(true);
  });

  it("03 — bolus order workflow is supported", () => {
    const report = buildIvFluidOrderingWorkflowReport();
    expect(report.bolusOrderSupported).toBe(true);
    expect(report.oneTimeAdministrationSupported).toBe(true);
  });

  it("04 — continuous infusion order workflow is supported", () => {
    const report = buildIvFluidOrderingWorkflowReport();
    expect(report.continuousInfusionSupported).toBe(true);
    expect(report.maintenanceFluidSupported).toBe(true);
    expect(report.rateBasedInfusionSupported).toBe(true);
    expect(report.volumeBasedInfusionSupported).toBe(true);
  });

  it("05 — maintenance fluid order fields are documented", () => {
    const report = buildIvFluidOrderingWorkflowReport();
    expect(report.requiredFields).toEqual(
      expect.arrayContaining(["fluid", "volume", "route", "rate", "duration", "frequency", "indication", "startTime"])
    );
  });

  it("06 — MAR schedules immediately for IV fluids", () => {
    const report = buildIvFluidMarInfusionGovernanceReport();
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.decision).toBe("PASS");
  });

  it("07 — infusion start/stop governance preserved for continuous fluids", () => {
    const report = buildIvFluidMarInfusionGovernanceReport();
    expect(report.infusionStartStopSupported).toBe(true);
    expect(report.directMarBypassForContinuousInfusion).toBe(false);
    expect(report.rateDocumentationSupported).toBe(true);
    expect(report.volumeInfusedSupported).toBe(true);
  });

  it("08 — billing and inventory readiness covers activated fluids", () => {
    const report = buildIvFluidBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.inventoryReadyCount).toBeGreaterThan(0);
    expect(report.duplicateNdcConflicts).toBe(0);
  });

  it("09 — pediatric safety warnings remain advisory only", () => {
    const report = buildIvFluidPediatricSafetyReport();
    expect(report.blocksProviderOrdering).toBe(false);
    expect(report.weightBasedMaintenanceFluidAdvisory).toBe("ADVISORY");
    expect(report.potassiumAdditiveWarningAdvisory).toBe("ADVISORY");
  });

  it("10 — high-risk fluids are not activated", () => {
    const report = buildIvFluidHighRiskSafetyReport();
    expect(report.d10GovernancePreserved).toBe(true);
    expect(report.hypertonicSalineGovernancePreserved).toBe(true);
    expect(report.activatedHighRiskFluidCodes).toEqual([]);
  });

  it("11 — provider search duplicate protection passes", () => {
    const report = buildIvFluidProviderSearchSafetyReport();
    expect(report.duplicateRows).toBe(0);
    expect(report.catalogCodeLeakage).toBe(false);
    expect(report.decision).toBe("PASS");
  });

  it("12 — EN/FR i18n certification passes for activated fluids", () => {
    const report = buildIvFluidI18nCertificationReport();
    expect(report.enLeakageCount).toBe(0);
    expect(report.frLeakageCount).toBe(0);
    expect(report.missingTranslations).toBe(0);
    expect(report.decision).toBe("PASS");
  });

  it("13 — release gate activates IV fluids provider ordering", () => {
    const baseline = buildIvFluidsBaselineReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.ivpbWorkflowHardeningPass).toBe(true);

    const activation = buildIvFluidProviderOrderingActivationReport();
    expect(activation.activatedCatalogCodes.length).toBeGreaterThan(0);
    expect(activation.orderPersistsImmediately).toBe(true);
    expect(activation.appearsOnMarImmediately).toBe(true);
    expect(activation.pharmacyApprovalNotRequired).toBe(true);

    const report = runIvFluidsProviderOrderingExpansionReport();
    expect(listActiveIvFluidsProviderOrderingCatalogCodes().length).toBeGreaterThan(0);
    expect(report.finalDecision).toBe("IV_FLUIDS_PROVIDER_ORDERING_ACTIVE");
  });
});
