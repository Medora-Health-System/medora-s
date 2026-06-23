import { describe, expect, it } from "vitest";
import {
  buildPediatricVaccineExclusionReport,
  buildVaccineActivationBaselineReport,
  buildVaccineBillingInventoryReport,
  buildVaccineInventoryReport,
  buildVaccinePharmacyWorkflowReport,
  buildVaccineProviderOrderingActivationRegistry,
  buildVaccineProviderOrderingActivationWorkflowReport,
  buildVaccineProviderOrderingEligibilityReport,
  buildVaccineProviderSearchReport,
  buildVaccineRollbackReport,
  buildVaccineSafetyCertificationReport,
  isActiveVaccineProviderOrderingMedication,
  listActiveVaccineProviderOrderingCatalogCodes,
  rollbackVaccineProviderOrderingActivation,
  runVaccineProviderOrderingActivationReport,
  validateVaccineProviderOrderPlacement,
} from "./vaccineProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.VACCINE_PROVIDER_ORDERING_ACTIVATION.1", () => {
  it("01 — vaccine inventory audits requested vaccines", () => {
    const report = buildVaccineInventoryReport();
    expect(report.auditedVaccines).toEqual([
      "tdap",
      "td",
      "influenza",
      "covid",
      "hepatitis_a",
      "hepatitis_b",
      "mmr",
      "varicella",
      "pneumococcal",
      "hpv",
      "meningococcal",
    ]);
    expect(report.eligibleRows).toBe(11);
  });

  it("02 — ordering eligibility activates only complete vaccine rows", () => {
    const report = buildVaccineProviderOrderingEligibilityReport();
    expect(report.eligibleCatalogCodes).toContain("TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR");
    expect(report.eligibleCatalogCodes).toContain("TD_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR");
    expect(report.excludedRows).toEqual([]);
  });

  it("03 — provider ordering is active for eligible vaccines", () => {
    const code = listActiveVaccineProviderOrderingCatalogCodes()[0]!;
    expect(isActiveVaccineProviderOrderingMedication(code)).toBe(true);
    expect(validateVaccineProviderOrderPlacement({ catalogCode: code }).allowed).toBe(true);
  });

  it("04 — MAR scheduling is immediate", () => {
    const report = buildVaccineProviderOrderingActivationWorkflowReport();
    expect(report.providerOrderPersistsImmediately).toBe(true);
    expect(report.schedulesImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalRequiredForScheduling).toBe(false);
  });

  it("05 — lot governance remains mandatory", () => {
    expect(buildVaccineSafetyCertificationReport().lotNumberRequired).toBe(true);
  });

  it("06 — manufacturer governance remains mandatory", () => {
    const report = buildVaccineSafetyCertificationReport();
    expect(report.manufacturerRequired).toBe(true);
    expect(buildVaccineActivationBaselineReport().vaccineCompletionCertification.readyCount).toBeGreaterThan(0);
  });

  it("07 — VIS governance remains mandatory", () => {
    const report = buildVaccineSafetyCertificationReport();
    expect(report.visDateRequired).toBe(true);
    expect(report.visRecipientRequired).toBe(true);
  });

  it("08 — billing and CVX are ready for activated rows", () => {
    const report = buildVaccineBillingInventoryReport();
    expect(report.cvxMappingReady).toBe(true);
    expect(report.ndcMappingReady).toBe(true);
    expect(report.billingReady).toBe(true);
  });

  it("09 — inventory is ready for activated rows", () => {
    expect(buildVaccineBillingInventoryReport().inventoryReady).toBe(true);
  });

  it("10 — provider search preserves vaccine identity", () => {
    const report = buildVaccineProviderSearchReport();
    expect(report.duplicateVaccineRows).toBe(0);
    expect(report.tdapTdConfusion).toBe(false);
    expect(report.catalogCodeLeakage).toBe(false);
    expect(report.canonicalDisplayPreserved).toBe(true);
  });

  it("11 — rollback removes future search and ordering", () => {
    const registry = buildVaccineProviderOrderingActivationRegistry();
    const first = registry.entries[0]!;
    const rolledBack = rollbackVaccineProviderOrderingActivation({
      registry,
      catalogCode: first.catalogCode,
      reason: "test rollback",
    });
    expect(isActiveVaccineProviderOrderingMedication(first.catalogCode, rolledBack)).toBe(false);
    expect(validateVaccineProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed).toBe(false);
    expect(buildVaccineRollbackReport().preservesAuditTrail).toBe(true);
  });

  it("12 — pediatric vaccine gaps remain excluded", () => {
    const report = buildPediatricVaccineExclusionReport();
    expect(report.dtapNotActivated).toBe(true);
    expect(report.ipvNotActivated).toBe(true);
    expect(report.hibNotActivated).toBe(true);
    expect(report.rotavirusNotActivated).toBe(true);
    expect(report.activatedIncompletePediatricCatalogCodes).toEqual([]);
  });

  it("13 — EN localization has no FR leakage", () => {
    const report = runVaccineProviderOrderingActivationReport();
    expect(report.i18n.enLeakageCount).toBe(0);
    expect(report.i18n.enHasFrLeakage).toBe(false);
    expect(report.i18n.tdapLabelPreserved).toBe(true);
  });

  it("14 — FR localization has no EN leakage", () => {
    const report = runVaccineProviderOrderingActivationReport();
    expect(report.i18n.frLeakageCount).toBe(0);
    expect(report.i18n.frHasEnLeakage).toBe(false);
    expect(report.i18n.tdLabelPreserved).toBe(true);
  });

  it("15 — release gate certification is active", () => {
    const baseline = buildVaccineActivationBaselineReport();
    const report = runVaccineProviderOrderingActivationReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.anticoagulationActive).toBe(true);
    expect(baseline.insulinDiabetesActive).toBe(true);
    expect(baseline.vaccineMarAdministrationHardening).toBe("PASS");
    expect(report.compatibility.vaccineDocumentationStillMandatory).toBe(true);
    expect(report.finalDecision).toBe("VACCINE_PROVIDER_ORDERING_ACTIVE");
  });

  it("16 — pharmacy visibility remains nonblocking", () => {
    const report = buildVaccinePharmacyWorkflowReport();
    expect(report.pharmacyMayReview).toBe(true);
    expect(report.pharmacyMayClarify).toBe(true);
    expect(report.pharmacyMaySubstitute).toBe(true);
    expect(report.pharmacyMaySupply).toBe(true);
    expect(report.pharmacyMayMarkUnavailable).toBe(true);
    expect(report.pharmacyMayBlockOrdering).toBe(false);
  });
});
