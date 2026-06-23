import { describe, expect, it } from "vitest";
import {
  buildInfectiousDiseaseBillingInventoryReport,
  buildInfectiousDiseaseCatalogRemediationReport,
  buildInfectiousDiseaseI18nCertificationReport,
  buildInfectiousDiseaseMedicationInventoryReport,
  buildInfectiousDiseaseProviderOrderingActivationReport,
  buildInfectiousDiseaseProviderOrderingEligibilityReport,
  buildInfectiousDiseaseProviderSearchSafetyReport,
  buildInfectiousDiseaseWorkflowCompatibilityReport,
  buildNeurologyBillingInventoryReport,
  buildNeurologyCatalogRemediationReport,
  buildNeurologyI18nCertificationReport,
  buildNeurologyInfectiousDiseaseBaselineReport,
  buildNeurologyInfectiousDiseaseHighRiskSafetyReport,
  buildNeurologyInfectiousDiseasePharmacyWorkflowReport,
  buildNeurologyInfectiousDiseaseRollbackReport,
  buildNeurologyMedicationInventoryReport,
  buildNeurologyProviderOrderingActivationReport,
  buildNeurologyProviderOrderingEligibilityReport,
  buildNeurologyProviderSearchSafetyReport,
  buildNeurologyWorkflowCompatibilityReport,
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
  resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches,
  runNeurologyInfectiousDiseaseProviderOrderingActivationReport,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.NEUROLOGY_AND_INFECTIOUS_DISEASE_PROVIDER_ORDERING_EXPANSION.1", () => {
  it("01 — neurology inventory audit includes catalog readiness fields", () => {
    const report = buildNeurologyMedicationInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(8);
    expect(report.rows.some((row) => row.medication === "Keppra IV" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Mannitol" && row.catalogCode)).toBe(true);
    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        catalogCode: expect.any(String),
        displayNameEn: expect.any(String),
        displayNameFr: expect.any(String),
        canonicalFamily: expect.any(String),
      })
    );
  });

  it("02 — infectious disease inventory audit includes antibiotics", () => {
    const report = buildInfectiousDiseaseMedicationInventoryReport();
    expect(report.rows.some((row) => row.medication === "Vancomycin IV" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Daptomycin" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Linezolid" && row.catalogCode)).toBe(true);
  });

  it("03 — catalog remediation adds missing neurology and ID rows", () => {
    const neurology = buildNeurologyCatalogRemediationReport();
    const infectiousDisease = buildInfectiousDiseaseCatalogRemediationReport();
    expect(neurology.rows.find((row) => row.medication === "Fosphenytoin")?.catalogPresent).toBe(true);
    expect(neurology.rows.find((row) => row.medication === "Lacosamide")?.catalogPresent).toBe(true);
    expect(infectiousDisease.rows.find((row) => row.medication === "Vancomycin PO")?.catalogPresent).toBe(true);
    expect(infectiousDisease.rows.every((row) => row.catalogPresent)).toBe(true);
  });

  it("04 — workflow compatibility audits neurology and infectious disease paths", () => {
    const neurology = buildNeurologyWorkflowCompatibilityReport();
    const infectiousDisease = buildInfectiousDiseaseWorkflowCompatibilityReport();
    expect(neurology.workflows.map((row) => row.workflow)).toContain("Status epilepticus");
    expect(infectiousDisease.workflows.map((row) => row.workflow)).toContain("Sepsis");
    expect(neurology.decision).not.toBe("FAIL");
    expect(infectiousDisease.decision).not.toBe("FAIL");
  });

  it("05 — provider ordering eligibility classifies ready and restricted meds", () => {
    const neurology = buildNeurologyProviderOrderingEligibilityReport();
    const infectiousDisease = buildInfectiousDiseaseProviderOrderingEligibilityReport();
    expect(neurology.readyForProviderOrdering).toEqual(expect.arrayContaining(["Keppra IV", "Keppra PO", "Mannitol"]));
    expect(neurology.restrictedSpecialtyReview).toEqual(expect.arrayContaining(["Fosphenytoin", "Dilantin IV"]));
    expect(infectiousDisease.readyForProviderOrdering).toEqual(
      expect.arrayContaining(["Vancomycin IV", "Cefepime", "Zosyn", "Meropenem", "Daptomycin", "Linezolid"])
    );
    expect(infectiousDisease.eligibleCatalogCodes.length).toBeGreaterThan(0);
  });

  it("06 — provider ordering activation enables certified catalog codes", () => {
    resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches();
    const neurology = buildNeurologyProviderOrderingActivationReport();
    const infectiousDisease = buildInfectiousDiseaseProviderOrderingActivationReport();
    expect(listActiveNeurologyProviderOrderingCatalogCodes().length).toBeGreaterThan(0);
    expect(listActiveInfectiousDiseaseProviderOrderingCatalogCodes().length).toBeGreaterThan(0);
    expect(neurology.orderPersistsImmediately).toBe(true);
    expect(neurology.appearsOnMarImmediately).toBe(true);
    expect(infectiousDisease.pharmacyApprovalNotRequired).toBe(true);
  });

  it("07 — pharmacy workflow remains nonblocking", () => {
    const report = buildNeurologyInfectiousDiseasePharmacyWorkflowReport();
    expect(report.pharmacyMayBlockOrdering).toBe(false);
    expect(report.pharmacyMayBlockMarScheduling).toBe(false);
    expect(report.pharmacyMayReview).toBe(true);
    expect(report.pharmacyFollowUpStatuses.length).toBeGreaterThan(0);
  });

  it("08 — neurology billing and inventory readiness is certified", () => {
    const report = buildNeurologyBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.inventoryReadyCount).toBeGreaterThan(0);
  });

  it("09 — infectious disease billing and inventory readiness is certified", () => {
    const report = buildInfectiousDiseaseBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.chargeMappingReadyCount).toBeGreaterThan(0);
  });

  it("10 — provider search safety passes for activated specialty rows", () => {
    const neurology = buildNeurologyProviderSearchSafetyReport();
    const infectiousDisease = buildInfectiousDiseaseProviderSearchSafetyReport();
    expect(neurology.decision).toBe("PASS");
    expect(infectiousDisease.codeLeakageProtection).toBe("PASS");
  });

  it("11 — rollback blocks future orders and preserves history", () => {
    const report = buildNeurologyInfectiousDiseaseRollbackReport();
    expect(report.removesFromFutureProviderSearch).toBe(true);
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesAuditTrail).toBe(true);
  });

  it("12 — EN localization has no French leakage for activated rows", () => {
    const neurology = buildNeurologyI18nCertificationReport();
    const infectiousDisease = buildInfectiousDiseaseI18nCertificationReport();
    expect(neurology.enLeakageCount).toBe(0);
    expect(infectiousDisease.enLeakageCount).toBe(0);
  });

  it("13 — FR localization has no English leakage for activated rows", () => {
    const neurology = buildNeurologyI18nCertificationReport();
    const infectiousDisease = buildInfectiousDiseaseI18nCertificationReport();
    expect(neurology.frLeakageCount).toBe(0);
    expect(infectiousDisease.frLeakageCount).toBe(0);
    expect(neurology.missingTranslations).toBe(0);
    expect(infectiousDisease.missingTranslations).toBe(0);
  });

  it("14 — release gate activates neurology and infectious disease provider ordering", () => {
    resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches();
    const baseline = buildNeurologyInfectiousDiseaseBaselineReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.criticalCareProviderOrderingActive).toBe(true);
    expect(baseline.oncologyGovernanceReady).toBe(true);

    const highRisk = buildNeurologyInfectiousDiseaseHighRiskSafetyReport();
    expect(highRisk.thrombolyticsNotActivated).toBe(true);
    expect(highRisk.chemotherapyNotActivated).toBe(true);
    expect(highRisk.controlledSubstancesNotActivated).toBe(true);

    const report = runNeurologyInfectiousDiseaseProviderOrderingActivationReport();
    expect(report.compatibility.pharmacyReviewNonBlocking).toBe(true);
    expect(report.compatibility.marBehaviorChanged).toBe(false);
    expect(["NEUROLOGY_AND_INFECTIOUS_DISEASE_ACTIVE", "READY_WITH_BLOCKERS"]).toContain(report.finalDecision);
    expect(listActiveInfectiousDiseaseProviderOrderingCatalogCodes()).toContain("DAPTOMYCIN_500_MG_POUDRE_INTRAVEINEUSE");
    expect(listActiveNeurologyProviderOrderingCatalogCodes()).toContain("MANNITOL_20_PERFUSION_INTRAVEINEUSE");
  });
});
