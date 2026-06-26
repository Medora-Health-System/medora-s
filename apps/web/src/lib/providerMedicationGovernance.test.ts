import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveProviderMedicationOrderMarExecutionSummary } from "@/features/orders/providerMedicationOrderMarStatus";

const webRoot = join(import.meta.dirname, "../..");

function readSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("providerMedicationGovernance (MEDUI.ORDERS.PROVIDER_MEDICATION_GOVERNANCE_FINAL.1)", () => {
  it("ER orders panel exposes provider governance in actions rail for prescribers", () => {
    const source = readSource("src/features/emergency/EmergencyErOrdersPanel.tsx");
    expect(source).toContain("ProviderMedicationOrderGovernanceSection");
    expect(source).toContain("renderErMedicationOrderLineActions");
    expect(source).toContain("effectiveCanPrescribe ? [] : lineBtns");
    expect(source).toContain('placement: "inline"');
    expect(source).toContain("isMedicationOrderLineItem");
    const governance = readSource("src/components/orders/ProviderMedicationOrderGovernanceSection.tsx");
    expect(governance).toContain('data-testid="provider-medication-order-governance"');
    expect(governance).toContain("data-can-prescribe");
  });

  it("encounter Orders tab uses provider governance section for medication rows", () => {
    const page = readFileSync(join(webRoot, "app/app/encounters/[id]/page.tsx"), "utf8");
    expect(page).toContain("ProviderMedicationOrderGovernanceSection");
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
  });

  it("signed encounter blocks provider lifecycle panel mutations", () => {
    const panel = readSource("src/components/orders/MedicationOrderLifecyclePanel.tsx");
    expect(panel).toContain("encounterSigned");
    expect(panel).toContain("signedEncounterBlocked");
  });

  it("Vancomycin IVPB Q12H scenario uses MAR-managed chart admin path", () => {
    const policy = readSource("src/features/emergency/medicationOrderMarExecutionPolicy.ts");
    expect(policy).toContain("ADMINISTER_CHART");
    expect(policy).toContain("MEDICATION_ADMINISTRATION_EXECUTION_IN_MAR_ONLY");
  });
});

describe("providerMedicationGovernance visibility (MEDUI.ORDERS.PROVIDER_GOVERNANCE_VISIBILITY_AUDIT_AND_FIX.1)", () => {
  it("Vancomycin Q12H active order shows governance after MAR dose via standing-order helper", () => {
    const permissions = readSource("src/lib/medicationOrderGovernancePermissions.ts");
    expect(permissions).toContain("isStandingMedicationOrderLineActiveInOrders");
    expect(permissions).toContain("normalizeMedicationOrderLifecycleStatus");
  });

  it("completed-on-MAR status does not hide provider governance for standing orders", () => {
    const panel = readSource("src/features/emergency/EmergencyErOrdersPanel.tsx");
    expect(panel).toContain("isStandingMedicationOrderLineActiveInOrders");
    expect(panel).not.toContain('catalogItemType !== "MEDICATION"');
  });

  it("lifecycle panel normalizes null medicationLifecycleStatus to ACTIVE", () => {
    const panel = readSource("src/components/orders/MedicationOrderLifecyclePanel.tsx");
    expect(panel).toContain("normalizeMedicationOrderLifecycleStatus");
  });

  it("encounter Orders tab resolves effectiveCanPrescribe from roles", () => {
    const page = readFileSync(join(webRoot, "app/app/encounters/[id]/page.tsx"), "utf8");
    expect(page).toContain("auditMedicationOrderGovernancePermissions");
    expect(page).toContain("effectiveCanPrescribe");
  });

  it("provider lifecycle actions remain absent from MAR drawer components", () => {
    const marComponents = [
      "src/components/mar/MedicationAdministrationCorrectionChainViewer.tsx",
      "src/components/mar/MarAdministrationRowCorrectionControls.tsx",
      "src/components/encounters/MedicationAdministrationTab.tsx",
    ];
    for (const path of marComponents) {
      const source = readSource(path);
      expect(source).not.toContain("ProviderMedicationOrderGovernanceSection");
      expect(source).not.toContain("MedicationOrderLifecyclePanel");
    }
  });
});
