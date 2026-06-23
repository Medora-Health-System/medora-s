import { describe, expect, it } from "vitest";
import {
  auditMedicationActivationLocalization,
  buildEligibilityCertificationReport,
  buildProviderSearchSafetyReport,
  buildTdapGovernanceRegressionReport,
  buildTranche1ActivationReadinessMatrix,
  buildTranche1BillingReadinessReport,
  buildTranche1CandidateAuditReport,
  buildMedicationEngineMaturityProjectionReport,
  certifyTranche1Eligibility,
  runTranche1Certification,
  simulateTranche1Activation,
} from "./tranche1GovernedActivation.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { certifyMedicationActivation } from "./medicationActivationCertification.js";
import { classifyTrancheV2 } from "./medicationActivationExpansionRoadmapV2.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { TDAP_CATALOG_CODE } from "./tdapVaccineAdministration.js";

function records() {
  return [...buildUnifiedOrderabilityMap().values()].map(buildActivationGovernanceRecord);
}

describe("MEDUI.MEDICATION.EXPANSION_TRANCHE_1_LOW_RISK.1", () => {
  it("01 — tranche 1 certification orchestrator runs", () => {
    const report = runTranche1Certification();
    expect(report.ticket).toBe("MEDUI.MEDICATION.EXPANSION_TRANCHE_1_LOW_RISK.1");
    expect(report.candidateAudit.totalTranche1Pool).toBeGreaterThan(0);
  });

  it("02 — candidate audit reports totals", () => {
    const audit = buildTranche1CandidateAuditReport();
    expect(audit.totalTranche1Pool).toBeGreaterThan(100);
    expect(audit.safeLowRiskCandidates).toBeGreaterThan(0);
    expect(audit.controlledSubstanceBlocked).toBeGreaterThanOrEqual(0);
  });

  it("03 — no controlled substances in eligible simulation", () => {
    const sim = simulateTranche1Activation();
    const controlled = records().filter((r) => r.controlledSubstanceFlag);
    const controlledCodes = new Set(controlled.map((r) => r.catalogCode));
    expect(sim.rows.every((r) => !controlledCodes.has(r.catalogCode))).toBe(true);
  });

  it("04 — no high-risk blocked categories in simulation", () => {
    const sim = simulateTranche1Activation();
    for (const row of sim.rows) {
      const blob = row.displayNameEn.toLowerCase();
      expect(blob).not.toContain("fentanyl");
      expect(blob).not.toContain("morphine");
      expect(blob).not.toContain("norepinephrine");
      expect(blob).not.toContain("rocuronium");
    }
  });

  it("05 — certifyTranche1Eligibility fails controlled substances", () => {
    const controlled = records().find((r) => r.controlledSubstanceFlag)!;
    const cert = certifyMedicationActivation(controlled);
    const result = certifyTranche1Eligibility(controlled, cert);
    expect(result.result).toBe("FAIL");
    expect(result.blockers).toContain("CONTROLLED_SUBSTANCE");
  });

  it("06 — eligibility certification evaluates tranche 1 pool", () => {
    const report = buildEligibilityCertificationReport();
    expect(report.totalEvaluated).toBeGreaterThan(100);
    expect(report.passCount).toBeGreaterThan(0);
    expect(report.failCount).toBeGreaterThan(0);
  });

  it("07 — simulation is non-persistent", () => {
    const sim = simulateTranche1Activation();
    expect(sim.note).toContain("Simulation only");
    expect(sim.rows.every((r) => r.before.orderSearchEnabled === false)).toBe(true);
    expect(sim.rows.every((r) => r.after.orderSearchEnabled === true)).toBe(true);
  });

  it("08 — billing readiness audit runs for simulated candidates", () => {
    const billing = buildTranche1BillingReadinessReport();
    expect(billing.totalCandidates).toBe(simulateTranche1Activation().simulatedCount);
    expect(billing.passCount).toBeGreaterThan(0);
  });

  it("09 — provider search safety does not expose opioids", () => {
    const safety = buildProviderSearchSafetyReport();
    expect(safety.decision).toBe("SAFE");
    expect(safety.wouldExposeBlockedMed).toBe(false);
    expect(safety.exposedBlockedMeds).toEqual([]);
  });

  it("10 — provider search safety audits blocked categories", () => {
    const safety = buildProviderSearchSafetyReport();
    expect(safety.blockedCategories).toContain("opioids");
    expect(safety.blockedCategories).toContain("vasopressors");
  });

  it("11 — activation localization i18n audit passes", () => {
    const i18n = auditMedicationActivationLocalization();
    expect(i18n.decision).toBe("PASS");
    expect(i18n.workflowI18n.decision).toBe("PASS");
  });

  it("12 — tdap governance regression passes", () => {
    const tdap = buildTdapGovernanceRegressionReport();
    expect(tdap.decision).toBe("PASS");
    expect(tdap.remainsRestricted).toBe(true);
    expect(tdap.documentationFieldsRequired).toBe(true);
  });

  it("13 — tdap not in tranche 1 simulation", () => {
    const codes = simulateTranche1Activation().rows.map((r) => r.catalogCode);
    expect(codes).not.toContain(TDAP_CATALOG_CODE);
  });

  it("14 — readiness matrix has exact counts summing to pool", () => {
    const matrix = buildTranche1ActivationReadinessMatrix();
    const sum =
      matrix.READY_FOR_ACTIVATION +
      matrix.PHARMACY_REVIEW_REQUIRED +
      matrix.CLINICAL_REVIEW_REQUIRED +
      matrix.HIGH_RISK_BLOCKED +
      matrix.CONTROLLED_SUBSTANCE_BLOCKED +
      matrix.NOT_READY;
    expect(sum).toBe(matrix.total);
  });

  it("15 — maturity projection improves post-tranche", () => {
    const simCount = simulateTranche1Activation().simulatedCount;
    const projection = buildMedicationEngineMaturityProjectionReport(simCount);
    expect(projection.currentMaturity).toBeGreaterThan(3);
    expect(projection.postTrancheMaturity).toBeGreaterThan(projection.currentMaturity);
    expect(projection.targetMaturity).toBe(4.5);
    expect(projection.gapRemaining).toBeGreaterThan(0);
  });

  it("16 — certification decision is not NOT_READY when safety passes", () => {
    const report = runTranche1Certification();
    expect([
      "READY_FOR_GOVERNED_ACTIVATION",
      "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY",
    ]).toContain(report.decision);
  });

  it("17 — thrombolytics blocked from eligibility", () => {
    const alteplase = records().find((r) => r.displayNameEn.toLowerCase().includes("alteplase"));
    if (!alteplase) return;
    const result = certifyTranche1Eligibility(alteplase, certifyMedicationActivation(alteplase));
    expect(result.result).toBe("FAIL");
  });

  it("18 — tranche 1 pool excludes already orderable meds", () => {
    const audit = buildTranche1CandidateAuditReport();
    const orderable = records().filter((r) => r.status === "ORDERABLE");
    const candidateCodes = new Set(audit.candidates.map((c) => c.catalogCode));
    expect(orderable.every((r) => !candidateCodes.has(r.catalogCode) || classifyTrancheV2(r) !== "TRANCHE_1_LOW_RISK")).toBe(true);
  });

  it("19 — simulated activation count matches eligibility pass count", () => {
    const eligibility = buildEligibilityCertificationReport();
    const sim = simulateTranche1Activation();
    expect(sim.simulatedCount).toBe(eligibility.passCount);
  });

  it("20 — manufacturer catalog remains centralized (tdap regression)", () => {
    expect(buildTdapGovernanceRegressionReport().manufacturerCatalogCentralized).toBe(true);
  });
});
