import { describe, expect, it } from "vitest";
import {
  buildCardiologyActivationBaselineReport,
  buildCardiologyBillingInventoryReport,
  buildCardiologyCanonicalIntegrityReport,
  buildCardiologyCatalogRemediationReport,
  buildCardiologyHighRiskSafetyReport,
  buildCardiologyI18nCertificationReport,
  buildCardiologyMedicationInventoryReport,
  buildCardiologyPharmacyWorkflowReport,
  buildCardiologyProviderOrderingActivationReport,
  buildCardiologyProviderOrderingEligibilityReport,
  buildCardiologyProviderSearchSafetyReport,
  buildCardiologyRollbackReport,
  buildCardiologyWorkflowCompatibilityReport,
  listActiveCardiologyProviderOrderingCatalogCodes,
  resetCardiologyProviderOrderingActivationCaches,
  runCardiologyProviderOrderingExpansionReport,
} from "./cardiologyProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.CARDIOLOGY_PROVIDER_ORDERING_EXPANSION.1", () => {
  it("01 — cardiology inventory audit includes catalog readiness fields", () => {
    const report = buildCardiologyMedicationInventoryReport();
    expect(report.rows.length).toBe(15);
    expect(report.rows.some((row) => row.medication === "Amiodarone IV" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Nicardipine IV" && row.catalogCode)).toBe(true);
    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        catalogCode: expect.any(String),
        displayNameEn: expect.any(String),
        displayNameFr: expect.any(String),
        canonicalFamily: expect.any(String),
      })
    );
  });

  it("02 — canonical targets and remediation have no duplicate medication labels or catalog codes", () => {
    resetCardiologyProviderOrderingActivationCaches();
    const integrity = buildCardiologyCanonicalIntegrityReport();
    expect(integrity.targetCount).toBe(15);
    expect(integrity.uniqueMedicationLabels).toBe(15);
    expect(integrity.uniqueRemediationCatalogCodes).toBe(15);
    expect(integrity.duplicateMedicationLabels).toEqual([]);
    expect(integrity.duplicateRemediationCatalogCodes).toEqual([]);
    expect(integrity.activatedCatalogCodeCount).toBe(integrity.uniqueActivatedCatalogCodes);
  });

  it("03 — catalog remediation adds missing cardiology rows", () => {
    const report = buildCardiologyCatalogRemediationReport();
    expect(report.rows.find((row) => row.medication === "Entresto PO")?.catalogPresent).toBe(true);
    expect(report.rows.find((row) => row.medication === "Bumetanide IV")?.catalogPresent).toBe(true);
    expect(new Set(report.rows.map((row) => row.catalogCode)).size).toBe(report.rows.length);
    expect(report.rows.filter((row) => row.catalogPresent).length).toBeGreaterThanOrEqual(13);
  });

  it("04 — workflow compatibility audits cardiology paths", () => {
    const report = buildCardiologyWorkflowCompatibilityReport();
    expect(report.workflows.map((row) => row.workflow)).toContain("STEMI");
    expect(report.workflows.map((row) => row.workflow)).toContain("CHF");
    expect(report.workflows.map((row) => row.workflow)).toContain("Hypertensive Emergency");
    expect(report.decision).not.toBe("FAIL");
  });

  it("05 — provider ordering eligibility classifies ready and restricted meds", () => {
    const report = buildCardiologyProviderOrderingEligibilityReport();
    expect(report.readyForProviderOrdering).toEqual(
      expect.arrayContaining(["Amiodarone IV", "Metoprolol IV", "Furosemide IV", "Clopidogrel PO", "Ticagrelor PO"])
    );
    expect(report.restrictedSpecialtyReview).toEqual(expect.arrayContaining(["Entresto PO", "Digoxin PO"]));
    expect(report.eligibleCatalogCodes.length).toBe(13);
    expect(new Set(report.eligibleCatalogCodes).size).toBe(report.eligibleCatalogCodes.length);
  });

  it("06 — provider ordering activation enables certified catalog codes", () => {
    resetCardiologyProviderOrderingActivationCaches();
    const report = buildCardiologyProviderOrderingActivationReport();
    expect(listActiveCardiologyProviderOrderingCatalogCodes().length).toBe(13);
    expect(report.newlyActivatedCount).toBe(13);
    expect(report.orderPersistsImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalNotRequired).toBe(true);
  });

  it("07 — pharmacy workflow remains nonblocking", () => {
    const report = buildCardiologyPharmacyWorkflowReport();
    expect(report.pharmacyMayBlockOrdering).toBe(false);
    expect(report.pharmacyMayBlockMarScheduling).toBe(false);
    expect(report.pharmacyMayReview).toBe(true);
    expect(report.pharmacyFollowUpStatuses.length).toBeGreaterThan(0);
  });

  it("08 — billing and inventory readiness is certified", () => {
    const report = buildCardiologyBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.inventoryReadyCount).toBeGreaterThan(0);
    expect(report.chargeMappingReadyCount).toBeGreaterThan(0);
  });

  it("09 — provider search safety passes for activated cardiology rows", () => {
    const report = buildCardiologyProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.codeLeakageProtection).toBe("PASS");
    expect(report.duplicateProtection).toBe("PASS");
  });

  it("10 — rollback blocks future orders and preserves history", () => {
    const report = buildCardiologyRollbackReport();
    expect(report.removesFromFutureProviderSearch).toBe(true);
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesAuditTrail).toBe(true);
  });

  it("11 — EN localization has no French leakage for activated rows", () => {
    const report = buildCardiologyI18nCertificationReport();
    expect(report.enLeakageCount).toBe(0);
  });

  it("12 — FR localization has no English leakage for activated rows", () => {
    const report = buildCardiologyI18nCertificationReport();
    expect(report.frLeakageCount).toBe(0);
    expect(report.missingTranslations).toBe(0);
  });

  it("13 — release gate activates cardiology provider ordering", () => {
    resetCardiologyProviderOrderingActivationCaches();
    const baseline = buildCardiologyActivationBaselineReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.anticoagulationActive).toBe(true);
    expect(baseline.insulinDiabetesActive).toBe(true);
    expect(baseline.vaccineProviderOrderingActive).toBe(true);
    expect(baseline.criticalCareProviderOrderingActive).toBe(true);
    expect(baseline.neurologyProviderOrderingActive).toBe(true);
    expect(baseline.infectiousDiseaseProviderOrderingActive).toBe(true);

    const highRisk = buildCardiologyHighRiskSafetyReport();
    expect(highRisk.thrombolyticsNotActivated).toBe(true);
    expect(highRisk.experimentalCardiacTherapiesNotActivated).toBe(true);
    expect(highRisk.activationLimitedToApprovedCardiologyMeds).toBe(true);

    const report = runCardiologyProviderOrderingExpansionReport();
    expect(report.compatibility.pharmacyReviewNonBlocking).toBe(true);
    expect(report.finalDecision).toBe("CARDIOLOGY_PROVIDER_ORDERING_ACTIVE");
  });
});
