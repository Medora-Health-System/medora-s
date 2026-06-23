import { describe, expect, it } from "vitest";
import {
  buildBillingMonitoringReport,
  buildHighRiskMedicationSurveillanceReport,
  buildInventoryMonitoringReport,
  buildMedicationExecutiveMonitoringDashboard,
  buildMedicationMarMonitoringReport,
  buildMedicationMonitoringI18nCertificationReport,
  buildMedicationOrderMonitoringReport,
  buildMedicationSafetySurveillanceReport,
  buildPharmacyWorkflowMonitoringReport,
  buildProviderSearchQualityMonitoringReport,
  buildRollbackReadinessMonitoringReport,
  runMedicationRealWorldMonitoringReport,
} from "./tranche2RealWorldMonitoring.js";

describe("MEDUI.MEDICATION.TRANCHE_2_REAL_WORLD_MONITORING.1", () => {
  it("01 — order monitoring metrics", () => {
    const report = buildMedicationOrderMonitoringReport();
    expect(report.searchCount).toBeGreaterThanOrEqual(report.orderCount);
    expect(report.orderCount).toBeGreaterThan(0);
    expect(report.hardStopBlocks).toBeGreaterThan(0);
  });

  it("02 — MAR monitoring metrics", () => {
    const report = buildMedicationMarMonitoringReport();
    expect(report.scheduledCount).toBeGreaterThan(0);
    expect(report.administeredCount).toBe(report.scheduledCount);
  });

  it("03 — pharmacy monitoring metrics", () => {
    const report = buildPharmacyWorkflowMonitoringReport();
    expect(report.reviewCount).toBeGreaterThan(0);
    expect(report.pharmacyReviewBlocksOrders).toBe(false);
    expect(report.pharmacyReviewBlocksMar).toBe(false);
  });

  it("04 — billing monitoring metrics", () => {
    const report = buildBillingMonitoringReport();
    expect(report.chargeSuccess).toBeGreaterThan(0);
    expect(report.chargeFailure).toBe(0);
  });

  it("05 — inventory monitoring metrics", () => {
    const report = buildInventoryMonitoringReport();
    expect(report.inventorySuccess).toBeGreaterThan(0);
    expect(report.inventoryFailure).toBe(0);
  });

  it("06 — provider search monitoring", () => {
    const report = buildProviderSearchQualityMonitoringReport();
    expect(report.duplicateRows).toBe(0);
    expect(report.canonicalFamilyCollisions).toBe(0);
    expect(report.catalogCodeLeakage).toBe(0);
    expect(report.enFrNamesPreserved).toBe(true);
  });

  it("07 — safety surveillance", () => {
    const report = buildMedicationSafetySurveillanceReport();
    expect(report.duplicateCollisionBlocks).toBe(true);
    expect(report.allSafetyGatesActive).toBe(true);
  });

  it("08 — rollback monitoring", () => {
    const report = buildRollbackReadinessMonitoringReport();
    expect(report.tranche1RollbackReady).toBe(true);
    expect(report.tranche2RollbackReady).toBe(true);
    expect(report.auditPreservation).toBe(true);
  });

  it("09 — executive dashboard score", () => {
    const dashboard = buildMedicationExecutiveMonitoringDashboard();
    expect(dashboard.health.score).toBeGreaterThanOrEqual(95);
    expect(dashboard.finalDecision).toBe("OPERATIONALLY_HEALTHY");
  });

  it("10 — high-risk exclusion monitoring", () => {
    const report = buildHighRiskMedicationSurveillanceReport();
    expect(Object.values(report).every((value) => value === false)).toBe(true);
  });

  it("11 — EN localization", () => {
    const report = buildMedicationMonitoringI18nCertificationReport();
    expect(report.enNoFrLeakage).toBe(true);
    expect(report.labels.en).toContain("Provider ordering");
  });

  it("12 — FR localization", () => {
    const report = buildMedicationMonitoringI18nCertificationReport();
    expect(report.frNoEnLeakage).toBe(true);
    expect(report.labels.fr).toContain("Commandes prescripteur");
  });

  it("13 — full release monitoring certification", () => {
    const report = runMedicationRealWorldMonitoringReport();
    expect(report.baseline.tranche1).toBe("ACTIVE");
    expect(report.baseline.tranche2).toBe("ACTIVE");
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.providerOrderingChanged).toBe(false);
    expect(report.finalDecision).toBe("OPERATIONALLY_HEALTHY");
  });
});
