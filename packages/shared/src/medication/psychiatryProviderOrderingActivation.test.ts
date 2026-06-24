import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPsychiatryBaselineReport,
  buildPsychiatryBillingCodingInventoryReport,
  buildPsychiatryCatalogRemediationReport,
  buildPsychiatryControlledSubstanceGovernanceReport,
  buildPsychiatryI18nCertificationReport,
  buildPsychiatryInventoryReport,
  buildPsychiatryProviderOrderingActivationReport,
  buildPsychiatryProviderOrderingEligibilityReport,
  buildPsychiatryProviderSearchSafetyReport,
  buildPsychiatryRollbackReport,
  buildPsychiatrySafetyGovernanceReport,
  buildPsychiatryWorkflowCompatibilityReport,
  listActivePsychiatryProviderOrderingCatalogCodes,
  resetPsychiatryProviderOrderingActivationCaches,
  runPsychiatryProviderOrderingExpansionReport,
} from "./psychiatryProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.PSYCHIATRY_PROVIDER_ORDERING_EXPANSION.1", () => {
  beforeEach(() => {
    resetPsychiatryProviderOrderingActivationCaches();
  });

  it("01 — psychiatry inventory covers antipsychotics, antidepressants, and mood stabilizers", () => {
    const report = buildPsychiatryInventoryReport();
    expect(report.rows.length).toBe(35);
    expect(report.rows.some((row) => row.medication === "Haloperidol PO" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Olanzapine PO" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Sertraline" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Lithium" && row.catalogCode)).toBe(true);
  });

  it("02 — catalog remediation adds ODT, IM psychiatry, benztropine, hydroxyzine, and propranolol rows", () => {
    const report = buildPsychiatryCatalogRemediationReport();
    expect(report.rows.some((row) => row.catalogCode === "OLANZAPINE_10_MG_ODT_COMPRIME_ORODISPERSIBLE_ORALE")).toBe(true);
    expect(report.rows.some((row) => row.catalogCode === "ZIPRASIDONE_20_MG_INJECTABLE_INTRAMUSCULAIRE")).toBe(true);
    expect(report.rows.some((row) => row.catalogCode === "BENZTROPINE_1_MG_COMPRIME_ORALE")).toBe(true);
    expect(report.rows.some((row) => row.catalogCode === "HYDROXYZINE_25_MG_COMPRIME_ORALE")).toBe(true);
    expect(report.rows.some((row) => row.catalogCode === "PROPRANOLOL_10_MG_COMPRIME_ORALE")).toBe(true);
  });

  it("03 — agitation and acute psychosis workflows have catalog support", () => {
    const report = buildPsychiatryWorkflowCompatibilityReport();
    const agitation = report.workflows.find((row) => row.workflow === "Agitation");
    const psychosis = report.workflows.find((row) => row.workflow === "Acute psychosis");
    expect(agitation?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(psychosis?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
  });

  it("04 — depression and EPS management workflows are supported", () => {
    const report = buildPsychiatryWorkflowCompatibilityReport();
    const depression = report.workflows.find((row) => row.workflow === "Depression");
    const eps = report.workflows.find((row) => row.workflow === "EPS management");
    expect(depression?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(eps?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
  });

  it("05 — controlled substances lorazepam, diazepam, and midazolam remain blocked", () => {
    const eligibility = buildPsychiatryProviderOrderingEligibilityReport();
    expect(eligibility.controlledSubstanceBlocked).toEqual(
      expect.arrayContaining(["Lorazepam PO", "Lorazepam IV", "Diazepam", "Midazolam"])
    );
    const controlled = buildPsychiatryControlledSubstanceGovernanceReport();
    expect(controlled.decision).toBe("PASS");
    expect(controlled.controlledSubstancesActivated).toEqual([]);
  });

  it("06 — provider ordering eligibility separates ready from restricted clozapine", () => {
    const report = buildPsychiatryProviderOrderingEligibilityReport();
    expect(report.readyForProviderOrdering.length).toBeGreaterThan(0);
    expect(report.restrictedPsychiatryReview).toEqual(expect.arrayContaining(["Clozapine"]));
  });

  it("07 — provider ordering activation enables immediate order and MAR paths", () => {
    const report = buildPsychiatryProviderOrderingActivationReport();
    expect(report.activatedCatalogCodes.length).toBeGreaterThan(0);
    expect(report.orderPersistsImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalNotRequired).toBe(true);
    expect(report.controlledSubstancesNotActivated.length).toBeGreaterThan(0);
  });

  it("08 — behavioral-health safety advisories remain nonblocking", () => {
    const report = buildPsychiatrySafetyGovernanceReport();
    expect(report.decision).toBe("PASS");
    expect(report.blocksProviderOrdering).toBe(false);
    expect(report.suicidePrecautionsAdvisory).toBe("ADVISORY");
    expect(report.nmsRiskAdvisory).toBe("ADVISORY");
    expect(report.lithiumToxicityMonitoringAdvisory).toBe("ADVISORY");
  });

  it("09 — billing, HCPCS, NDC, and inventory readiness covers activated meds", () => {
    const report = buildPsychiatryBillingCodingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.ndcReadyCount).toBeGreaterThan(0);
    expect(report.decision).toBe("PASS");
  });

  it("10 — provider search duplicate protection passes for activated psychiatry meds", () => {
    const report = buildPsychiatryProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.duplicateRows).toBe(0);
    expect(report.catalogCodeLeakage).toBe(false);
  });

  it("11 — rollback blocks future orders while preserving historical artifacts", () => {
    const report = buildPsychiatryRollbackReport();
    expect(report.removesFromFutureProviderSearch).toBe(true);
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesOrders).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesBilling).toBe(true);
  });

  it("12 — EN and FR localization have zero leakage", () => {
    const report = buildPsychiatryI18nCertificationReport();
    expect(report.enLeakageCount).toBe(0);
    expect(report.frLeakageCount).toBe(0);
    expect(report.decision).toBe("PASS");
  });

  it("13 — baseline active domains and final decision pass release gate", () => {
    const baseline = buildPsychiatryBaselineReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.obgynProviderOrderingActive).toBe(true);
    expect(baseline.oncologyGovernanceReady).toBe(true);

    const report = runPsychiatryProviderOrderingExpansionReport();
    expect(listActivePsychiatryProviderOrderingCatalogCodes().length).toBeGreaterThan(0);
    expect(report.finalDecision).toBe("PSYCHIATRY_PROVIDER_ORDERING_ACTIVE");
  });

  it("14 — release gate certification via expansion report", () => {
    const report = runPsychiatryProviderOrderingExpansionReport();
    expect(report.baseline.buildGate).toBe("PASS");
    expect(report.controlledSubstanceGovernance.decision).toBe("PASS");
    expect(report.providerSearchSafety.decision).toBe("PASS");
    expect(report.i18n.decision).toBe("PASS");
  });
});
