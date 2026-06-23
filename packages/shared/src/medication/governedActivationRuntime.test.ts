import { describe, expect, it } from "vitest";
import {
  buildActivationAuditLoggingReport,
  buildActivationImplementationBaselineReport,
  buildActivationRuntimeDesignReport,
  buildActivationSafetyValidationReport,
  buildMonitoringMetricsVerification,
  buildPilotFacilityActivationVerification,
  buildProviderOrderingEligibilityReport,
  buildRollbackVerificationReport,
  buildTranche1MedicationActivationRegistry,
  buildTranche1MedicationActivationRegistryReport,
  createActivationMonitoringEvent,
  evaluateProviderOrderingEligibility,
  rollbackMedicationActivation,
  runGovernedActivationImplementationReport,
  validateTranche1RuntimeEligibility,
} from "./governedActivationRuntime.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { TDAP_CATALOG_CODE } from "./tdapVaccineAdministration.js";

const pilot = {
  facilityId: "facility-haiti-pilot",
  providerGroupId: "provider-group-pilot",
  activatedAt: "2026-06-23T12:00:00.000Z",
  activatingAuthority: "Medication Governance Board",
};

function registry() {
  cachedRegistry ??= buildTranche1MedicationActivationRegistry(pilot);
  return cachedRegistry;
}

let cachedRegistry: ReturnType<typeof buildTranche1MedicationActivationRegistry> | null = null;

function governanceRecord(catalogCode: string) {
  const raw = buildUnifiedOrderabilityMap().get(catalogCode);
  if (!raw) throw new Error(`Missing catalog code ${catalogCode}`);
  return buildActivationGovernanceRecord(raw);
}

function monitoringEvent(catalogCode: string, metric: Parameters<typeof createActivationMonitoringEvent>[0]["metric"]) {
  return createActivationMonitoringEvent({
    catalogCode,
    metric,
    eventAt: pilot.activatedAt,
    facilityId: pilot.facilityId,
    providerGroupId: pilot.providerGroupId,
  });
}

describe("MEDUI.MEDICATION.GOVERNED_ACTIVATION_IMPLEMENTATION.1", () => {
  it("01 — baseline certifications pass before runtime activation", () => {
    const baseline = buildActivationImplementationBaselineReport();
    expect(baseline.decision).toBe("PASS");
    expect(baseline.hospitalReadiness).toBe("HOSPITAL_FORMULARY_READY_WITH_BLOCKERS");
    expect(baseline.medicationMaturity).toBe(4.5);
    expect(baseline.blockers).toEqual([]);
  });

  it("02 — runtime design includes registry, state, audit, approvals, rollback, and safety gates", () => {
    const design = buildActivationRuntimeDesignReport();
    expect(design.activationRegistry).toBe(true);
    expect(design.activationStateModel).toBe(true);
    expect(design.activationAuditRecord).toBe(true);
    expect(design.activationApprovalRecord).toBe(true);
    expect(design.activationRollbackSupport).toBe(true);
    expect(design.activationEligibilityValidation).toBe(true);
    expect(design.activationSafetyGates).toBe(true);
    expect(design.governanceDriven).toBe(true);
  });

  it("03 — Tranche 1 registry activates only eligible low-risk rows", () => {
    const r = registry();
    expect(r.tranche).toBe("TRANCHE_1_LOW_RISK");
    expect(r.activeCount).toBeGreaterThan(0);
    expect(r.unsafeActiveCatalogCodes).toEqual([]);
    expect(r.entries.every((entry) => entry.state === "ACTIVE")).toBe(true);
  });

  it("04 — active registry excludes vaccines, insulin, anticoagulants, pressors, controlled substances, and sedatives", () => {
    const forbidden = [
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
    for (const entry of registry().entries) {
      const blob = `${entry.catalogCode} ${entry.displayNameEn} ${entry.displayNameFr}`.toLowerCase();
      expect(forbidden.some((token) => blob.includes(token))).toBe(false);
    }
  });

  it("05 — Tdap vaccine remains ineligible for Tranche 1 runtime activation", () => {
    const gates = validateTranche1RuntimeEligibility(governanceRecord(TDAP_CATALOG_CODE));
    expect(gates.find((gate) => gate.gate === "forbidden category exclusion")?.passed).toBe(false);
    expect(gates.find((gate) => gate.gate === "tranche 1 eligibility")?.passed).toBe(false);
  });

  it("06 — provider ordering requires active medication and pilot scope", () => {
    const r = registry();
    const first = r.entries[0]!;
    const eligible = evaluateProviderOrderingEligibility({
      registry: r,
      catalogCode: first.catalogCode,
      facilityId: pilot.facilityId,
      providerGroupId: pilot.providerGroupId,
    });
    expect(eligible.eligible).toBe(true);
    const blocked = evaluateProviderOrderingEligibility({
      registry: r,
      catalogCode: first.catalogCode,
      facilityId: "other-facility",
      providerGroupId: pilot.providerGroupId,
    });
    expect(blocked.eligible).toBe(false);
    expect(blocked.blockers).toContain("FACILITY_NOT_IN_PILOT_SCOPE");
  });

  it("07 — provider ordering report has no unsafe eligible medications", () => {
    const report = buildProviderOrderingEligibilityReport(registry());
    expect(report.evaluatedCount).toBeGreaterThan(0);
    expect(report.eligibleCount).toBe(report.evaluatedCount);
    expect(report.blockedCount).toBe(0);
    expect(report.unsafeEligibleCount).toBe(0);
    expect(report.blockers).toEqual([]);
  });

  it("08 — activation audit logging captures approvals, enablement, safety gates, and rollback events", () => {
    const r = registry();
    const rolledBack = rollbackMedicationActivation({
      registry: r,
      catalogCode: r.entries[0]!.catalogCode,
      rolledBackAt: "2026-06-23T13:00:00.000Z",
      actor: "Medication Governance Board",
      reason: "Safety drill",
    });
    const audit = buildActivationAuditLoggingReport(rolledBack);
    expect(audit.auditRecordCount).toBeGreaterThan(0);
    expect(audit.immutableFieldsPresent).toBe(true);
    expect(audit.capturesSafetyGateOutcomes).toBe(true);
    expect(audit.capturesRollbackEvents).toBe(true);
  });

  it("09 — rollback disables future ordering while preserving audit trail", () => {
    const r = registry();
    const code = r.entries[0]!.catalogCode;
    const rolledBack = rollbackMedicationActivation({
      registry: r,
      catalogCode: code,
      rolledBackAt: "2026-06-23T13:00:00.000Z",
      actor: "Medication Governance Board",
      reason: "Safety drill",
    });
    const row = rolledBack.entries.find((entry) => entry.catalogCode === code)!;
    expect(row.state).toBe("ROLLED_BACK");
    expect(row.auditTrail.some((audit) => audit.eventType === "ROLLBACK_EXECUTED")).toBe(true);
    expect(
      evaluateProviderOrderingEligibility({
        registry: rolledBack,
        catalogCode: code,
        facilityId: pilot.facilityId,
        providerGroupId: pilot.providerGroupId,
      }).eligible
    ).toBe(false);
  });

  it("10 — rollback verification preserves historical clinical and financial records by contract", () => {
    const rollback = buildRollbackVerificationReport();
    expect(rollback.disablesFutureOrdering).toBe(true);
    expect(rollback.preservesExistingOrders).toBe(true);
    expect(rollback.preservesMarHistory).toBe(true);
    expect(rollback.preservesBillingHistory).toBe(true);
    expect(rollback.preservesInventoryHistory).toBe(true);
    expect(rollback.preservesAuditTrail).toBe(true);
  });

  it("11 — pilot controls limit facility, provider group, medication set, and enable emergency rollback", () => {
    const pilotVerification = buildPilotFacilityActivationVerification();
    expect(pilotVerification.singleFacilitySupport).toBe(true);
    expect(pilotVerification.limitedProviderGroup).toBe(true);
    expect(pilotVerification.limitedMedicationSet).toBe(true);
    expect(pilotVerification.pharmacyOversight).toBe(true);
    expect(pilotVerification.monitoringWindow).toBe(true);
    expect(pilotVerification.emergencyRollbackSupport).toBe(true);
  });

  it("12 — monitoring framework tracks all requested metrics", () => {
    const first = registry().entries[0]!;
    const events = [
      monitoringEvent(first.catalogCode, "MEDICATION_ORDER"),
      monitoringEvent(first.catalogCode, "PROVIDER_SEARCH"),
      monitoringEvent(first.catalogCode, "DUPLICATE_WARNING"),
      monitoringEvent(first.catalogCode, "PHARMACY_INTERVENTION"),
      monitoringEvent(first.catalogCode, "MAR_ADMINISTRATION"),
      monitoringEvent(first.catalogCode, "BILLING_SUCCESS"),
      monitoringEvent(first.catalogCode, "INVENTORY_SUCCESS"),
      monitoringEvent(first.catalogCode, "ADVERSE_WORKFLOW_REPORT"),
      monitoringEvent(first.catalogCode, "ROLLBACK_EVENT"),
    ];
    const monitoring = buildMonitoringMetricsVerification(events);
    expect(monitoring.metrics).toHaveLength(9);
    expect(monitoring.summary.totalEvents).toBe(9);
    expect(monitoring.summary.rollbackEvents).toBe(1);
    expect(monitoring.summary.adverseWorkflowReports).toBe(1);
  });

  it("13 — activation safety validation preserves duplicate, canonical search, vaccine, critical care, anticoag, MAR, billing, and inventory protections", () => {
    const safety = buildActivationSafetyValidationReport();
    expect(safety.duplicatePrevention).toBe("PASS");
    expect(safety.canonicalProviderSearch).toBe("PASS");
    expect(safety.activationCollisionPrevention).toBe("PASS");
    expect(safety.vaccineGovernanceUnchanged).toBe("PASS");
    expect(safety.criticalCareGovernanceUnchanged).toBe("PASS");
    expect(safety.anticoagulationGovernanceUnchanged).toBe("PASS");
    expect(safety.marSafetyUnchanged).toBe("PASS");
    expect(safety.billingUnchanged).toBe("PASS");
    expect(safety.inventoryUnchanged).toBe("PASS");
    expect(safety.blockers).toEqual([]);
  });

  it("14 — registry report exposes active count and examples without unsafe activations", () => {
    const report = buildTranche1MedicationActivationRegistryReport(registry());
    expect(report.tranche).toBe("TRANCHE_1_LOW_RISK");
    expect(report.registeredMedicationCount).toBeGreaterThan(0);
    expect(report.activeMedicationCount).toBe(report.registeredMedicationCount);
    expect(report.unsafeActiveMedicationCount).toBe(0);
    expect(report.exampleEligibleCatalogCodes.length).toBeGreaterThan(0);
  });

  it("15 — final implementation report is ready for Tranche 1 pilot activation only", () => {
    const report = runGovernedActivationImplementationReport(pilot);
    expect(report.finalDecision).toBe("READY_FOR_TRANCHE_1_PILOT_ACTIVATION");
    expect(report.compatibility.vaccineActivationChanged).toBe(false);
    expect(report.compatibility.insulinActivationChanged).toBe(false);
    expect(report.compatibility.anticoagulantActivationChanged).toBe(false);
    expect(report.compatibility.thrombolyticActivationChanged).toBe(false);
    expect(report.compatibility.criticalCareActivationChanged).toBe(false);
    expect(report.compatibility.controlledSubstanceActivationChanged).toBe(false);
    expect(report.compatibility.chemotherapyActivationChanged).toBe(false);
    expect(report.compatibility.providerSearchBehaviorChanged).toBe(false);
    expect(report.compatibility.marBehaviorChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
