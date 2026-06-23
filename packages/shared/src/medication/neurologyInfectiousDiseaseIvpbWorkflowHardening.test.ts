import { describe, expect, it, beforeEach } from "vitest";
import {
  buildIvpbLifecycleGovernanceReport,
  buildIvpbMedicationInventoryReport,
  buildKeppraIvpbWorkflowReport,
  buildMarSchedulingReport,
  buildNeurologyIdIvpbBaselineReport,
  buildNeurologyIdIvpbBillingInventoryReport,
  buildNeurologyIdIvpbI18nCertificationReport,
  buildNeurologyIdIvpbPharmacyVisibilityReport,
  buildNeurologyIdIvpbProviderSearchSafetyReport,
  buildNeurologyIdIvpbRollbackReport,
  buildVancomycinIvpbWorkflowReport,
  listNeurologyIdIvpbFocusCatalogCodes,
  resetNeurologyIdIvpbWorkflowHardeningCaches,
  resolveNeurologyIdIvpbFinalDecision,
  runNeurologyIdIvpbWorkflowHardeningReport,
} from "./neurologyInfectiousDiseaseIvpbWorkflowHardening.js";
import { resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches } from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.NEUROLOGY_ID_IVPB_INFUSION_WORKFLOW_HARDENING.1", () => {
  beforeEach(() => {
    resetNeurologyIdIvpbWorkflowHardeningCaches();
    resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches();
  });

  it("01 — baseline audit covers neurology and infectious disease activation gates", () => {
    const report = buildNeurologyIdIvpbBaselineReport();
    expect(report.buildGate).toBe("PASS");
    expect(report.focusMedicationCount).toBe(11);
    expect(report.neurologyProviderOrderingActive).toBe(true);
    expect(report.infectiousDiseaseProviderOrderingActive).toBe(true);
  });

  it("02 — IVPB medication inventory includes all focus medications", () => {
    const report = buildIvpbMedicationInventoryReport();
    expect(report.rows.map((row) => row.medication)).toEqual(
      expect.arrayContaining([
        "Keppra IVPB",
        "Vancomycin IVPB",
        "Cefepime IVPB",
        "Piperacillin-Tazobactam IVPB",
        "Meropenem IVPB",
        "Daptomycin IV",
        "Linezolid IV",
        "Linezolid PO",
        "Vancomycin PO",
        "Mannitol infusion",
        "Hypertonic Saline infusion",
      ])
    );
    expect(report.rows.every((row) => row.catalogPresent)).toBe(true);
  });

  it("03 — route and form normalization preserves IVPB route authority", () => {
    const report = buildIvpbMedicationInventoryReport();
    const ivpbRows = report.rows.filter((row) => row.workflowKind === "IVPB");
    expect(ivpbRows.every((row) => row.routeAuthorityPreserved)).toBe(true);
    expect(ivpbRows.every((row) => row.normalizedOrderRoute === "IVPB")).toBe(true);
  });

  it("04 — IVPB lifecycle governance requires START/STOP and blocks direct MAR bypass", () => {
    const report = buildIvpbLifecycleGovernanceReport();
    expect(report.directMarBypass).toBe(false);
    expect(report.rows.filter((row) => row.workflowKind === "IVPB").every((row) => row.startStopRequired)).toBe(true);
    expect(report.rows.filter((row) => row.workflowKind === "IVPB").every((row) => row.directMarBypass === false)).toBe(
      true
    );
  });

  it("05 — MAR scheduling validates recurring IVPB and blocks direct administer", () => {
    const report = buildMarSchedulingReport();
    expect(report.ivpbSessionStartEligible).toBe(true);
    expect(report.directMarAdministerBlockedForIvpb).toBe(true);
    expect(report.recurringIvpbEligibleCount).toBeGreaterThanOrEqual(6);
    expect(report.continuousInfusionLifecyclePreserved).toBe(true);
  });

  it("06 — Keppra IVPB workflow is provider-orderable with infusion lifecycle", () => {
    const report = buildKeppraIvpbWorkflowReport();
    expect(report.medication).toBe("Keppra IVPB");
    expect(report.providerOrderable).toBe(true);
    expect(report.startStopRequired).toBe(true);
    expect(report.directMarBypass).toBe(false);
    expect(report.pumpRateDurationFieldsAvailable).toBe(true);
    expect(report.decision).toBe("PASS");
  });

  it("07 — Vancomycin IVPB workflow is provider-orderable with infusion lifecycle", () => {
    const report = buildVancomycinIvpbWorkflowReport();
    expect(report.medication).toBe("Vancomycin IVPB");
    expect(report.providerOrderable).toBe(true);
    expect(report.startStopRequired).toBe(true);
    expect(report.directMarBypass).toBe(false);
    expect(report.decision).toBe("PASS");
  });

  it("08 — provider search safety avoids duplicate rows and catalog-code leakage", () => {
    const report = buildNeurologyIdIvpbProviderSearchSafetyReport();
    expect(report.focusCatalogCodeLeakage).toBe(false);
    expect(report.decision).toBe("PASS");
  });

  it("09 — billing and inventory readiness covers focus catalog codes", () => {
    const report = buildNeurologyIdIvpbBillingInventoryReport();
    expect(report.rowsAudited).toBe(11);
    expect(report.billingReadyCount).toBe(11);
    expect(report.inventoryReadyCount).toBe(11);
    expect(report.decision).toBe("PASS");
  });

  it("10 — pharmacy review remains visible and nonblocking", () => {
    const report = buildNeurologyIdIvpbPharmacyVisibilityReport();
    expect(report.pharmacyMayReview).toBe(true);
    expect(report.pharmacyMayBlockOrdering).toBe(false);
    expect(report.pharmacyMayBlockMarScheduling).toBe(false);
    expect(report.nonblocking).toBe(true);
  });

  it("11 — EN/FR localization certification passes for focus medications", () => {
    const report = buildNeurologyIdIvpbI18nCertificationReport();
    expect(report.rowsAudited).toBe(11);
    expect(report.enLeakageCount).toBe(0);
    expect(report.frLeakageCount).toBe(0);
    expect(report.missingTranslations).toBe(0);
    expect(report.decision).toBe("PASS");
  });

  it("12 — rollback drill preserves MAR, billing, and inventory history", () => {
    const report = buildNeurologyIdIvpbRollbackReport();
    expect(report.preservesMar).toBe(true);
    expect(report.preservesBilling).toBe(true);
    expect(report.preservesInventory).toBe(true);
    expect(report.preservesAuditTrail).toBe(true);
    expect(report.ivpbFocusRemovedFromActiveList).toBe(true);
  });

  it("13 — full hardening report resolves NEUROLOGY_ID_IVPB_WORKFLOW_READY", () => {
    const report = runNeurologyIdIvpbWorkflowHardeningReport();
    expect(listNeurologyIdIvpbFocusCatalogCodes().length).toBe(11);
    expect(report.finalDecision).toBe("NEUROLOGY_ID_IVPB_WORKFLOW_READY");
    expect(resolveNeurologyIdIvpbFinalDecision()).toBe("NEUROLOGY_ID_IVPB_WORKFLOW_READY");
  });
});
