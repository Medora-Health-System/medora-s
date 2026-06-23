import { describe, expect, it } from "vitest";
import {
  buildTranche2ActivationInventoryReport,
  buildTranche2BillingInventoryReport,
  buildTranche2HighRiskExclusionReport,
  buildTranche2OrderMarActivationReport,
  buildTranche2PharmacyVisibilityReport,
  buildTranche2ProviderOrderingActivationRegistry,
  buildTranche2ProviderOrderingActivationReport,
  buildTranche2ProviderSearchUiReport,
  buildTranche2RollbackReport,
  buildTranche2SafetyFilterReport,
  isActiveTranche2ProviderOrderingMedication,
  listActiveTranche2ProviderOrderingCatalogCodes,
  rollbackTranche2ProviderOrderingActivation,
  runTranche2ProviderOrderingActivationReport,
  validateTranche2ProviderOrderPlacement,
} from "./tranche2ProviderOrderingActivation.js";
import {
  evaluateNonBlockingPharmacyWorkflow,
  buildTrueHardStopRegressionReport,
} from "./nonBlockingPharmacyReviewPolicy.js";
import { buildNonBlockingPharmacyI18nReport } from "./nonBlockingPharmacyReviewPolicy.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { buildVaccineMarAdministrationHardeningReport } from "./vaccineMarAdministrationDocumentation.js";

describe("MEDUI.MEDICATION.TRANCHE_2_PROVIDER_ORDERING_ACTIVATION.1", () => {
  it("01 — Tranche 2 inventory builds", () => {
    const inventory = buildTranche2ActivationInventoryReport();
    expect(inventory.activatedCount).toBeGreaterThan(0);
    expect(inventory.rows).toHaveLength(inventory.activatedCount);
  });

  it("02 — Tranche 2 safety filter excludes vaccines", () => {
    expect(buildTranche2HighRiskExclusionReport().vaccinesNotActivated).toBe(true);
  });

  it("03 — Tranche 2 safety filter excludes insulin", () => {
    expect(buildTranche2HighRiskExclusionReport().insulinNotActivated).toBe(true);
  });

  it("04 — Tranche 2 safety filter excludes anticoagulants", () => {
    expect(buildTranche2HighRiskExclusionReport().anticoagulantsNotActivated).toBe(true);
  });

  it("05 — Tranche 2 safety filter excludes controlled substances", () => {
    expect(buildTranche2HighRiskExclusionReport().controlledSubstancesNotActivated).toBe(true);
  });

  it("06 — Tranche 2 medication appears in provider search", () => {
    expect(buildTranche2ProviderSearchUiReport().medicationSearchApiIncludesTranche2).toBe(true);
    expect(listActiveTranche2ProviderOrderingCatalogCodes().length).toBeGreaterThan(0);
  });

  it("07 — Tranche 2 medication is selectable", () => {
    expect(buildTranche2ProviderOrderingActivationReport().selectable).toBe(true);
  });

  it("08 — Tranche 2 order persists", () => {
    expect(buildTranche2ProviderOrderingActivationReport().orderPersistsImmediately).toBe(true);
  });

  it("09 — Tranche 2 order schedules immediately to MAR", () => {
    expect(buildTranche2ProviderOrderingActivationReport().schedulesToMarImmediately).toBe(true);
  });

  it("10 — pharmacy review does not block ordering", () => {
    expect(evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true }).orderable).toBe(true);
  });

  it("11 — pharmacy review does not block MAR scheduling", () => {
    expect(evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true }).marScheduledImmediately).toBe(true);
  });

  it("12 — pharmacy review does not block administration by itself", () => {
    expect(evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true }).administrable).toBe(true);
  });

  it("13 — pharmacy visibility metadata exists", () => {
    expect(buildTranche2PharmacyVisibilityReport().pharmacyCanSeeOrders).toBe(true);
    expect(buildTranche2ActivationInventoryReport().rows.every((row) => row.pharmacyReviewVisible)).toBe(true);
  });

  it("14 — pharmacy approval wording is absent", () => {
    expect(buildTranche2ProviderSearchUiReport().forbiddenApprovalLabelsAbsent).toBe(true);
  });

  it("15 — duplicate collision still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.DUPLICATE_COLLISION).toBe(true);
  });

  it("16 — retired medication still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.RETIRED_OR_DISCONTINUED_MEDICATION).toBe(true);
  });

  it("17 — not-in-catalog medication still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.NOT_IN_CATALOG).toBe(true);
  });

  it("18 — invalid route/dose/form still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.INVALID_ROUTE_DOSE_FORM).toBe(true);
  });

  it("19 — allergy hard stop still blocks when configured", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.PATIENT_ALLERGY_HARD_STOP).toBe(true);
  });

  it("20 — rollback removes future search visibility", () => {
    const registry = buildTranche2ProviderOrderingActivationRegistry();
    const first = registry.entries[0]!;
    const rolledBack = rollbackTranche2ProviderOrderingActivation({
      registry,
      catalogCode: first.catalogCode,
      reason: "test rollback",
    });
    expect(isActiveTranche2ProviderOrderingMedication(first.catalogCode, rolledBack)).toBe(false);
    expect(validateTranche2ProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed).toBe(false);
  });

  it("21 — historical orders preserved after rollback", () => {
    const rollback = buildTranche2RollbackReport();
    expect(rollback.preservesHistoricalOrders).toBe(true);
    expect(rollback.preservesMarHistory).toBe(true);
  });

  it("22 — EN has no FR leakage", () => {
    expect(buildNonBlockingPharmacyI18nReport().enHasFrLeakage).toBe(false);
    expect(runTranche2ProviderOrderingActivationReport().i18n.candidateRows.every((row) => row.enNoFrLeakage)).toBe(true);
  });

  it("23 — FR has no EN leakage", () => {
    expect(buildNonBlockingPharmacyI18nReport().frHasEnLeakage).toBe(false);
    expect(runTranche2ProviderOrderingActivationReport().i18n.candidateRows.every((row) => row.frNoEnLeakage)).toBe(true);
  });

  it("24 — Tranche 1 remains active", () => {
    expect(runGovernedTranche1PilotActivationReport().finalDecision).toBe("READY_FOR_TRANCHE_1_PILOT_ACTIVATION");
  });

  it("25 — vaccine MAR documentation remains safe", () => {
    const vaccine = buildVaccineMarAdministrationHardeningReport();
    expect(vaccine.compatibility.marBehaviorChanged).toBe(false);
    expect(vaccine.i18n.decision).toBe("PASS");
  });

  it("26 — full release certification is active", () => {
    const report = runTranche2ProviderOrderingActivationReport();
    expect(buildTranche2SafetyFilterReport().unsafeActivatedCatalogCodes).toEqual([]);
    expect(buildTranche2OrderMarActivationReport().appearsOnMarImmediately).toBe(true);
    expect(buildTranche2BillingInventoryReport().blockers).toEqual([]);
    expect(report.finalDecision).toBe("TRANCHE_2_PROVIDER_ORDERING_ACTIVE");
  });
});
