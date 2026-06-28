import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
    expect(governance).toContain("MedicationGovernanceManageButton");
  });

  it("encounter Orders tab uses provider governance section via shared helper", () => {
    const page = readFileSync(join(webRoot, "app/app/encounters/[id]/page.tsx"), "utf8");
    expect(page).toContain("ProviderMedicationOrderGovernanceSection");
    expect(page).toContain("shouldRenderMedicationGovernance");
    expect(page).toContain("orderEventsRaw={clinicalData?.orderEvents ?? []}");
  });

  it("provider governance section opens manage modal with lifecycle actions", () => {
    const source = readSource("src/components/orders/ProviderMedicationOrderGovernanceSection.tsx");
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(source).toContain("MedicationGovernanceManageModal");
    expect(source).toContain("resolveMedicationOrderGovernanceClinicalHeader");
    expect(source).toContain("provider-medication-mar-execution-status");
    expect(modal).toContain('data-testid="medication-governance-clinical-header"');
    expect(modal).toContain("medicationOrderLifecycle.actions.discontinue");
  });

  it("completed MAR infusion does not block provider MAR execution summary on standing order", () => {
    const summary = readSource("src/features/orders/providerMedicationOrderMarStatus.ts");
    expect(summary).toContain("resolveProviderMedicationOrderMarExecutionSummary");
  });

  it("provider lifecycle actions are not rendered in MAR components", () => {
    const marDir = readSource("src/components/mar/MedicationAdministrationCorrectionChainViewer.tsx");
    expect(marDir).not.toContain("MedicationGovernanceManageModal");
    expect(marDir).not.toContain("ProviderMedicationOrderGovernanceSection");
  });

  it("lifecycle actions remain in Orders manage modal only", () => {
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(modal).toContain("medicationOrderLifecycle.actions.discontinue");
    expect(modal).not.toContain("marTab.");
  });

  it("signed encounter blocks manage modal mutations", () => {
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(modal).toContain("encounterSigned");
    expect(modal).toContain("signedEncounterBlocked");
  });

  it("Vancomycin IVPB Q12H scenario uses MAR-managed chart admin path", () => {
    const policy = readSource("src/features/emergency/medicationOrderMarExecutionPolicy.ts");
    expect(policy).toContain("isMarManagedMedicationOrderItem");
    expect(policy).toContain("MEDICATION_ADMINISTRATION_EXECUTION_IN_MAR_ONLY");
  });
});

describe("providerMedicationGovernance rendering helper (MEDUI.ORDERS.MEDICATION_GOVERNANCE_RENDERING_HELPER.1)", () => {
  it("Vancomycin Q12H active after MAR completion renders governance via shared helper", () => {
    const permissions = readSource("src/lib/medicationOrderGovernancePermissions.ts");
    expect(permissions).toContain("resolveMedicationGovernanceRenderState");
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
      expect(source).not.toContain("MedicationGovernanceManageModal");
    }
  });

  it("manage modal uses governance helper for lifecycle normalization imports", () => {
    const panel = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(panel).toContain("discontinueMedicationOrderItem");
    expect(panel).toContain("canMutateLifecycle");
  });
});
