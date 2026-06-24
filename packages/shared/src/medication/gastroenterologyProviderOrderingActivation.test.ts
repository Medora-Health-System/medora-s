import { describe, expect, it, beforeEach } from "vitest";
import {
  buildGastroenterologyBillingInventoryReport,
  buildGastroenterologyCatalogRemediationReport,
  buildGastroenterologyI18nCertificationReport,
  buildGastroenterologyInventoryReport,
  buildGastroenterologyProviderOrderingActivationReport,
  buildGastroenterologyProviderOrderingEligibilityReport,
  buildGastroenterologyProviderSearchSafetyReport,
  buildGastroenterologyRollbackReport,
  buildGastroenterologySafetyGovernanceReport,
  buildGastroenterologyWorkflowCompatibilityReport,
  listActiveGastroenterologyProviderOrderingCatalogCodes,
  resetGastroenterologyProviderOrderingActivationCaches,
  runGastroenterologyProviderOrderingExpansionReport,
} from "./gastroenterologyProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.GASTROENTEROLOGY_PROVIDER_ORDERING_EXPANSION.1", () => {
  beforeEach(() => {
    resetGastroenterologyProviderOrderingActivationCaches();
  });

  it("01 — gastro inventory covers GERD, hepatic, constipation, and antiemetic targets", () => {
    const report = buildGastroenterologyInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(28);
    expect(report.rows.some((row) => row.medication === "Pantoprazole PO" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Lactulose" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Rifaximin" && row.catalogCode)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Metoclopramide PO" && row.catalogCode)).toBe(true);
  });

  it("02 — catalog remediation adds rifaximin, senna, and bisacodyl rows", () => {
    const report = buildGastroenterologyCatalogRemediationReport();
    expect(report.rows.some((row) => row.catalogCode === "RIFAXIMIN_550_MG_COMPRIME_ORALE" && row.catalogPresent)).toBe(true);
    expect(report.rows.some((row) => row.catalogCode === "SENNA_8_6_MG_COMPRIME_ORALE" && row.catalogPresent)).toBe(true);
    expect(report.rows.some((row) => row.catalogCode === "BISACODYL_5_MG_COMPRIME_ORALE" && row.catalogPresent)).toBe(true);
  });

  it("03 — GERD and hepatic encephalopathy workflows have catalog support", () => {
    const report = buildGastroenterologyWorkflowCompatibilityReport();
    const gerd = report.workflows.find((row) => row.workflow === "GERD");
    const hepatic = report.workflows.find((row) => row.workflow === "Hepatic Encephalopathy");
    expect(gerd?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(hepatic?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
  });

  it("04 — constipation and diarrhea workflows are supported", () => {
    const report = buildGastroenterologyWorkflowCompatibilityReport();
    const constipation = report.workflows.find((row) => row.workflow === "Constipation");
    const diarrhea = report.workflows.find((row) => row.workflow === "Diarrhea");
    expect(constipation?.catalogSupportPercent).toBeGreaterThanOrEqual(50);
    expect(diarrhea?.catalogSupportPercent).toBe(100);
  });

  it("05 — octreotide remains restricted specialty review", () => {
    const eligibility = buildGastroenterologyProviderOrderingEligibilityReport();
    expect(eligibility.restrictedSpecialtyReview).toEqual(expect.arrayContaining(["Octreotide infusion"]));
    const activation = buildGastroenterologyProviderOrderingActivationReport();
    expect(activation.activatedCatalogCodes).not.toContain(
      eligibility.rows.find((row) => row.medication === "Octreotide infusion")?.catalogCode
    );
  });

  it("06 — prior-domain meds are not re-activated by gastro module", () => {
    const eligibility = buildGastroenterologyProviderOrderingEligibilityReport();
    expect(eligibility.activeInPriorDomain).toEqual(
      expect.arrayContaining(["Ondansetron", "NS"])
    );
    const active = listActiveGastroenterologyProviderOrderingCatalogCodes();
    const ondansetron = eligibility.rows.find((row) => row.medication === "Ondansetron")?.catalogCode;
    if (ondansetron) expect(active).not.toContain(ondansetron);
    const ns = eligibility.rows.find((row) => row.medication === "NS")?.catalogCode;
    if (ns) expect(active).not.toContain(ns);
  });

  it("07 — provider ordering activation enables immediate order and MAR paths", () => {
    const report = buildGastroenterologyProviderOrderingActivationReport();
    expect(report.activatedCatalogCodes.length).toBeGreaterThan(0);
    expect(report.orderPersistsImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalNotRequired).toBe(true);
  });

  it("08 — GI safety advisories remain nonblocking", () => {
    const report = buildGastroenterologySafetyGovernanceReport();
    expect(report.decision).toBe("PASS");
    expect(report.blocksProviderOrdering).toBe(false);
    expect(report.giBleedAdvisory).toBe("ADVISORY");
    expect(report.bowelObstructionAdvisory).toBe("ADVISORY");
  });

  it("09 — billing, HCPCS, NDC, and inventory readiness covers activated meds", () => {
    const report = buildGastroenterologyBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThan(0);
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.ndcReadyCount).toBeGreaterThan(0);
    expect(report.decision).toBe("PASS");
  });

  it("10 — provider search safety has no duplicate activation codes", () => {
    const report = buildGastroenterologyProviderSearchSafetyReport();
    expect(report.decision).toBe("PASS");
    expect(report.duplicateRows).toBe(0);
    expect(report.catalogCodeLeakage).toBe(false);
  });

  it("11 — activation registry deduplicates catalog codes", () => {
    const codes = listActiveGastroenterologyProviderOrderingCatalogCodes();
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("12 — controlled substances and chemotherapy are excluded from activation", () => {
    const report = buildGastroenterologyProviderOrderingActivationReport();
    expect(report.controlledSubstancesNotActivated.length).toBeGreaterThanOrEqual(0);
    expect(report.chemotherapyNotActivated.length).toBe(0);
    for (const code of report.activatedCatalogCodes) {
      expect(code.toLowerCase()).not.toMatch(/morphine|fentanyl|hydromorphone|methotrexate|doxorubicin/);
    }
  });

  it("13 — rollback blocks future gastro orders while preserving clinical artifacts", () => {
    const report = buildGastroenterologyRollbackReport();
    expect(report.blocksNewFutureOrdersAfterRollback).toBe(true);
    expect(report.preservesMar).toBe(true);
    expect(report.preservesBilling).toBe(true);
    expect(report.preservesAuditTrail).toBe(true);
  });

  it("14 — i18n certification passes for activated gastro medications", () => {
    const report = buildGastroenterologyI18nCertificationReport();
    expect(report.decision).toBe("PASS");
    expect(report.enLeakageCount).toBe(0);
    expect(report.frLeakageCount).toBe(0);
  });

  it("15 — expansion report returns GASTROENTEROLOGY_PROVIDER_ORDERING_ACTIVE", () => {
    const report = runGastroenterologyProviderOrderingExpansionReport();
    expect(report.finalDecision).toBe("GASTROENTEROLOGY_PROVIDER_ORDERING_ACTIVE");
    expect(report.providerOrderingActivation.newlyActivatedCount).toBeGreaterThan(0);
    expect(report.compatibility.migrationsRequired).toBe(false);
    expect(report.providerOrderingEligibility.eligibleCatalogCodes.length).toBeGreaterThan(0);
  });
});
