import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import {
  buildPediatricsBillingInventoryReport,
  buildPediatricsCatalogRemediationReport,
  buildPediatricsI18nCertificationReport,
  buildPediatricsInventoryReport,
  buildPediatricsProviderOrderingActivationReport,
  buildPediatricsProviderOrderingEligibilityReport,
  buildPediatricsProviderSearchSafetyReport,
  buildPediatricsRollbackReport,
  buildPediatricsSafetyGovernanceReport,
  buildPediatricsVaccineCoverageReport,
  buildPediatricsWorkflowCompatibilityReport,
  listActivePediatricsProviderOrderingCatalogCodes,
  resetPediatricsProviderOrderingActivationCaches,
  runPediatricsProviderOrderingExpansionReport,
} from "./pediatricsProviderOrderingActivation.js";
import { prewarmProviderOrderableCatalogCodesRegistry } from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDICATION.PEDIATRICS_PROVIDER_ORDERING_EXPANSION.1", () => {
  beforeAll(() => {
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  beforeEach(() => {
    resetPediatricsProviderOrderingActivationCaches();
  });

  it("01 — pediatric inventory covers antibiotics, fever/pain, respiratory, and GI targets", () => {
    const report = buildPediatricsInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(28);
    expect(report.rows.some((row) => row.medication === "Amoxicillin suspension" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Ibuprofen suspension" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Albuterol nebulizer" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Ondansetron ODT" && row.catalogCode)).toBe(true);
  });

  it("02 — catalog remediation adds cefdinir and erythromycin ophthalmic rows", () => {
    const report = buildPediatricsCatalogRemediationReport();
    expect(
      report.rows.some((row) => row.catalogCode === "CEFDINIR_125_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL" && row.catalogPresent)
    ).toBe(true);
    expect(
      report.rows.some((row) => row.catalogCode === "ERYTHROMYCIN_0_5_OPHTHALMIQUE_OPHTHALMIQUE" && row.catalogPresent)
    ).toBe(true);
  });

  it("03 — otitis media, asthma, and fever workflows have catalog support", () => {
    const report = buildPediatricsWorkflowCompatibilityReport();
    const otitis = report.workflows.find((row) => row.workflow === "Otitis media");
    const asthma = report.workflows.find((row) => row.workflow === "Asthma");
    const fever = report.workflows.find((row) => row.workflow === "Fever");
    expect(otitis?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(asthma?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(fever?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
  });

  it("04 — bronchiolitis and anaphylaxis workflows are supported", () => {
    const report = buildPediatricsWorkflowCompatibilityReport();
    const bronchiolitis = report.workflows.find((row) => row.workflow === "Bronchiolitis");
    const anaphylaxis = report.workflows.find((row) => row.workflow === "Anaphylaxis");
    expect(bronchiolitis?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(anaphylaxis?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
  });

  it("05 — neonatal specialty and complex vaccine workflows remain restricted", () => {
    const eligibility = buildPediatricsProviderOrderingEligibilityReport();
    expect(eligibility.restrictedPedsReview).toEqual(
      expect.arrayContaining(["Penicillin G", "Vitamin K", "Hepatitis B vaccine", "Dextrose rescue"])
    );
    const vaccineCoverage = buildPediatricsVaccineCoverageReport();
    expect(vaccineCoverage.restrictedPedsReview).toEqual(
      expect.arrayContaining(["DTaP", "IPV", "Hib", "Rotavirus", "PCV13", "PCV15"])
    );
    const activation = buildPediatricsProviderOrderingActivationReport();
    expect(activation.vaccinesNotActivatedByPediatricsModule.length).toBeGreaterThan(0);
  });

  it("06 — prior-domain meds are not re-activated by pediatrics module", () => {
    const eligibility = buildPediatricsProviderOrderingEligibilityReport();
    expect(eligibility.activeInPriorDomain.length + eligibility.rows.filter((row) => row.classification === "ALREADY_PROVIDER_ORDERABLE").length).toBeGreaterThan(0);
    expect(eligibility.activeInPriorDomain).toEqual(
      expect.arrayContaining(["Epinephrine IM", "Normal saline bolus"])
    );
    const active = listActivePediatricsProviderOrderingCatalogCodes();
    const covered = eligibility.rows.filter(
      (row) => row.classification === "ACTIVE_IN_PRIOR_DOMAIN" || row.classification === "ALREADY_PROVIDER_ORDERABLE"
    );
    for (const row of covered) {
      if (row.catalogCode) expect(active).not.toContain(row.catalogCode);
    }
  });

  it("07 — provider ordering activation enables immediate order and MAR paths", () => {
    const report = buildPediatricsProviderOrderingActivationReport();
    expect(report.activatedCatalogCodes.length).toBeGreaterThan(0);
    expect(report.orderPersistsImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalNotRequired).toBe(true);
  });

  it("08 — pediatric safety advisories remain nonblocking", () => {
    const report = buildPediatricsSafetyGovernanceReport();
    expect(report.decision).toBe("PASS");
    expect(report.blocksProviderOrdering).toBe(false);
    expect(report.weightBasedDosingAdvisory).toBe("ADVISORY");
    expect(report.neonatalRestrictionAdvisory).toBe("ADVISORY");
    expect(report.vaccineScheduleAdvisory).toBe("ADVISORY");
  });

  it("09 — billing, HCPCS, NDC, and inventory readiness covers activated meds", () => {
    const report = buildPediatricsBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.ndcReadyCount).toBeGreaterThan(0);
    expect(report.decision).toBe("PASS");
  });

  it("10 — provider search safety has no duplicate activation codes", () => {
    const report = buildPediatricsProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.duplicateRows).toBe(0);
    expect(report.catalogCodeLeakage).toBe(false);
  });

  it("11 — activation registry deduplicates catalog codes", () => {
    const codes = listActivePediatricsProviderOrderingCatalogCodes();
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("12 — controlled substances and chemotherapy are excluded from activation", () => {
    const report = buildPediatricsProviderOrderingActivationReport();
    expect(report.controlledSubstancesNotActivated.length).toBeGreaterThanOrEqual(0);
    expect(report.chemotherapyNotActivated.length).toBe(0);
    for (const code of report.activatedCatalogCodes) {
      expect(code.toLowerCase()).not.toMatch(/morphine|fentanyl|hydromorphone|methotrexate|doxorubicin|cyclophosphamide/);
    }
  });

  it("13 — rollback blocks future pediatric orders while preserving clinical artifacts", () => {
    const report = buildPediatricsRollbackReport();
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesBilling).toBe(true);
    expect(report.preservesAuditTrail).toBe(true);
  });

  it("14 — i18n certification passes for activated pediatric medications", () => {
    const report = buildPediatricsI18nCertificationReport();
    expect(report.decision).toBe("PASS");
    expect(report.enLeakageCount).toBe(0);
    expect(report.frLeakageCount).toBe(0);
  });

  it("15 — pediatric vaccine coverage audits MMR/Varicella ready and series restricted", () => {
    const report = buildPediatricsVaccineCoverageReport();
    expect(report.ready).toEqual(expect.arrayContaining(["MMR", "Varicella"]));
    expect(report.restrictedPedsReview.length).toBeGreaterThanOrEqual(6);
  });

  it("16 — expansion report returns PEDIATRICS_PROVIDER_ORDERING_ACTIVE", () => {
    const report = runPediatricsProviderOrderingExpansionReport();
    expect(report.finalDecision).toBe("PEDIATRICS_PROVIDER_ORDERING_ACTIVE");
    expect(report.providerOrderingActivation.newlyActivatedCount).toBeGreaterThan(0);
    expect(report.compatibility.migrationsRequired).toBe(false);
    expect(report.providerOrderingEligibility.eligibleCatalogCodes.length).toBeGreaterThan(0);
    expect(report.providerOrderingEligibility.readyForProviderOrdering).toEqual(
      expect.arrayContaining([
        "Amoxicillin suspension",
        "Augmentin suspension",
        "Cefdinir suspension",
        "Acetaminophen liquid",
        "Ibuprofen suspension",
        "Albuterol nebulizer",
        "Prednisolone solution",
        "Ondansetron ODT",
        "Cetirizine",
        "Loratadine",
        "Erythromycin ophthalmic",
      ])
    );
  });
});
