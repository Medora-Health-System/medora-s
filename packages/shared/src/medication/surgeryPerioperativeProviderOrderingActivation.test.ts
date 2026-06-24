import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSurgeryBillingInventoryReport,
  buildSurgeryHighRiskExclusionReport,
  buildSurgeryMarSafetyReport,
  buildSurgeryPerioperativeBaselineReport,
  buildSurgeryPerioperativeCatalogRemediationReport,
  buildSurgeryPerioperativeInventoryReport,
  buildSurgeryProviderOrderingActivationReport,
  buildSurgeryProviderOrderingEligibilityReport,
  buildSurgeryProviderSearchSafetyReport,
  buildSurgeryRollbackReport,
  buildSurgeryWorkflowCompatibilityReport,
  listActiveSurgeryPerioperativeProviderOrderingCatalogCodes,
  resetSurgeryPerioperativeProviderOrderingActivationCaches,
  runSurgeryPerioperativeProviderOrderingExpansionReport,
} from "./surgeryPerioperativeProviderOrderingActivation.js";
import { ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_MANIFEST } from "./enterpriseSurgeryPerioperativeBillingManifest.js";
import { ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_MANIFEST } from "./enterpriseSurgeryPerioperativeFormularyManifest.js";

describe("MEDUI.MEDICATION.SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_EXPANSION.1", () => {
  beforeEach(() => {
    resetSurgeryPerioperativeProviderOrderingActivationCaches();
  });

  it("01 — manifest integrity includes cefoxitin and scopolamine remediation rows", () => {
    expect(ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_MANIFEST.length).toBeGreaterThanOrEqual(2);
    expect(ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_MANIFEST.some((row) => row.catalogCode.includes("CEFOXITIN"))).toBe(true);
    expect(ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_MANIFEST.every((row) => row.hcpcs.trim().length > 0)).toBe(true);
  });

  it("02 — perioperative inventory covers antibiotic prophylaxis, PONV, GI, and pain targets", () => {
    const report = buildSurgeryPerioperativeInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(30);
    expect(report.rows.some((row) => row.medication === "Cefazolin IV" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Metronidazole IV" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Ondansetron IV" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Ketorolac IV" && row.catalogCode)).toBe(true);
  });

  it("03 — catalog remediation adds cefoxitin formulary row", () => {
    const report = buildSurgeryPerioperativeCatalogRemediationReport();
    expect(report.rows.some((row) => row.catalogCode === "CEFOXITIN_2_G_INJECTABLE_INTRAVEINEUSE" && row.catalogPresent)).toBe(true);
  });

  it("04 — pre-op prophylaxis and PACU recovery workflows have catalog support", () => {
    const report = buildSurgeryWorkflowCompatibilityReport();
    const preOp = report.workflows.find((row) => row.workflow === "Pre-op prophylaxis");
    const pacu = report.workflows.find((row) => row.workflow === "PACU recovery");
    expect(preOp?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(pacu?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
  });

  it("05 — DVT prevention and post-op bowel regimen workflows are supported", () => {
    const report = buildSurgeryWorkflowCompatibilityReport();
    const dvt = report.workflows.find((row) => row.workflow === "DVT prevention");
    const bowel = report.workflows.find((row) => row.workflow === "Post-op bowel regimen");
    expect(dvt?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(bowel?.catalogSupportPercent).toBe(100);
  });

  it("06 — high-risk controlled, anesthesia, and paralytic agents remain restricted", () => {
    const eligibility = buildSurgeryProviderOrderingEligibilityReport();
    expect(eligibility.restrictedSpecialtyReview).toEqual(
      expect.arrayContaining(["Morphine", "Fentanyl", "Propofol", "Succinylcholine", "Rocuronium"])
    );
    const exclusions = buildSurgeryHighRiskExclusionReport();
    expect(exclusions.activatedHighRiskCount).toBe(0);
    expect(exclusions.controlledSubstancesNotActivated.length).toBeGreaterThan(0);
    expect(exclusions.anesthesiaAgentsNotActivated.length).toBeGreaterThan(0);
    expect(exclusions.paralyticsNotActivated.length).toBeGreaterThan(0);
  });

  it("07 — prior-domain meds are not re-activated by surgery module", () => {
    const eligibility = buildSurgeryProviderOrderingEligibilityReport();
    const active = listActiveSurgeryPerioperativeProviderOrderingCatalogCodes();
    const covered = eligibility.rows.filter(
      (row) => row.classification === "ACTIVE_IN_PRIOR_DOMAIN" || row.classification === "ALREADY_PROVIDER_ORDERABLE"
    );
    for (const row of covered) {
      if (row.catalogCode) expect(active).not.toContain(row.catalogCode);
    }
  });

  it("08 — provider ordering activation enables immediate order and MAR paths", () => {
    const report = buildSurgeryProviderOrderingActivationReport();
    expect(report.activatedCatalogCodes.length).toBeGreaterThan(0);
    expect(report.orderPersistsImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyMayBlockOrdering).toBe(false);
    expect(report.pharmacyMayBlockMarScheduling).toBe(false);
  });

  it("09 — MAR safety preserves IVPB and infusion governance without direct bypass", () => {
    const report = buildSurgeryMarSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.ivpbAntibioticStartStopLifecycle).toBe(true);
    expect(report.continuousFluidInfusionLifecycle).toBe(true);
    expect(report.directMarBypass).toBe(false);
    expect(report.pharmacyMayBlockMarScheduling).toBe(false);
  });

  it("10 — billing certification covers activated surgery medications", () => {
    const report = buildSurgeryBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.ndcReadyCount).toBeGreaterThan(0);
    expect(report.decision).toBe("PASS");
  });

  it("11 — provider search safety has no duplicate activation codes", () => {
    const report = buildSurgeryProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.duplicateRows).toBe(0);
    expect(report.catalogCodeLeakage).toBe(false);
    expect(report.appendOnlySearchBehavior).toBe(true);
  });

  it("12 — activation registry deduplicates catalog codes", () => {
    const codes = listActiveSurgeryPerioperativeProviderOrderingCatalogCodes();
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("13 — baseline reports perioperative coverage and prior-domain overlap", () => {
    const report = buildSurgeryPerioperativeBaselineReport();
    expect(report.surgeryCoveragePercent).toBeGreaterThan(0);
    expect(report.pacuCoveragePercent).toBeGreaterThan(0);
    expect(report.perioperativeCoveragePercent).toBeGreaterThan(0);
    expect(report.overlapWithPriorDomains.length).toBeGreaterThan(0);
  });

  it("14 — rollback blocks future surgery orders while preserving clinical artifacts", () => {
    const report = buildSurgeryRollbackReport();
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesBilling).toBe(true);
    expect(report.preservesAuditTrail).toBe(true);
  });

  it("15 — ready eligibility includes ketorolac, tranexamic acid, and local anesthetics", () => {
    const eligibility = buildSurgeryProviderOrderingEligibilityReport();
    expect(eligibility.readyForProviderOrdering).toEqual(
      expect.arrayContaining(["Ketorolac IV", "Tranexamic Acid IV", "Lidocaine local", "Bupivacaine local"])
    );
  });

  it("16 — expansion report returns SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_ACTIVE", () => {
    const report = runSurgeryPerioperativeProviderOrderingExpansionReport();
    expect(report.finalDecision).toBe("SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_ACTIVE");
    expect(report.providerOrderingActivation.newlyActivatedCount).toBeGreaterThan(0);
    expect(report.compatibility.migrationsRequired).toBe(false);
    expect(report.highRiskExclusions.decision).toBe("PASS");
    expect(report.providerOrderingEligibility.eligibleCatalogCodes.length).toBeGreaterThan(0);
  });
});
