import type { EncounterAiSnapshot } from "@medora/shared";
import { rule16DuplicateDiagnosticOrders } from "./rule-16-duplicate-diagnostic-orders.rule.js";
import { rule17CompletedDiagnosticMissingResult } from "./rule-17-completed-diagnostic-missing-result.rule.js";

const ctx = { generatedAt: "2026-09-13T16:00:00.000Z", snapshotVersion: "phase-2k" };

function snapshot(orders: any[], results: any[] = []): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2k",
    generatedAt: ctx.generatedAt,
    encounterContext: { encounterId: "11111111-1111-4111-8111-111111111111", facilityId: "22222222-2222-4222-8222-222222222222", patientId: "33333333-3333-4333-8333-333333333333", country: "US", encounterType: "EMERGENCY", status: "OPEN", careSetting: "EMERGENCY_DEPARTMENT" },
    patientContext: {}, presentation: {}, clinicalDocumentation: {},
    diagnostics: { orders, results, pendingTests: [], criticalResults: [] },
    treatments: { medicationOrders: [], medicationAdministrations: [], procedures: [] },
    diagnoses: {}, disposition: {},
  } as EncounterAiSnapshot;
}

describe("Phase 2K diagnostic order integrity", () => {
  it("flags duplicate active lab orders with the same normalized label", () => {
    const findings = rule16DuplicateDiagnosticOrders(snapshot([{ id: "o1", items: [
      { id: "i1", catalogItemType: "LAB", displayLabel: " CBC ", status: "ACTIVE" },
      { id: "i2", catalogItemType: "LAB", displayLabel: "cbc", status: "ACTIVE" },
    ] }]), ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe("ORDER_CONSIDERATION");
  });

  it("does not flag completed/cancelled copies as active duplicates", () => {
    const findings = rule16DuplicateDiagnosticOrders(snapshot([{ id: "o1", items: [
      { id: "i1", catalogItemType: "LAB", displayLabel: "CBC", status: "COMPLETED" },
      { id: "i2", catalogItemType: "LAB", displayLabel: "CBC", status: "CANCELLED" },
    ] }]), ctx);
    expect(findings).toEqual([]);
  });

  it("flags a completed diagnostic item without a linked result", () => {
    const findings = rule17CompletedDiagnosticMissingResult(snapshot([{ id: "o1", items: [
      { id: "i1", catalogItemType: "LAB", displayLabel: "CBC", status: "COMPLETED", completedAt: "2026-09-13T15:00:00.000Z" },
    ] }]), ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe("RESULT_FOLLOWUP");
  });

  it("does not flag when the completed diagnostic item has a linked result", () => {
    const findings = rule17CompletedDiagnosticMissingResult(snapshot([{ id: "o1", items: [
      { id: "i1", catalogItemType: "LAB", displayLabel: "CBC", status: "COMPLETED" },
    ] }], [{ id: "r1", orderItemId: "i1", resultedAt: "2026-09-13T15:10:00.000Z" }]), ctx);
    expect(findings).toEqual([]);
  });
});
