import { describe, expect, it } from "vitest";
import {
  buildBillingCompatibilityVerificationReport,
  buildInventoryCompatibilityVerificationReport,
  buildMARCompatibilityVerificationReport,
  buildPilotActivationSafetyCertificationReport,
  buildPilotMonitoringVerificationReport,
  buildPilotRollbackVerificationReport,
  buildProviderOrderingVerificationReport,
  buildProviderSearchVerificationReport,
  buildTranche1ActivatedMedicationReport,
  buildTranche1PilotActivationRegistry,
  runGovernedTranche1PilotActivationReport,
} from "./tranche1PilotActivation.js";

const forbiddenTokens = [
  "vaccine",
  "tdap",
  "insulin",
  "heparin",
  "warfarin",
  "alteplase",
  "norepinephrine",
  "rocuronium",
  "morphine",
  "fentanyl",
  "lorazepam",
  "midazolam",
  "propofol",
];

let cachedRegistry: ReturnType<typeof buildTranche1PilotActivationRegistry> | null = null;

function registry() {
  cachedRegistry ??= buildTranche1PilotActivationRegistry();
  return cachedRegistry;
}

describe("MEDUI.MEDICATION.TRANCHE_1_PILOT_ACTIVATION.1", () => {
  it("01 — activates certified Tranche 1 low-risk medications only", () => {
    const report = buildTranche1ActivatedMedicationReport(registry());
    expect(report.tranche).toBe("TRANCHE_1_LOW_RISK");
    expect(report.activatedCount).toBeGreaterThan(0);
    expect(report.unsafeActivatedCount).toBe(0);
    expect(report.excludedCategories).toContain("vaccines");
    expect(report.excludedCategories).toContain("controlled substances");
    expect(report.excludedCategories).toContain("pressors");
  });

  it("02 — pilot registry does not include forbidden medication categories", () => {
    for (const entry of registry().entries) {
      const blob = `${entry.catalogCode} ${entry.displayNameEn} ${entry.displayNameFr}`.toLowerCase();
      expect(forbiddenTokens.some((token) => blob.includes(token))).toBe(false);
    }
  });

  it("03 — provider search verification keeps visibility canonical and duplicate-free", () => {
    const search = buildProviderSearchVerificationReport(registry());
    expect(search.medicationVisible).toBe(true);
    expect(search.visibleMedicationCount).toBe(registry().entries.length);
    expect(search.duplicateRows).toBe(0);
    expect(search.canonicalFamilyBehaviorPreserved).toBe(true);
    expect(search.blockers).toEqual([]);
  });

  it("04 — provider ordering contract can place and persist pilot orders", () => {
    const ordering = buildProviderOrderingVerificationReport(registry());
    expect(ordering.providerCanPlaceOrder).toBe(true);
    expect(ordering.orderPersists).toBe(true);
    expect(ordering.persistedOrderCount).toBe(ordering.evaluatedCount);
    expect(ordering.blockers).toEqual([]);
  });

  it("05 — MAR, billing, and inventory compatibility pass for activated medications", () => {
    const mar = buildMARCompatibilityVerificationReport(registry());
    const billing = buildBillingCompatibilityVerificationReport(registry());
    const inventory = buildInventoryCompatibilityVerificationReport(registry());
    expect(mar.decision).toBe("PASS");
    expect(billing.decision).toBe("PASS");
    expect(inventory.decision).toBe("PASS");
    expect(mar.checkedMedicationCount).toBe(registry().entries.length);
  });

  it("06 — rollback reverses activation eligibility and preserves historical contracts", () => {
    const rollback = buildPilotRollbackVerificationReport(registry());
    expect(rollback.activationCanBeReversed).toBe(true);
    expect(rollback.disablesFutureOrdering).toBe(true);
    expect(rollback.preservesExistingOrders).toBe(true);
    expect(rollback.preservesMarHistory).toBe(true);
    expect(rollback.preservesBillingHistory).toBe(true);
    expect(rollback.preservesInventoryHistory).toBe(true);
    expect(rollback.rollbackAuditRecorded).toBe(true);
  });

  it("07 — monitoring emits activation, pharmacy review, and duplicate warning metrics", () => {
    const monitoring = buildPilotMonitoringVerificationReport(registry());
    expect(monitoring.activationMetricsGenerated).toBe(true);
    expect(monitoring.pharmacyReviewMetricsGenerated).toBe(true);
    expect(monitoring.duplicateWarningMetricsGenerated).toBe(true);
    expect(monitoring.monitoringEventCount).toBeGreaterThanOrEqual(4);
  });

  it("08 — activation safety certification preserves guardrails", () => {
    const safety = buildPilotActivationSafetyCertificationReport(registry());
    expect(safety.lowRiskOnly).toBe(true);
    expect(safety.forbiddenMedicationActivationCount).toBe(0);
    expect(safety.duplicatePrevention).toBe("PASS");
    expect(safety.canonicalProviderSearch).toBe("PASS");
    expect(safety.vaccineGovernanceUnchanged).toBe("PASS");
    expect(safety.criticalCareGovernanceUnchanged).toBe("PASS");
    expect(safety.anticoagulationGovernanceUnchanged).toBe("PASS");
    expect(safety.blockers).toEqual([]);
  });

  it("09 — final pilot activation report is ready", () => {
    const report = runGovernedTranche1PilotActivationReport();
    expect(report.ticket).toBe("MEDUI.MEDICATION.TRANCHE_1_PILOT_ACTIVATION.1");
    expect(report.finalDecision).toBe("READY_FOR_TRANCHE_1_PILOT_ACTIVATION");
    expect(report.compatibility.vaccineActivationChanged).toBe(false);
    expect(report.compatibility.insulinActivationChanged).toBe(false);
    expect(report.compatibility.anticoagulantActivationChanged).toBe(false);
    expect(report.compatibility.thrombolyticActivationChanged).toBe(false);
    expect(report.compatibility.criticalCareActivationChanged).toBe(false);
    expect(report.compatibility.controlledSubstanceActivationChanged).toBe(false);
    expect(report.compatibility.chemotherapyActivationChanged).toBe(false);
    expect(report.compatibility.sedativeActivationChanged).toBe(false);
    expect(report.compatibility.paralyticActivationChanged).toBe(false);
    expect(report.compatibility.pressorActivationChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
