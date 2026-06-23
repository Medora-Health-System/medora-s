import { describe, expect, it } from "vitest";
import {
  buildEmergencyI18nCertificationReport,
  buildEmergencyOperationalSafetyReport,
  buildEmergencyProviderSearchSafetyReport,
  buildEmergencyReadinessRecalculationReport,
  buildEmergencyWorkflowMatrixReport,
  buildHighRiskExclusionRecertificationReport,
  buildSafeEdActivationCandidateReport,
  buildTranche3ActivationEligibilityReport,
  buildTranche3EdInventoryRecertificationReport,
  buildTranche3RecheckBaselineReport,
  runTranche3EdSafeActivationRecheck,
  TRANCHE3_ED_WORKFLOW_EXPECTATIONS,
} from "./tranche3EdSafeActivationRecheck.js";

describe("MEDUI.MEDICATION.TRANCHE_3_ED_SAFE_ACTIVATION_RECHECK.1", () => {
  it("01 — Behavioral Health remediation present", () => {
    const baseline = buildTranche3RecheckBaselineReport();
    expect(baseline.behavioralHealthRemediationCompleted).toBe(true);
    expect(baseline.behavioralHealthWorkflowCompatibilityReport).toBe("PASS");
  });

  it("02 — Ziprasidone catalog presence", () => {
    const baseline = buildTranche3RecheckBaselineReport();
    expect(baseline.ziprasidoneCatalogCodeExists).toBe(true);
    expect(baseline.ziprasidoneActivated).toBe(false);
  });

  it("03 — ED inventory recertification", () => {
    const report = buildTranche3EdInventoryRecertificationReport();
    expect(report.workflowsAudited).toBe(15);
    expect(report.medicationRowsAudited).toBeGreaterThan(40);
    expect(report.rows.some((row) => row.workflowId === "BEHAVIORAL_HEALTH" && row.medication === "Ziprasidone")).toBe(true);
  });

  it("04 — ED workflow matrix", () => {
    const matrix = buildEmergencyWorkflowMatrixReport();
    expect(matrix.workflows).toHaveLength(TRANCHE3_ED_WORKFLOW_EXPECTATIONS.length);
    expect(matrix.workflows.some((workflow) => workflow.workflowId === "BEHAVIORAL_HEALTH")).toBe(true);
  });

  it("05 — Safe candidate discovery", () => {
    const candidates = buildSafeEdActivationCandidateReport();
    expect(candidates.candidateCount).toBe(candidates.SAFE_ED_ACTIVATION_CANDIDATES.length);
    expect(candidates.SAFE_ED_ACTIVATION_CANDIDATES.every((candidate) => candidate.catalogCode.trim())).toBe(true);
  });

  it("06 — High-risk exclusion", () => {
    const report = buildHighRiskExclusionRecertificationReport();
    expect(report.thrombolyticsExcluded).toBe(true);
    expect(report.anticoagulantsExcluded).toBe(true);
    expect(report.pressorsExcluded).toBe(true);
    expect(report.paralyticsExcluded).toBe(true);
    expect(report.sedativesExcluded).toBe(true);
    expect(report.rsiMedicationsExcluded).toBe(true);
    expect(report.controlledSubstancesExcluded).toBe(true);
  });

  it("07 — Provider search safety", () => {
    const report = buildEmergencyProviderSearchSafetyReport();
    expect(report.duplicateRows).toBe(0);
    expect(report.canonicalCollisions).toBe(0);
    expect(report.catalogCodeLeakage).toBe(0);
    expect(report.decision).toBe("PASS");
  });

  it("08 — MAR safety", () => {
    expect(buildEmergencyOperationalSafetyReport().marSafety).toBe("PASS");
  });

  it("09 — Billing safety", () => {
    expect(buildEmergencyOperationalSafetyReport().billingSafety).toBe("PASS");
  });

  it("10 — Inventory safety", () => {
    expect(buildEmergencyOperationalSafetyReport().inventorySafety).toBe("PASS");
  });

  it("11 — I18n certification", () => {
    const report = buildEmergencyI18nCertificationReport();
    expect(report.enLeakageIntoFr).toBe(0);
    expect(report.frLeakageIntoEn).toBe(0);
    expect(report.workflowLabelsReady).toBe(true);
  });

  it("12 — Eligibility recalculation", () => {
    const readiness = buildEmergencyReadinessRecalculationReport();
    const eligibility = buildTranche3ActivationEligibilityReport();
    expect(readiness.emergencyMedicationPresenceCertification).toBe("PASS");
    expect(readiness.emergencyWorkflowCompatibilityReport).toBe("PASS");
    expect(["TRANCHE_3_READY_FOR_SAFE_ACTIVATION", "READY_WITH_BLOCKERS", "NOT_READY"]).toContain(eligibility.finalDecision);
  });

  it("13 — Release gate report preserves no-runtime-change compatibility", () => {
    const report = runTranche3EdSafeActivationRecheck();
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.providerSearchChanged).toBe(false);
    expect(report.compatibility.marBehaviorChanged).toBe(false);
    expect(report.compatibility.billingBehaviorChanged).toBe(false);
    expect(report.compatibility.inventoryBehaviorChanged).toBe(false);
    expect(report.compatibility.providerExposureExpanded).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
