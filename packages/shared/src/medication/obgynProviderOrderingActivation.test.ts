import { describe, expect, it, beforeEach } from "vitest";
import {
  buildObgynBaselineReport,
  buildObgynBillingCodingInventoryReport,
  buildObgynCatalogRemediationReport,
  buildObgynI18nCertificationReport,
  buildObgynInventoryReport,
  buildObgynProviderOrderingActivationReport,
  buildObgynProviderOrderingEligibilityReport,
  buildObgynProviderSearchSafetyReport,
  buildObgynRollbackReport,
  buildObgynSafetyGovernanceReport,
  buildObgynWorkflowCompatibilityReport,
  listActiveObgynProviderOrderingCatalogCodes,
  resetObgynProviderOrderingActivationCaches,
  runObgynProviderOrderingExpansionReport,
} from "./obgynProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.OBGYN_PROVIDER_ORDERING_EXPANSION.1", () => {
  beforeEach(() => {
    resetObgynProviderOrderingActivationCaches();
  });

  it("01 — OBGYN inventory covers uterotonics, magnesium, antibiotics, and analgesics", () => {
    const report = buildObgynInventoryReport();
    expect(report.rows.length).toBe(24);
    expect(report.rows.some((row) => row.medication === "Oxytocin / Pitocin" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Magnesium sulfate" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Cefazolin" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Acetaminophen" && row.catalogCode)).toBe(true);
  });

  it("02 — catalog remediation adds Penicillin G IV and tranexamic acid rows", () => {
    const report = buildObgynCatalogRemediationReport();
    expect(report.rows.some((row) => row.catalogCode === "PENICILLIN_G_5_MILLION_UNITS_POUDRE_INTRAVEINEUSE")).toBe(true);
    expect(report.rows.some((row) => row.catalogCode === "TRANEXAMIC_ACID_1000_MG_10_ML_INJECTABLE_INTRAVEINEUSE")).toBe(true);
  });

  it("03 — labor induction and PPH workflows have catalog support", () => {
    const report = buildObgynWorkflowCompatibilityReport();
    const labor = report.workflows.find((row) => row.workflow === "Labor induction");
    const pph = report.workflows.find((row) => row.workflow === "Postpartum hemorrhage");
    expect(labor?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(pph?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
  });

  it("04 — preeclampsia and GBS prophylaxis workflows are supported", () => {
    const report = buildObgynWorkflowCompatibilityReport();
    const preeclampsia = report.workflows.find((row) => row.workflow === "Preeclampsia/eclampsia");
    const gbs = report.workflows.find((row) => row.workflow === "GBS prophylaxis");
    expect(preeclampsia?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(gbs?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
  });

  it("05 — provider ordering eligibility separates ready from restricted uterotonics", () => {
    const report = buildObgynProviderOrderingEligibilityReport();
    expect(report.readyForProviderOrdering.length).toBeGreaterThan(0);
    expect(report.restrictedObgynReview).toEqual(
      expect.arrayContaining(["Methylergonovine / Methergine", "Carboprost / Hemabate"])
    );
  });

  it("06 — provider ordering activation enables immediate order and MAR paths", () => {
    const report = buildObgynProviderOrderingActivationReport();
    expect(report.activatedCatalogCodes.length).toBeGreaterThan(0);
    expect(report.orderPersistsImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalNotRequired).toBe(true);
  });

  it("07 — pregnancy and postpartum safety advisories remain nonblocking", () => {
    const report = buildObgynSafetyGovernanceReport();
    expect(report.decision).toBe("PASS");
    expect(report.blocksProviderOrdering).toBe(false);
    expect(report.pregnancyStatusAdvisory).toBe("ADVISORY");
    expect(report.uterotonicContraindicationAdvisory).toBe("ADVISORY");
    expect(report.magnesiumToxicityMonitoringAdvisory).toBe("ADVISORY");
  });

  it("08 — billing, HCPCS, NDC, and inventory readiness covers activated meds", () => {
    const report = buildObgynBillingCodingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.ndcReadyCount).toBeGreaterThan(0);
    expect(report.decision).toBe("PASS");
  });

  it("09 — provider search duplicate protection passes for activated OBGYN meds", () => {
    const report = buildObgynProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.duplicateRows).toBe(0);
    expect(report.catalogCodeLeakage).toBe(false);
  });

  it("10 — rollback blocks future orders while preserving historical artifacts", () => {
    const report = buildObgynRollbackReport();
    expect(report.removesFromFutureProviderSearch).toBe(true);
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesOrders).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesBilling).toBe(true);
  });

  it("11 — EN localization has no French leakage", () => {
    const report = buildObgynI18nCertificationReport();
    expect(report.enLeakageCount).toBe(0);
    expect(report.missingTranslations).toBe(0);
  });

  it("12 — FR localization has no English leakage", () => {
    const report = buildObgynI18nCertificationReport();
    expect(report.frLeakageCount).toBe(0);
    expect(report.decision).toBe("PASS");
  });

  it("13 — release gate: baseline active domains and final decision", () => {
    const baseline = buildObgynBaselineReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.anticoagulationActive).toBe(true);
    expect(baseline.ivFluidsProviderOrderingActive).toBe(true);
    expect(baseline.oncologyGovernanceReady).toBe(true);

    const report = runObgynProviderOrderingExpansionReport();
    expect(listActiveObgynProviderOrderingCatalogCodes().length).toBeGreaterThan(0);
    expect(report.finalDecision).toBe("OBGYN_PROVIDER_ORDERING_ACTIVE");
  });
});
