import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPainManagementBillingInventoryReport,
  buildPainManagementGovernanceReport,
  buildPainManagementInventoryReport,
  buildPainManagementI18nCertificationReport,
  buildPainManagementProviderOrderingActivationReport,
  buildPainManagementProviderOrderingEligibilityReport,
  buildPainManagementProviderSearchSafetyReport,
  buildPainManagementRollbackReport,
  listActivePainManagementProviderOrderingCatalogCodes,
  resetPainManagementProviderOrderingActivationCaches,
  runPainManagementProviderOrderingExpansionReport,
} from "./painManagementProviderOrderingActivation.js";
import { ENTERPRISE_PAIN_MANAGEMENT_BILLING_MANIFEST } from "./enterprisePainManagementBillingManifest.js";
import { ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_MANIFEST } from "./enterprisePainManagementFormularyManifest.js";
import { prewarmProviderOrderableCatalogCodesRegistry, resetProviderOrderableCatalogCodesRegistryForTests } from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDICATION.PAIN_MANAGEMENT_AND_CONTROLLED_SUBSTANCES_EXPANSION.1", () => {
  beforeEach(() => {
    resetPainManagementProviderOrderingActivationCaches();
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("01 — manifest integrity uses certified billing passthrough only", () => {
    expect(ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_MANIFEST).toHaveLength(0);
    expect(ENTERPRISE_PAIN_MANAGEMENT_BILLING_MANIFEST.length).toBeGreaterThan(0);
    expect(ENTERPRISE_PAIN_MANAGEMENT_BILLING_MANIFEST.every((row) => row.hcpcs.trim().length > 0 || row.ndc11.trim().length > 0)).toBe(true);
  });

  it("02 — inventory catalogs acetaminophen, NSAIDs, opioids, combinations, and adjuncts", () => {
    const report = buildPainManagementInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(35);
    expect(report.rows.some((row) => row.medication === "Acetaminophen PO tablets" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Ketorolac 15 mg" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Gabapentin" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Morphine 10 mg/mL" && row.catalogCode)).toBe(true);
  });

  it("03 — Schedule II opioids are classified CONTROLLED_SUBSTANCE_BLOCKED", () => {
    const eligibility = buildPainManagementProviderOrderingEligibilityReport();
    expect(eligibility.controlledSubstanceBlocked).toEqual(
      expect.arrayContaining([
        "Morphine 2 mg/mL",
        "Morphine 4 mg/mL",
        "Morphine 10 mg/mL",
        "Fentanyl 50 mcg",
        "Hydrocodone/Acetaminophen 5/325",
        "Oxycodone IR",
      ])
    );
  });

  it("04 — no controlled substances are activated for provider ordering", () => {
    const governance = buildPainManagementGovernanceReport();
    expect(governance.decision).toBe("PASS");
    expect(governance.scheduleIiNotAutoActivated).toBe(true);
    expect(governance.activatedControlledCatalogCodes).toHaveLength(0);
    const active = listActivePainManagementProviderOrderingCatalogCodes();
    for (const code of active) {
      expect(code.toLowerCase()).not.toMatch(/morphine|fentanyl|hydromorphone|oxycodone|hydrocodone|codeine/);
    }
  });

  it("05 — prior-domain meds are not re-activated by pain module", () => {
    const eligibility = buildPainManagementProviderOrderingEligibilityReport();
    const active = listActivePainManagementProviderOrderingCatalogCodes();
    const covered = eligibility.rows.filter(
      (row) => row.classification === "ACTIVE_IN_PRIOR_DOMAIN" || row.classification === "ALREADY_PROVIDER_ORDERABLE"
    );
    for (const row of covered) {
      if (row.catalogCode) expect(active).not.toContain(row.catalogCode);
    }
  });

  it("06 — provider ordering activation enables immediate order and MAR paths", () => {
    const report = buildPainManagementProviderOrderingActivationReport();
    expect(report.activatedCatalogCodes.length).toBeGreaterThan(0);
    expect(report.orderPersistsImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.controlledSubstancesNotActivated.length).toBeGreaterThan(0);
  });

  it("07 — billing certification covers activated pain medications without fabricated mappings", () => {
    const report = buildPainManagementBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.fabricatedMappingCount).toBe(0);
    expect(report.decision).toBe("PASS");
  });

  it("08 — provider search safety has no duplicate activation codes", () => {
    const report = buildPainManagementProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.duplicateRows).toBe(0);
    expect(report.catalogCodeLeakage).toBe(false);
  });

  it("09 — activation registry deduplicates catalog codes", () => {
    const codes = listActivePainManagementProviderOrderingCatalogCodes();
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("10 — ready eligibility includes ketorolac 15 mg, gabapentin, pregabalin, and baclofen", () => {
    const eligibility = buildPainManagementProviderOrderingEligibilityReport();
    expect(eligibility.readyForProviderOrdering).toEqual(
      expect.arrayContaining(["Ketorolac 15 mg", "Gabapentin", "Pregabalin", "Baclofen"])
    );
  });

  it("11 — i18n certification passes for activated pain medications", () => {
    const report = buildPainManagementI18nCertificationReport();
    expect(report.decision).toBe("PASS");
    expect(report.missingTranslations).toBe(0);
  });

  it("12 — rollback blocks future pain orders while preserving clinical artifacts", () => {
    const report = buildPainManagementRollbackReport();
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesAuditTrail).toBe(true);
  });

  it("13 — expansion report returns PAIN_MANAGEMENT_PROVIDER_ORDERING_ACTIVE", () => {
    const report = runPainManagementProviderOrderingExpansionReport();
    expect(report.finalDecision).toBe("PAIN_MANAGEMENT_PROVIDER_ORDERING_ACTIVE");
    expect(report.providerOrderingActivation.newlyActivatedCount).toBeGreaterThan(0);
    expect(report.governance.decision).toBe("PASS");
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
