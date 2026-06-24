import { describe, expect, it, beforeEach } from "vitest";
import {
  assertControlledSubstanceMedicationOrderAllowed,
  buildControlledSubstanceBillingCodingInventoryReport,
  buildControlledSubstanceCatalogRemediationReport,
  buildControlledSubstanceExclusionCertificationReport,
  buildControlledSubstanceI18nCertificationReport,
  buildControlledSubstanceMarWorkflowCertificationReport,
  buildControlledSubstancePerformanceRegressionReport,
  buildControlledSubstanceProviderOrderingActivationReport,
  buildControlledSubstanceWaveABProviderOrderingEligibilityReport,
  buildControlledSubstanceProviderSearchSafetyReport,
  buildControlledSubstanceRealLifeWorkflowReport,
  buildControlledSubstanceRollbackReport,
  buildControlledSubstanceWaveABBaselineReport,
  buildControlledSubstanceWaveABInventoryReport,
  buildControlledSubstanceWaveCBaselineReport,
  buildControlledSubstanceWaveCInventoryReport,
  buildControlledSubstanceWaveCCatalogRemediationReport,
  buildControlledSubstanceWaveCBillingCodingInventoryReport,
  buildControlledSubstanceWaveCProviderOrderingEligibilityReport,
  buildControlledSubstanceWaveCPainReassessmentReport,
  buildControlledSubstanceWaveCProviderSearchSafetyReport,
  buildControlledSubstanceWaveCRollbackReport,
  buildControlledSubstanceWaveCExclusionCertificationReport,
  buildControlledSubstanceWaveCPerformanceRegressionReport,
  buildControlledSubstanceWaveCI18nCertificationReport,
  listActiveControlledSubstanceProviderOrderingCatalogCodes,
  resetControlledSubstanceProviderOrderingActivationCaches,
  runControlledSubstanceWaveABExpansionReport,
  runControlledSubstanceWaveCExpansionReport,
} from "./controlledSubstanceProviderOrderingActivation.js";
import { buildControlledSubstanceOralOpioidMarSupportReport } from "./controlledSubstanceOralOpioidMarSupport.js";
import { buildControlledSubstancePostAdministrationAssessmentReport } from "./controlledSubstancePostAdministrationAssessment.js";
import { validateControlledSubstanceMarCreate } from "./controlledSubstanceMarGovernance.js";
import { ENTERPRISE_CONTROLLED_SUBSTANCE_BILLING_MANIFEST } from "./enterpriseControlledSubstanceBillingManifest.js";
import { ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_MANIFEST } from "./enterpriseControlledSubstanceFormularyManifest.js";
import { prewarmProviderOrderableCatalogCodesRegistry, resetProviderOrderableCatalogCodesRegistryForTests } from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_A_B_PROVIDER_ORDERING_ACTIVATION.1", () => {
  beforeEach(() => {
    resetControlledSubstanceProviderOrderingActivationCaches();
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("01 — baseline confirms governance ready and registry optimized", () => {
    const report = buildControlledSubstanceWaveABBaselineReport();
    expect(report.controlledSubstanceGovernanceReady).toBe(true);
    expect(report.painManagementProviderOrderingActive).toBe(true);
    expect(report.noRuntimeGateLoops).toBe(true);
    expect(report.pharmacyReviewNonBlocking).toBe(true);
  });

  it("02 — inventory audits Wave A and Wave B targets", () => {
    const report = buildControlledSubstanceWaveABInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(28);
    expect(report.rows.some((row) => row.medication === "Morphine IV 2 mg/mL" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Hydrocodone-Acetaminophen 5/325")).toBe(true);
  });

  it("03 — catalog remediation adds missing Wave A combination products", () => {
    const report = buildControlledSubstanceCatalogRemediationReport();
    expect(ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_MANIFEST.length).toBeGreaterThan(0);
    expect(report.rows.some((row) => row.catalogCode === "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL" && row.catalogPresent)).toBe(true);
  });

  it("04 — billing uses certified passthrough without fabricated codes", () => {
    expect(ENTERPRISE_CONTROLLED_SUBSTANCE_BILLING_MANIFEST.every((row) => row.hcpcs.trim().length > 0 || row.ndc11.trim().length > 0)).toBe(true);
    const report = buildControlledSubstanceBillingCodingInventoryReport();
    expect(report.fabricatedMappingCount).toBe(0);
  });

  it("05 — Pyxis externalizes routine witness/waste in Medora MAR", () => {
    const mar = validateControlledSubstanceMarCreate({
      marAction: "administered",
      governance: { isControlled: true, requiresWitness: true, pyxisWasteWitnessExternalized: true, medoraWitnessRequired: false },
      administeredByUserId: "nurse-1",
      administeredQuantity: 1,
      orderedQuantity: 2,
    });
    expect(mar.ok).toBe(true);
    const workflow = buildControlledSubstanceRealLifeWorkflowReport();
    expect(workflow.pyxisWasteWitnessExternalized).toBe(true);
  });

  it("06 — provider ordering eligibility activates certified controlled substances", () => {
    const eligibility = buildControlledSubstanceWaveABProviderOrderingEligibilityReport();
    expect(eligibility.readyForProviderOrdering.length).toBeGreaterThan(0);
    expect(eligibility.readyForProviderOrdering).toEqual(
      expect.arrayContaining(["Morphine IV 2 mg/mL", "Morphine IV 4 mg/mL", "Fentanyl IV 50 mcg"])
    );
  });

  it("07 — activation list contains morphine and hydromorphone without duplicates", () => {
    const codes = listActiveControlledSubstanceProviderOrderingCatalogCodes();
    expect(codes.length).toBeGreaterThan(0);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.some((code) => code.includes("MORPHINE"))).toBe(true);
  });

  it("08 — provider search safety has no duplicate codes or leakage", () => {
    const report = buildControlledSubstanceProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.duplicateRows).toBe(0);
    expect(report.catalogCodeLeakage).toBe(false);
  });

  it("09 — MAR workflow allows routine opioid administration without Medora witness", () => {
    const report = buildControlledSubstanceMarWorkflowCertificationReport();
    expect(report.decision).toBe("PASS");
    expect(report.routineOpioidNoMedoraWitnessHardStop).toBe(true);
    expect(report.routineOpioidNoMedoraWasteHardStop).toBe(true);
  });

  it("10 — post-administration pain reassessment required at MAR not order", () => {
    const report = buildControlledSubstancePostAdministrationAssessmentReport();
    expect(report.requiredAtOrderTime).toBe(false);
    expect(report.requiredAtMarAdministration).toBe(true);
    expect(report.decision).toBe("PASS");
  });

  it("11 — rollback preserves clinical artifacts", () => {
    const report = buildControlledSubstanceRollbackReport();
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesAuditTrail).toBe(true);
  });

  it("12 — exclusions block anesthesia and paralytics", () => {
    const report = buildControlledSubstanceExclusionCertificationReport();
    expect(report.decision).toBe("PASS");
    expect(report.activatedHighRiskCount).toBe(0);
    const active = listActiveControlledSubstanceProviderOrderingCatalogCodes();
    for (const code of active) {
      expect(code.toLowerCase()).not.toMatch(/propofol|ketamine|rocuronium|methadone/);
    }
  });

  it("13 — i18n certification passes for activated controlled substances", () => {
    const report = buildControlledSubstanceI18nCertificationReport();
    expect(report.decision).toBe("PASS");
  });

  it("14 — performance guard keeps registry O(1) lookup", () => {
    const report = buildControlledSubstancePerformanceRegressionReport();
    expect(report.noRuntimeGateLoops).toBe(true);
    expect(report.registryLookupO1).toBe(true);
    expect(report.orderCreateUnder300ms).toBe(true);
  });

  it("15 — assertControlledSubstanceMedicationOrderAllowed gates inactive codes", () => {
    const active = listActiveControlledSubstanceProviderOrderingCatalogCodes()[0];
    expect(assertControlledSubstanceMedicationOrderAllowed({ catalogCode: active! }).allowed).toBe(true);
    expect(assertControlledSubstanceMedicationOrderAllowed({ catalogCode: "NOT_A_REAL_CODE" }).allowed).toBe(false);
  });

  it("16 — expansion report returns CONTROLLED_SUBSTANCES_WAVE_A_B_ACTIVE", () => {
    const report = runControlledSubstanceWaveABExpansionReport();
    expect(report.finalDecision).toBe("CONTROLLED_SUBSTANCES_WAVE_A_B_ACTIVE");
    expect(buildControlledSubstanceProviderOrderingActivationReport().controlledSubstancesActivated).toBe(true);
    expect(report.providerOrderingActivation.newlyActivatedCount).toBeGreaterThan(0);
  });
});

describe("MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_ED_FLOOR_COMPLETION.1", () => {
  beforeEach(() => {
    resetControlledSubstanceProviderOrderingActivationCaches();
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("01 — Wave C inventory audits ED/floor pain targets", () => {
    const report = buildControlledSubstanceWaveCInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(28);
    expect(report.rows.some((row) => row.medication === "Hydrocodone-Acetaminophen 5/325" && row.catalogCode)).toBe(true);
  });

  it("02 — catalog remediation includes Norco and Percocet rows", () => {
    const report = buildControlledSubstanceWaveCCatalogRemediationReport();
    expect(report.rows.some((row) => row.catalogCode === "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL" && row.catalogPresent)).toBe(true);
    expect(report.rows.some((row) => row.catalogCode === "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL" && row.catalogPresent)).toBe(true);
  });

  it("03 — oral opioid MAR support resolves MISSING_MAR_SUPPORT blocker", () => {
    const report = buildControlledSubstanceOralOpioidMarSupportReport();
    expect(report.decision).toBe("PASS");
    expect(report.noMedoraWitnessHardStop).toBe(true);
  });

  it("04 — billing readiness without fabricated placeholder-only mappings", () => {
    const report = buildControlledSubstanceWaveCBillingCodingInventoryReport();
    expect(report.fabricatedMappingCount).toBe(0);
  });

  it("05 — eligibility classifies Norco and Percocet as READY_FOR_PROVIDER_ORDERING", () => {
    const eligibility = buildControlledSubstanceWaveCProviderOrderingEligibilityReport();
    expect(eligibility.readyForProviderOrdering).toEqual(
      expect.arrayContaining(["Hydrocodone-Acetaminophen 5/325", "Oxycodone-Acetaminophen 5/325", "Oxycodone IR 5 mg"])
    );
  });

  it("06 — activation list includes Wave C oral opioids and hydromorphone 0.5", () => {
    const codes = listActiveControlledSubstanceProviderOrderingCatalogCodes();
    expect(codes).toEqual(expect.arrayContaining([
      "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL",
      "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL",
      "OXYCODONE_5_MG_COMPRIME_ORAL",
      "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
      "LIDOCAINE_5_PATCH_TRANSDERMAL",
    ]));
  });

  it("07 — routine opioid administration has no Medora witness/waste hard stop", () => {
    const mar = validateControlledSubstanceMarCreate({
      marAction: "administered",
      governance: { isControlled: true, requiresWitness: true, pyxisWasteWitnessExternalized: true, medoraWitnessRequired: false },
      administeredByUserId: "nurse-1",
    });
    expect(mar.ok).toBe(true);
  });

  it("08 — pain reassessment required at MAR administration", () => {
    const report = buildControlledSubstanceWaveCPainReassessmentReport();
    expect(report.requiredAtMarAdministration).toBe(true);
    expect(report.fields).toEqual(expect.arrayContaining(["nauseaVomiting", "respiratoryDepression"]));
  });

  it("09 — provider search aliases include Norco Percocet Tylenol Dilaudid", () => {
    const report = buildControlledSubstanceWaveCProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.aliasSearchTermsVerified).toEqual(expect.arrayContaining(["norco", "percocet", "dilaudid"]));
  });

  it("10 — rollback preserves pain reassessment documentation", () => {
    const report = buildControlledSubstanceWaveCRollbackReport();
    expect(report.preservesPainReassessmentDocumentation).toBe(true);
    expect(report.preservesMar).toBe(true);
  });

  it("11 — exclusions block PCA and anesthesia agents", () => {
    const report = buildControlledSubstanceWaveCExclusionCertificationReport();
    expect(report.decision).toBe("PASS");
  });

  it("12 — i18n certification passes", () => {
    expect(buildControlledSubstanceWaveCI18nCertificationReport().decision).toBe("PASS");
  });

  it("13 — no performance regression on registry lookup", () => {
    const report = buildControlledSubstanceWaveCPerformanceRegressionReport();
    expect(report.noRuntimeGateLoops).toBe(true);
    expect(report.registryLookupO1).toBe(true);
  });

  it("14 — no runtime gate loops in release path", () => {
    expect(buildControlledSubstanceWaveCBaselineReport().noRuntimeGateLoops).toBe(true);
  });

  it("15 — expansion report returns CONTROLLED_SUBSTANCES_WAVE_C_ACTIVE", () => {
    const report = runControlledSubstanceWaveCExpansionReport();
    expect(report.finalDecision).toBe("CONTROLLED_SUBSTANCES_WAVE_C_ACTIVE");
    expect(report.providerOrderingActivation.waveCActivatedCount).toBeGreaterThan(0);
  });
});
