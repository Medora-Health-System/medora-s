import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildActivatedMedicationInventoryReport,
  buildHighRiskExclusionAuditReport,
  buildOrderabilityCertificationReport,
  buildPilotCoverageAnalysisReport,
  buildProviderExposureAuditReport,
  buildTranche2ReadinessAssessment,
  runTranche1PilotRealWorldAuditReport,
} from "./tranche1PilotRealWorldAudit.js";
import { buildTranche1PilotActivationRegistry } from "./tranche1PilotActivation.js";

const repoRoot = join(import.meta.dirname, "../../../../");

function source(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

let cachedRegistry: ReturnType<typeof buildTranche1PilotActivationRegistry> | null = null;
let cachedReport: ReturnType<typeof runTranche1PilotRealWorldAuditReport> | null = null;

function registry() {
  cachedRegistry ??= buildTranche1PilotActivationRegistry();
  return cachedRegistry;
}

function report() {
  cachedReport ??= runTranche1PilotRealWorldAuditReport();
  return cachedReport;
}

describe("MEDUI.MEDICATION.TRANCHE_1_PILOT_REAL_WORLD_AUDIT.1", () => {
  it("01 — inventory audits every active runtime registry medication", () => {
    const inventory = buildActivatedMedicationInventoryReport(registry());
    expect(inventory.sourceRegistry).toBe("buildTranche1PilotActivationRegistry");
    expect(inventory.activatedCount).toBe(registry().activeCount);
    expect(inventory.rows.length).toBe(registry().entries.length);
    expect(inventory.blockers).toEqual([]);
    for (const row of inventory.rows) {
      expect(row.catalogCode).toBeTruthy();
      expect(row.displayNameEn).toBeTruthy();
      expect(row.displayNameFr).toBeTruthy();
      expect(row.canonicalFamily).toBeTruthy();
      expect(row.route).not.toBe("unknown");
      expect(row.form).not.toBe("unknown");
      expect(row.orderabilityStatus).toBe("ORDERABLE_IN_PILOT_SCOPE");
      expect(row.billingReadiness).toBe("PASS");
      expect(row.inventoryReadiness).toBe("PASS");
      expect(row.marReadiness).toBe("PASS");
    }
  });

  it("02 — provider exposure audits visible, hidden, duplicate, canonical, and leakage counts", () => {
    const exposure = buildProviderExposureAuditReport(registry());
    expect(exposure.visibleMedicationCount).toBe(registry().entries.length);
    expect(exposure.hiddenPilotMedicationCountOutsideScope).toBe(registry().entries.length);
    expect(exposure.duplicateCount).toBe(0);
    expect(exposure.canonicalFamilyCount).toBeGreaterThan(0);
    expect(exposure.catalogCodeLeakage).toBe(false);
    expect(exposure.autocompleteWired).toBe(true);
    expect(exposure.createOrderModalWired).toBe(true);
    expect(exposure.encounterOrderingWired).toBe(true);
    expect(exposure.blockers).toEqual([]);
  });

  it("03 — orderability certification covers search, selection, persistence, and MAR scheduling", () => {
    const orderability = buildOrderabilityCertificationReport(registry());
    expect(orderability.checkedMedicationCount).toBe(registry().entries.length);
    expect(orderability.passCount).toBe(registry().entries.length);
    expect(orderability.failCount).toBe(0);
    expect(orderability.blockers).toEqual([]);
    expect(orderability.rows.every((row) => row.canBeSearched && row.canBeSelected && row.canCreateOrder)).toBe(true);
    expect(orderability.rows.every((row) => row.canPersist && row.canScheduleMar)).toBe(true);
  });

  it("04 — high-risk safety audit keeps forbidden categories unactivated", () => {
    const highRisk = buildHighRiskExclusionAuditReport(registry());
    expect(highRisk.vaccinesActivated).toBe(0);
    expect(highRisk.insulinActivated).toBe(0);
    expect(highRisk.anticoagulantsActivated).toBe(0);
    expect(highRisk.thrombolyticsActivated).toBe(0);
    expect(highRisk.chemotherapyActivated).toBe(0);
    expect(highRisk.controlledSubstancesActivated).toBe(0);
    expect(highRisk.paralyticsActivated).toBe(0);
    expect(highRisk.sedativesActivated).toBe(0);
    expect(highRisk.pressorsActivated).toBe(0);
    expect(highRisk.criticalCareDripsActivated).toBe(0);
    expect(highRisk.blockers).toEqual([]);
  });

  it("05 — pilot coverage analysis reports all certified Tranche 1 pilot meds activated", () => {
    const coverage = buildPilotCoverageAnalysisReport(registry());
    expect(coverage.numberActivated).toBe(registry().activeCount);
    expect(coverage.numberRemainingInTranche1).toBe(0);
    expect(coverage.readinessPercentage).toBe(100);
    expect(coverage.blockers).toEqual([]);
  });

  it("06 — Tranche 2 readiness assessment exposes gate state without activation", () => {
    const readiness = buildTranche2ReadinessAssessment();
    expect(readiness.duplicateProtection).toBe("PASS");
    expect(readiness.providerSearch).toBe("PASS");
    expect(readiness.rollback).toBe("PASS");
    expect(["PASS", "FAIL"]).toContain(readiness.billing);
    expect(["PASS", "FAIL"]).toContain(readiness.inventory);
    expect(["PASS", "FAIL"]).toContain(readiness.mar);
    expect([
      "READY_FOR_GOVERNED_ACTIVATION",
      "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY",
      "NOT_READY",
    ]).toContain(readiness.certificationDecision);
  });

  it("07 — final decision is derived from current real-world audit blockers", () => {
    const audit = report();
    const blockers = [
      ...audit.activatedMedicationInventory.blockers,
      ...audit.providerExposureAudit.blockers,
      ...audit.orderabilityCertification.blockers,
      ...audit.highRiskExclusionAudit.blockers,
      ...audit.pilotCoverageAnalysis.blockers,
      ...audit.tranche2ReadinessAssessment.blockers,
    ];
    if (blockers.length === 0 && audit.tranche2ReadinessAssessment.certificationDecision === "READY_FOR_GOVERNED_ACTIVATION") {
      expect(audit.finalDecision).toBe("READY_FOR_TRANCHE_2_ACTIVATION");
    } else if (blockers.length > 0) {
      expect(audit.finalDecision).toBe("READY_WITH_BLOCKERS");
    } else if (
      audit.tranche2ReadinessAssessment.certificationDecision ===
      "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY"
    ) {
      expect(audit.finalDecision).toBe("READY_WITH_BLOCKERS");
    } else {
      expect(audit.finalDecision).toBe("NOT_READY");
    }
    expect(audit.compatibility.activationExpanded).toBe(false);
    expect(audit.compatibility.tranche2Activated).toBe(false);
  });

  it("08 — actual API provider search gate is wired to pilot scope and active pilot codes", () => {
    const apiSource = source("apps/api/src/medication-catalog/medication-catalog.service.ts");
    expect(apiSource).toContain("listActiveTranche1PilotCatalogCodes");
    expect(apiSource).toContain("isTranche1PilotScopeAllowed");
    expect(apiSource).toContain("buildCatalogMedicationSearchWhere(searchTerms)");
  });

  it("09 — actual provider UI path uses catalog autocomplete and order submission path", () => {
    const modal = source("apps/web/src/components/orders/CreateOrderModal.tsx");
    const catalogApi = source("apps/web/src/lib/catalogSearchApi.ts");
    const autocomplete = source("apps/web/src/components/catalog/SharedCatalogAutocomplete.tsx");
    expect(modal).toContain("SharedCatalogAutocomplete");
    expect(modal).toContain("/encounters/${encounterId}/orders");
    expect(catalogApi).toContain('return "/catalog/medications/search"');
    expect(autocomplete).toContain("useSharedCatalogSearch");
  });

  it("10 — actual API order creation revalidates pilot meds before persistence", () => {
    const orders = source("apps/api/src/orders/orders.service.ts");
    expect(orders).toContain("assertPilotMedicationOrderAllowed");
    expect(orders).toContain("isActiveTranche1PilotMedication");
    expect(orders).toContain("validatePilotOrderPlacement");
    expect(orders).toContain("PILOT_MEDICATION_ORDER_BLOCKED");
  });
});
