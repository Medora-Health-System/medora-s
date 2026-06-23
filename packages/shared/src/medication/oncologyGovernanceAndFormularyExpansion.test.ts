import { describe, expect, it } from "vitest";
import {
  buildChemotherapyGovernanceReport,
  buildOncologyActivationRoadmapReport,
  buildOncologyBaselineReport,
  buildOncologyBillingInventoryReport,
  buildOncologyFormularyRemediationReport,
  buildOncologyInventoryReport,
  buildOncologyI18nCertificationReport,
  buildOncologyProviderOrderingEligibilityReport,
  buildOncologyProviderSearchSafetyReport,
  buildOncologyWorkflowCompatibilityReport,
  resetOncologyGovernanceAndFormularyExpansionCaches,
  runOncologyGovernanceAndFormularyExpansionReport,
} from "./oncologyGovernanceAndFormularyExpansion.js";

describe("MEDUI.MEDICATION.ONCOLOGY_GOVERNANCE_AND_FORMULARY_EXPANSION.1", () => {
  it("01 — inventory audit classifies oncology medications", () => {
    const report = buildOncologyInventoryReport();
    expect(report.rows.length).toBeGreaterThanOrEqual(20);
    expect(report.byClass.SUPPORTIVE_CARE.expected).toBeGreaterThan(0);
    expect(report.byClass.CYTOTOXIC_CHEMOTHERAPY.expected).toBeGreaterThan(0);
    expect(report.rows.some((row) => row.medication === "Ondansetron" && row.catalogPresent)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Filgrastim" && row.catalogPresent)).toBe(true);
    expect(report.rows.some((row) => row.medication === "Cyclophosphamide" && row.catalogPresent)).toBe(true);
  });

  it("02 — formulary remediation adds governed inactive oncology rows", () => {
    const report = buildOncologyFormularyRemediationReport();
    expect(report.rows).toHaveLength(6);
    expect(report.rows.every((row) => row.catalogPresent)).toBe(true);
    expect(report.rows.every((row) => row.activated === false)).toBe(true);
    expect(report.rows.every((row) => row.providerOrderable === false)).toBe(true);
    expect(report.remediatedCount).toBeGreaterThanOrEqual(6);
    expect(report.rows.find((row) => row.medication === "Filgrastim")?.ndcConfidence).toBe("review");
  });

  it("03 — chemotherapy governance requires oncology safeguards", () => {
    const report = buildChemotherapyGovernanceReport();
    expect(report.decision).not.toBe("NOT_GOVERNED");
    expect(report.rows.some((row) => row.governanceClass === "CYTOTOXIC_CHEMOTHERAPY")).toBe(true);
    expect(report.rows.every((row) => row.providerOrderingBlocked)).toBe(true);
    expect(report.rows.every((row) => row.oncologyApprovalRequired)).toBe(true);
    expect(report.rows.filter((row) => row.catalogPresent).every((row) => row.blockers.length === 0)).toBe(true);
  });

  it("04 — workflow compatibility audits oncology care paths", () => {
    const report = buildOncologyWorkflowCompatibilityReport();
    expect(report.workflows).toHaveLength(6);
    expect(report.workflows.map((row) => row.workflowId)).toContain("TUMOR_LYSIS_SYNDROME");
    expect(report.workflows.map((row) => row.workflowId)).toContain("CHEMOTHERAPY_INFUSION");
    expect(report.workflows.some((row) => row.catalogSupportPercent >= 50)).toBe(true);
    expect(report.decision).not.toBe("FAIL");
  });

  it("05 — provider ordering classification does not activate chemotherapy", () => {
    const report = buildOncologyProviderOrderingEligibilityReport();
    expect(report.activationPerformed).toBe(false);
    expect(report.safeSupportiveCareCandidates).toEqual(
      expect.arrayContaining(["Ondansetron", "Dexamethasone", "Allopurinol", "Filgrastim"])
    );
    expect(report.chemotherapyBlockedCandidates).toEqual(
      expect.arrayContaining(["Doxorubicin", "Cisplatin", "Cyclophosphamide"])
    );
    expect(
      report.rows
        .filter((row) => row.classification === "CHEMOTHERAPY_BLOCKED")
        .every((row) => !row.providerOrderable)
    ).toBe(true);
  });

  it("06 — billing audit covers oncology HCPCS and NDC mapping", () => {
    const report = buildOncologyBillingInventoryReport();
    expect(report.rowsAudited).toBeGreaterThanOrEqual(6);
    expect(report.billingReadyCount).toBeGreaterThanOrEqual(6);
    expect(report.inventoryReadyCount).toBeGreaterThanOrEqual(6);
    expect(report.rows.some((row) => row.catalogCode.includes("FILGRASTIM") && row.hcpcs === "J9271")).toBe(true);
  });

  it("07 — inventory readiness is represented in billing audit rows", () => {
    const report = buildOncologyBillingInventoryReport();
    expect(report.rows.every((row) => typeof row.inventoryReady === "boolean")).toBe(true);
    expect(report.rows.filter((row) => row.ndcConfidence === "review").length).toBeGreaterThan(0);
  });

  it("08 — provider search safety blocks chemotherapy leakage", () => {
    const report = buildOncologyProviderSearchSafetyReport();
    expect(report.chemotherapyProviderSearchBlocked).toBe(true);
    expect(report.codeLeakageProtection).toBe("PASS");
    expect(report.decision).toBe("PASS");
  });

  it("09 — i18n certification has zero EN/FR leakage for oncology rows", () => {
    const report = buildOncologyI18nCertificationReport();
    expect(report.rowsAudited).toBeGreaterThanOrEqual(6);
    expect(report.enLeakageCount).toBe(0);
    expect(report.frLeakageCount).toBe(0);
    expect(report.missingTranslations).toBe(0);
    expect(report.decision).toBe("PASS");
  });

  it("10 — roadmap and release gate report oncology governance readiness", () => {
    resetOncologyGovernanceAndFormularyExpansionCaches();
    const baseline = buildOncologyBaselineReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.anticoagulationActive).toBe(true);
    expect(baseline.insulinDiabetesActive).toBe(true);
    expect(baseline.vaccineProviderOrderingActive).toBe(true);
    expect(baseline.criticalCareProviderOrderingActive).toBe(true);

    const roadmap = buildOncologyActivationRoadmapReport();
    expect(roadmap.rows).toHaveLength(7);
    expect(roadmap.rows[0]?.phase).toBe("Supportive Care Activation");
    expect(roadmap.rows[6]?.phase).toBe("Oncology Billing Expansion");

    const report = runOncologyGovernanceAndFormularyExpansionReport();
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.chemotherapyActivationChanged).toBe(false);
    expect(report.baseline.enterpriseOncologyCoveragePercent).toBeGreaterThan(40);
    expect(["ONCOLOGY_GOVERNANCE_READY", "READY_WITH_BLOCKERS"]).toContain(report.finalDecision);
  });
});
