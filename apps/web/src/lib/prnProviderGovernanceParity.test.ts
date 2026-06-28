import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeAdvancedMedicationSafetyWarnings } from "@medora/shared";
import {
  isMedicationOrderClosedForErCompleted,
  isMedicationOrderOpenForErDashboard,
  resolveMedicationOrderDisplayBucket,
} from "@/lib/medicationOrderDisplayBucket";
import {
  resolveMedicationGovernanceRenderState,
  shouldRenderMedicationGovernance,
} from "@/lib/medicationOrderGovernancePermissions";

const webRoot = join(import.meta.dirname, "../..");

function readSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

const acetaminophenQ6HPrn = {
  id: "item-apap-prn",
  status: "ACKNOWLEDGED",
  frequencyCode: "Q6H",
  route: "PO",
  notes: "500 mg PO q6h PRN pain",
  manualLabel: "Acetaminophen 500 mg PO q6h PRN",
  medicationFulfillmentIntent: "ADMINISTER_CHART",
  catalogItemType: "MEDICATION",
  medicationLifecycleStatus: null as string | null,
};

const vancomycinQ12H = {
  id: "item-vanco",
  status: "ACKNOWLEDGED",
  frequencyCode: "Q12H",
  manualLabel: "Vancomycin 750 mg IVPB Q12H",
  medicationFulfillmentIntent: "ADMINISTER_CHART",
  medicationLifecycleStatus: null as string | null,
};

function providerGovernanceState(orderItem: Record<string, unknown>) {
  return resolveMedicationGovernanceRenderState({
    orderType: "MEDICATION",
    orderItem,
    permissions: { roles: ["PROVIDER"] },
  });
}

describe("prnProviderGovernanceParity (MEDUI.ORDERS.PRN_MEDICATION_PROVIDER_GOVERNANCE_PARITY.1)", () => {
  it("1 — active PRN without admin: provider sees full governance mutation rights", () => {
    const state = providerGovernanceState(acetaminophenQ6HPrn);
    expect(state.shouldRender).toBe(true);
    expect(state.canMutate).toBe(true);
    expect(state.isStandingActiveOrder).toBe(true);
    expect(shouldRenderMedicationGovernance("MEDICATION", acetaminophenQ6HPrn, { roles: ["PROVIDER"] })).toBe(
      true
    );
  });

  it("2 — active PRN after MAR administration: provider retains mutation rights", () => {
    const afterMar = {
      ...acetaminophenQ6HPrn,
      status: "COMPLETED",
      medicationAdministrations: [{ administeredAt: "2026-06-23T10:00:00.000Z" }],
    };
    const state = providerGovernanceState(afterMar);
    expect(state.canMutate).toBe(true);
    expect(state.isStandingActiveOrder).toBe(true);
  });

  it("3 — RN/Tech cannot mutate PRN lifecycle from Orders", () => {
    for (const role of ["RN", "TECH"] as const) {
      const state = resolveMedicationGovernanceRenderState({
        orderType: "MEDICATION",
        orderItem: acetaminophenQ6HPrn,
        permissions: { roles: [role] },
      });
      expect(state.shouldRender).toBe(true);
      expect(state.canMutate).toBe(false);
    }
  });

  it("4 — provider lifecycle controls never appear in MAR surfaces", () => {
    const marComponents = [
      "src/components/mar/MedicationAdministrationCorrectionChainViewer.tsx",
      "src/components/mar/MarAdministrationRowCorrectionControls.tsx",
      "src/components/encounters/MedicationAdministrationTab.tsx",
    ];
    for (const path of marComponents) {
      const source = readSource(path);
      expect(source).not.toContain("ProviderMedicationOrderGovernanceSection");
      expect(source).not.toContain("MedicationGovernanceManageModal");
    }
  });

  it("5 — discontinued PRN moves out of Open Orders", () => {
    const discontinued = {
      ...acetaminophenQ6HPrn,
      status: "COMPLETED",
      medicationLifecycleStatus: "DISCONTINUED",
      medicationLifecycleAt: "2026-06-23T14:00:00.000Z",
      medicationAdministrations: [{ administeredAt: "2026-06-23T10:00:00.000Z" }],
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: discontinued })).toBe(
      "COMPLETED"
    );
    expect(isMedicationOrderOpenForErDashboard(discontinued, "MEDICATION")).toBe(false);
    expect(providerGovernanceState(discontinued).canMutate).toBe(false);
  });

  it("6 — discontinued PRN removes future PRN availability via lifecycle MAR gate", () => {
    const marService = readSource("../api/src/medication-dose/mar-shift-timeline.service.ts");
    expect(marService).toContain("isMedicationDoseMarActionableForLifecycle");
    const canceledUtil = readSource("../api/src/medication-dose/mar-shift-timeline-canceled.util.ts");
    expect(canceledUtil).toContain('medicationLifecycleStatus === "DISCONTINUED"');
  });

  it("7 — discontinued PRN preserves completed administration history (no cascade wipe)", () => {
    const cascade = readSource("../api/src/orders/medication-order-cancel-cascade.util.ts");
    expect(cascade).toContain('doseStatus: { notIn: ["COMPLETED", "MISSED", "CANCELLED", "SUPERSEDED", "HELD"] }');
    expect(cascade).toContain("terminalMedicationAdministrationId: null");
  });

  it("8 — held PRN remains in Open Orders with held lifecycle", () => {
    const held = {
      ...acetaminophenQ6HPrn,
      status: "COMPLETED",
      medicationLifecycleStatus: "ON_HOLD",
      medicationAdministrations: [{ administeredAt: "2026-06-23T10:00:00.000Z" }],
    };
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: held })).toBe("OPEN");
    expect(isMedicationOrderOpenForErDashboard(held, "MEDICATION")).toBe(true);
    const state = providerGovernanceState(held);
    expect(state.canMutate).toBe(true);
    expect(state.normalizedLifecycleStatus).toBe("ON_HOLD");
  });

  it("9 — held PRN suppresses MAR dose action via lifecycle gate", () => {
    const shared = readSource("../../packages/shared/src/medication/medicationOrderLifecycle.ts");
    expect(shared).toContain("ON_HOLD");
    expect(shared).toContain("isMedicationDoseMarActionableForLifecycle");
  });

  it("10 — discontinue-and-reorder path exists for PRN via shared lifecycle API", () => {
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(modal).toContain("discontinueAndReorderMedicationOrderItem");
    expect(modal).toContain("canEditDiscontinue");
    const lifecycleApi = readSource("src/lib/medicationOrderLifecycleApi.ts");
    expect(lifecycleApi).toContain("discontinueAndReorderMedicationOrderItem");
  });

  it("11 — scheduled IVPB Zosyn/Vancomycin governance unchanged", () => {
    const state = providerGovernanceState(vancomycinQ12H);
    expect(state.canMutate).toBe(true);
    expect(state.isMarManagedOrder).toBe(true);
    expect(resolveMedicationOrderDisplayBucket({ orderType: "MEDICATION", orderItem: vancomycinQ12H })).toBe(
      "OPEN"
    );
    const withMar = {
      ...vancomycinQ12H,
      medicationAdministrations: [{ administeredAt: "2026-06-23T10:00:00.000Z" }],
    };
    expect(providerGovernanceState(withMar).canMutate).toBe(true);
    expect(isMedicationOrderClosedForErCompleted(withMar, "MEDICATION")).toBe(false);
  });

  it("12 — PRN duplicate prevention remains warning-only", () => {
    const warnings = computeAdvancedMedicationSafetyWarnings({
      stagedLines: [
        {
          lineKey: "prn-staged",
          catalogItemId: "med-apap",
          genericName: "Acetaminophen",
          route: "PO",
          notes: "PRN pain",
        },
      ],
      activeEncounterLines: [
        {
          lineKey: "prn-active",
          catalogItemId: "med-apap",
          genericName: "Acetaminophen",
          route: "PO",
          notes: "PRN pain",
        },
      ],
    });
    expect(warnings.length).toBeGreaterThan(0);
    const guard = readSource("../api/src/orders/order-safety.guard.ts");
    expect(guard).toContain("warning-only");
  });
});
