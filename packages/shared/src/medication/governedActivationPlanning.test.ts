import { describe, expect, it } from "vitest";
import {
  buildActivationMonitoringMetrics,
  buildActivationPlanningReadinessBaseline,
  buildActivationSafetyGateReport,
  buildEligibleMedicationActivationInventory,
  buildMedicationActivationRollbackPlan,
  buildPilotFacilityActivationPlan,
  buildTranche1ActivationPlan,
  runGovernedActivationPlanningReport,
} from "./governedActivationPlanning.js";

describe("MEDUI.MEDICATION.GOVERNED_ACTIVATION_PLANNING.1", () => {
  it("01 — readiness baseline matches latest certification state", () => {
    const baseline = buildActivationPlanningReadinessBaseline();
    expect(baseline.hospitalFormularyReadiness).toBe("HOSPITAL_FORMULARY_READY_WITH_BLOCKERS");
    expect(baseline.medicationMaturity).toBe(4.5);
    expect(baseline.providerSearchCanonicalization).toBe("PASS");
    expect(baseline.duplicateProtection).toBe("PASS");
    expect(baseline.marDocumentationSafety).toBe("PASS");
    expect(baseline.vaccineMarDocumentation).toBe("PASS");
    expect(baseline.anticoagThrombolyticGovernance).toBe("PASS");
    expect(baseline.criticalCareGovernance).toBe("PASS");
    expect(baseline.i18n).toBe("PASS");
    expect(baseline.blockers).toEqual([]);
  });

  it("02 — eligible medication inventory uses hospital readiness counts", () => {
    const inventory = buildEligibleMedicationActivationInventory();
    expect(inventory.immediatelyEligible).toBe(196);
    expect(inventory.pharmacyReviewRequired).toBe(0);
    expect(inventory.clinicalReviewRequired).toBe(6);
    expect(inventory.engineeringNotReady).toBe(242);
  });

  it("03 — tranche 1 plan is planning-only and has candidates", () => {
    const plan = buildTranche1ActivationPlan();
    expect(plan.status).toBe("PLANNING_ONLY");
    expect(plan.noRuntimeMutation).toBe(true);
    expect(plan.candidateCount).toBeGreaterThan(0);
  });

  it("04 — tranche 1 excludes vaccines and high-risk categories", () => {
    const plan = buildTranche1ActivationPlan();
    expect(plan.exclusionCriteria).toContain("Vaccines");
    expect(plan.exclusionCriteria).toContain("Controlled substances");
    expect(plan.exclusionCriteria).toContain("Insulin");
    expect(plan.exclusionCriteria).toContain("Anticoagulants");
    expect(plan.exclusionCriteria).toContain("Thrombolytics");
    expect(plan.exclusionCriteria).toContain("Pressors");
    expect(plan.exclusionCriteria).toContain("Paralytics");
    expect(plan.exclusionCriteria).toContain("Chemotherapy");
    expect(plan.exclusionCriteria).toContain("Sedatives");
    expect(plan.exclusionCriteria).toContain("High-alert medications");
    expect(plan.exclusionCriteria).toContain("Pediatric high-risk medications");
  });

  it("05 — activation safety gates require approvals and audit before orderability", () => {
    const gates = buildActivationSafetyGateReport();
    expect(gates.requiredGates).toContain("Pharmacy review visibility");
    expect(gates.requiredGates).toContain("Duplicate collision check");
    expect(gates.requiredGates).toContain("Canonical search check");
    expect(gates.requiredGates).toContain("Audit log");
    expect(gates.allGatesMustPassBeforeOrderability).toBe(true);
  });

  it("06 — rollback plan preserves historical clinical and billing records", () => {
    const rollback = buildMedicationActivationRollbackPlan();
    expect(rollback.steps).toContain("Disable orderability for the affected catalog codes");
    expect(rollback.preservesHistoricalOrders).toBe(true);
    expect(rollback.preservesMarRecords).toBe(true);
    expect(rollback.preservesBillingRecords).toBe(true);
    expect(rollback.auditRollbackEvent).toBe(true);
  });

  it("07 — pilot plan is limited to one facility and a limited provider group", () => {
    const pilot = buildPilotFacilityActivationPlan();
    expect(pilot.facilityScope).toBe("ONE_FACILITY");
    expect(pilot.providerScope).toBe("LIMITED_PROVIDER_GROUP");
    expect(pilot.medicationScope).toBe("LIMITED_TRANCHE_1_SET");
    expect(pilot.monitoringWindowDays).toBe(14);
  });

  it("08 — monitoring metrics include clinical, pharmacy, billing, inventory, search, and rollback signals", () => {
    const metrics = buildActivationMonitoringMetrics();
    expect(metrics.metrics).toContain("Order frequency");
    expect(metrics.metrics).toContain("MAR administration success");
    expect(metrics.metrics).toContain("Pharmacy interventions");
    expect(metrics.metrics).toContain("Duplicate-order warnings");
    expect(metrics.metrics).toContain("Billing charge success");
    expect(metrics.metrics).toContain("Inventory decrement success");
    expect(metrics.metrics).toContain("Provider search success");
    expect(metrics.metrics).toContain("Adverse workflow reports");
    expect(metrics.metrics).toContain("Rollback events");
  });

  it("09 — final report is ready with approvals, not activated", () => {
    const report = runGovernedActivationPlanningReport();
    expect(report.ticket).toBe("MEDUI.MEDICATION.GOVERNED_ACTIVATION_PLANNING.1");
    expect(report.finalDecision).toBe("READY_WITH_APPROVALS");
    expect(report.compatibility.medicationActivationChanged).toBe(false);
    expect(report.compatibility.providerOrderingChanged).toBe(false);
    expect(report.compatibility.providerSearchChanged).toBe(false);
    expect(report.compatibility.formularyStatusChanged).toBe(false);
    expect(report.compatibility.marBehaviorChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
