import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveProviderMedicationOrderMarExecutionSummary } from "@/features/orders/providerMedicationOrderMarStatus";
import { resolveMedicationGovernanceRenderState } from "@/lib/medicationOrderGovernancePermissions";

const webRoot = join(import.meta.dirname, "../..");

function readSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("providerMedicationGovernance (MEDUI.ORDERS.PROVIDER_MEDICATION_GOVERNANCE_FINAL.1)", () => {
  it("ER orders panel uses centralized governance render helper", () => {
    const source = readSource("src/features/emergency/EmergencyErOrdersPanel.tsx");
    expect(source).toContain("ProviderMedicationOrderGovernanceSection");
    expect(source).toContain("renderErMedicationOrderLineActions");
    expect(source).toContain("resolveMedicationGovernanceRenderState");
    expect(source).toContain("effectiveCanPrescribe ? [] : lineBtns");
    expect(source).toContain('placement: "inline"');
    const governance = readSource("src/components/orders/ProviderMedicationOrderGovernanceSection.tsx");
    expect(governance).toContain('data-testid="provider-medication-order-governance"');
    expect(governance).toContain("resolveMedicationGovernanceRenderState");
  });

  it("encounter Orders tab uses provider governance section via shared helper", () => {
    const page = readFileSync(join(webRoot, "app/app/encounters/[id]/page.tsx"), "utf8");
    expect(page).toContain("ProviderMedicationOrderGovernanceSection");
    expect(page).toContain("shouldRenderMedicationGovernance");
    expect(page).toContain("orderEventsRaw={clinicalData?.orderEvents ?? []}");
  });

  it("provider governance section includes lifecycle panel and history", () => {
    const source = readSource("src/components/orders/ProviderMedicationOrderGovernanceSection.tsx");
    expect(source).toContain("MedicationOrderLifecyclePanel");
    expect(source).toContain("medication-lifecycle-view-history");
    expect(source).toContain("provider-medication-mar-execution-status");
  });

  it("completed MAR infusion does not block provider MAR execution summary on standing order", () => {
    const summary = resolveProviderMedicationOrderMarExecutionSummary({
      itemStatus: "ACKNOWLEDGED",
      marManagedInMar: true,
      infusionTimeline: {
        active: null,
        lastCompleted: {
          infusionSessionKey: "sess-1",
          infusionStartedAtIso: "2026-06-23T08:00:00.000Z",
          infusionStoppedAtIso: "2026-06-23T10:00:00.000Z",
          durationMinutes: 120,
          startedByDisplayName: "RN Test",
          startedByTitle: null,
          stoppedByDisplayName: "RN Test",
          stoppedByTitle: null,
        },
      },
      t: (key) => key,
    });
    expect(summary).toBe("erEmergencyOrders.marStatusCompletedOnMar");
  });

  it("provider lifecycle actions are not rendered in MAR components", () => {
    const marDir = readSource("src/components/mar/MedicationAdministrationCorrectionChainViewer.tsx");
    expect(marDir).not.toContain("MedicationOrderLifecyclePanel");
    expect(marDir).not.toContain("ProviderMedicationOrderGovernanceSection");
  });

  it("lifecycle panel remains in Orders section only", () => {
    const panel = readSource("src/components/orders/MedicationOrderLifecyclePanel.tsx");
    expect(panel).toContain("medicationOrderLifecycle.actions.discontinue");
    expect(panel).not.toContain("marTab.");
    expect(panel).toContain("normalizeMedicationOrderLifecycleStatus");
  });

  it("signed encounter blocks provider lifecycle panel mutations", () => {
    const panel = readSource("src/components/orders/MedicationOrderLifecyclePanel.tsx");
    expect(panel).toContain("encounterSigned");
    expect(panel).toContain("signedEncounterBlocked");
  });

  it("Vancomycin IVPB Q12H scenario uses MAR-managed chart admin path", () => {
    const policy = readSource("src/features/emergency/medicationOrderMarExecutionPolicy.ts");
    expect(policy).toContain("isMarManagedMedicationOrderItem");
    expect(policy).toContain("MEDICATION_ADMINISTRATION_EXECUTION_IN_MAR_ONLY");
  });
});

describe("providerMedicationGovernance rendering helper (MEDUI.ORDERS.MEDICATION_GOVERNANCE_RENDERING_HELPER.1)", () => {
  it("Vancomycin Q12H active after MAR completion renders governance via shared helper", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "MEDICATION",
      orderItem: {
        id: "vanco",
        status: "ACKNOWLEDGED",
        frequencyCode: "Q12H",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        medicationLifecycleStatus: null,
      },
      permissions: { roles: ["PROVIDER"] },
    });
    expect(state.shouldRender).toBe(true);
    expect(state.canMutate).toBe(true);
  });

  it("MAR surface does not render provider lifecycle actions", () => {
    const marComponents = [
      "src/components/mar/MedicationAdministrationCorrectionChainViewer.tsx",
      "src/components/mar/MarAdministrationRowCorrectionControls.tsx",
      "src/components/encounters/MedicationAdministrationTab.tsx",
    ];
    for (const path of marComponents) {
      const source = readSource(path);
      expect(source).not.toContain("ProviderMedicationOrderGovernanceSection");
      expect(source).not.toContain("MedicationOrderLifecyclePanel");
      expect(source).not.toContain("resolveMedicationGovernanceRenderState");
    }
  });

  it("MedicationOrderLifecyclePanel uses governance helper for lifecycle normalization", () => {
    const panel = readSource("src/components/orders/MedicationOrderLifecyclePanel.tsx");
    expect(panel).toContain("normalizeMedicationOrderLifecycleStatus");
    expect(panel).toContain("canMutateLifecycle");
  });
});
