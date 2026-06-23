import { describe, expect, it } from "vitest";
import {
  buildPilotBillingInventoryValidationReport,
  buildPilotMarValidationReport,
  buildPilotMonitoringBaselineReport,
  buildPilotMonitoringMetricsReport,
  buildPilotOrderCreationValidationReport,
  buildPilotRollbackDrillReport,
  buildPilotSafetyRegressionReport,
  buildProviderSearchPilotValidationReport,
  buildTranche1ActivatedMedicationInventory,
  runTranche1PilotMonitoringValidationReport,
} from "./tranche1PilotMonitoringValidation.js";
import { buildTranche1PilotActivationRegistry } from "./tranche1PilotActivation.js";

let cachedRegistry: ReturnType<typeof buildTranche1PilotActivationRegistry> | null = null;
let cachedReport: ReturnType<typeof runTranche1PilotMonitoringValidationReport> | null = null;

function registry() {
  cachedRegistry ??= buildTranche1PilotActivationRegistry();
  return cachedRegistry;
}

function report() {
  cachedReport ??= runTranche1PilotMonitoringValidationReport();
  return cachedReport;
}

describe("MEDUI.MEDICATION.TRANCHE_1_PILOT_MONITORING_AND_VALIDATION.1", () => {
  it("01 — baseline confirms pilot wiring, scope, duplicate safety, and rollback", () => {
    const baseline = buildPilotMonitoringBaselineReport(registry());
    expect(baseline.tranche1PilotActivationWired).toBe(true);
    expect(baseline.pilotFacilityProviderScopeActive).toBe(true);
    expect(baseline.highRiskMedsExposed).toBe(false);
    expect(baseline.duplicateProviderSearchRows).toBe(0);
    expect(baseline.rollbackAvailable).toBe(true);
    expect(baseline.blockers).toEqual([]);
  });

  it("02 — inventory lists every currently pilot-activated medication", () => {
    const inventory = buildTranche1ActivatedMedicationInventory(registry());
    expect(inventory.activatedCount).toBe(registry().entries.length);
    expect(inventory.items.length).toBe(registry().entries.length);
    expect(inventory.blockers).toEqual([]);
    for (const item of inventory.items) {
      expect(item.catalogCode).toBeTruthy();
      expect(item.displayName).toBeTruthy();
      expect(item.canonicalFamily).toBeTruthy();
      expect(item.orderabilityStatus).toBe("ORDERABLE_IN_PILOT_SCOPE");
      expect(item.rollbackStatus).toBe("ACTIVE");
      expect(item.safetyGates.every((gate) => gate.status === "PASS")).toBe(true);
    }
  });

  it("03 — provider search validation passes for pilot scope and hides non-pilot scope", () => {
    const search = buildProviderSearchPilotValidationReport(registry());
    expect(search.pilotActivatedMedsVisible).toBe(true);
    expect(search.pilotDuplicateRows).toBe(0);
    expect(search.pilotCatalogCodeLeakage).toBe(false);
    expect(search.canonicalNamesCorrect).toBe(true);
    expect(search.englishLabelsCorrect).toBe(true);
    expect(search.frenchLabelsCorrect).toBe(true);
    expect(search.nonPilotMedsHidden).toBe(true);
    expect(search.blockers).toEqual([]);
  });

  it("04 — order creation validation allows pilot meds and blocks unsafe cases", () => {
    const orders = buildPilotOrderCreationValidationReport(registry());
    expect(orders.pilotMedOrderSucceeds).toBe(true);
    expect(orders.outOfScopeOrderBlocked).toBe(true);
    expect(orders.rolledBackMedBlocked).toBe(true);
    expect(orders.highRiskMedBlocked).toBe(true);
    expect(orders.duplicateMedBlocked).toBe(true);
    expect(orders.blockers).toEqual([]);
  });

  it("05 — MAR validation confirms schedule/admin compatibility and vaccine safety", () => {
    const mar = buildPilotMarValidationReport(registry());
    expect(mar.marScheduleCreated).toBe(true);
    expect(mar.administrationWorkflowWorks).toBe(true);
    expect(mar.nonVaccineMedsUnaffected).toBe(true);
    expect(mar.vaccineMarSafetyUnchanged).toBe(true);
    expect(mar.blockers).toEqual([]);
  });

  it("06 — billing and inventory validation confirms mappings and no simulated errors", () => {
    const billing = buildPilotBillingInventoryValidationReport(registry());
    expect(billing.billingMappingPresent).toBe(true);
    expect(billing.inventoryCompatibilityPresent).toBe(true);
    expect(billing.noChargeErrors).toBe(true);
    expect(billing.noDecrementErrors).toBe(true);
    expect(billing.blockers).toEqual([]);
  });

  it("07 — monitoring metrics include searches, orders, blocked orders, MAR, billing, inventory, and rollback", () => {
    const metrics = buildPilotMonitoringMetricsReport(registry());
    expect(metrics.searches).toBeGreaterThan(0);
    expect(metrics.ordersCreated).toBeGreaterThan(0);
    expect(metrics.blockedOrders).toBeGreaterThan(0);
    expect(metrics.pharmacyInterventions).toBeGreaterThan(0);
    expect(metrics.duplicateWarnings).toBeGreaterThan(0);
    expect(metrics.marAdministrations).toBeGreaterThan(0);
    expect(metrics.billingSuccess).toBeGreaterThan(0);
    expect(metrics.inventorySuccess).toBeGreaterThan(0);
    expect(metrics.rollbackEvents).toBeGreaterThan(0);
    expect(metrics.totalEvents).toBe(9);
  });

  it("08 — rollback drill removes search, blocks new orders, and preserves history contracts", () => {
    const rollback = buildPilotRollbackDrillReport(registry());
    expect(rollback.catalogCode).toBeTruthy();
    expect(rollback.removedFromSearch).toBe(true);
    expect(rollback.newOrdersBlocked).toBe(true);
    expect(rollback.historicalOrdersPreserved).toBe(true);
    expect(rollback.marPreserved).toBe(true);
    expect(rollback.billingPreserved).toBe(true);
    expect(rollback.auditEventRecorded).toBe(true);
    expect(rollback.blockers).toEqual([]);
  });

  it("09 — safety regression confirms high-risk categories remain inactive", () => {
    const safety = buildPilotSafetyRegressionReport(registry());
    expect(safety.vaccinesNotActivated).toBe(true);
    expect(safety.insulinNotActivated).toBe(true);
    expect(safety.anticoagulantsNotActivated).toBe(true);
    expect(safety.thrombolyticsNotActivated).toBe(true);
    expect(safety.pressorsNotActivated).toBe(true);
    expect(safety.paralyticsNotActivated).toBe(true);
    expect(safety.sedativesNotActivated).toBe(true);
    expect(safety.controlledSubstancesNotActivated).toBe(true);
    expect(safety.chemotherapyNotActivated).toBe(true);
    expect(safety.criticalCareDripsNotActivated).toBe(true);
    expect(safety.blockers).toEqual([]);
  });

  it("10 — final monitoring decision is safe to continue without expanding activation", () => {
    expect(report().finalDecision).toBe("PILOT_SAFE_TO_CONTINUE");
    expect(report().compatibility.activationExpanded).toBe(false);
    expect(report().compatibility.tranche2Activated).toBe(false);
    expect(report().compatibility.vaccineActivationChanged).toBe(false);
    expect(report().compatibility.highRiskActivationChanged).toBe(false);
    expect(report().compatibility.migrationsRequired).toBe(false);
  });
});
