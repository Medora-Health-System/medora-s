import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMedicationGovernanceRenderState } from "@/lib/medicationOrderGovernancePermissions";

const webRoot = join(import.meta.dirname, "../..");

function readSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("providerMedicationGovernanceUiPolish (MEDUI.ORDERS.PROVIDER_MEDICATION_GOVERNANCE_UI_POLISH.1)", () => {
  it("provider view exposes one compact manage action instead of five row buttons", () => {
    const section = readSource("src/components/orders/ProviderMedicationOrderGovernanceSection.tsx");
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(section).toContain("MedicationGovernanceManageButton");
    expect(section).not.toContain("medicationOrderLifecycle.actions.discontinue");
    expect(modal).toContain('data-testid="medication-governance-action-selector"');
    expect(modal).not.toContain('t("common.confirm")');
  });

  it("manage modal defines action selector and per-action forms", () => {
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(modal).toContain("medication-governance-action-${item.id}");
    expect(modal).toContain("medication-governance-form-${step}");
    expect(modal).toContain("medication-governance-history-view");
    expect(modal).toContain('id: "edit"');
    expect(modal).toContain('id: "discontinue"');
    expect(modal).toContain('id: "hold"');
    expect(modal).toContain('id: "history"');
  });

  it("resume action appears only for ON_HOLD lifecycle status", () => {
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(modal).toContain('lifecycleStatus === "ON_HOLD"');
    expect(modal).toContain('id: "resume"');
  });

  it("submit labels use medicationOrderLifecycle.submit keys not common.confirm", () => {
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(modal).toContain("medicationOrderLifecycle.submit.saveChanges");
    expect(modal).toContain("medicationOrderLifecycle.submit.discontinue");
    expect(modal).not.toContain('t("common.confirm")');
  });

  it("RN/non-provider uses compact status instead of provider governance panel", () => {
    const section = readSource("src/components/orders/ProviderMedicationOrderGovernanceSection.tsx");
    expect(section).toContain("MedicationOrderGovernanceCompactStatus");
    expect(section).not.toContain("providerGovernanceTitle");
  });

  it("compact status component renders concise badges", () => {
    const compact = readSource("src/components/orders/MedicationOrderGovernanceCompactStatus.tsx");
    expect(compact).toContain("medication-order-governance-compact-status");
    expect(compact).toContain("medication-order-mar-compact-badge");
    expect(compact).toContain("compact");
  });

  it("provider lifecycle controls do not appear in MAR components", () => {
    for (const path of [
      "src/components/mar/MedicationAdministrationCorrectionChainViewer.tsx",
      "src/components/mar/MarAdministrationRowCorrectionControls.tsx",
      "src/components/encounters/MedicationAdministrationTab.tsx",
    ]) {
      const source = readSource(path);
      expect(source).not.toContain("MedicationGovernanceManageModal");
      expect(source).not.toContain("MedicationGovernanceManageButton");
    }
  });

  it("Vancomycin IVPB Q12H still renders governance entry for provider/admin", () => {
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
    expect(state.effectiveCanPrescribe).toBe(true);
  });

  it("lifecycle endpoints remain wired in manage modal", () => {
    const modal = readSource("src/components/orders/MedicationGovernanceManageModal.tsx");
    expect(modal).toContain("discontinueMedicationOrderItem");
    expect(modal).toContain("holdMedicationOrderItem");
    expect(modal).toContain("resumeMedicationOrderItem");
    expect(modal).toContain("editMedicationOrderItem");
    expect(modal).toContain("discontinueAndReorderMedicationOrderItem");
  });

  it("i18n defines common.confirm and governance submit labels", () => {
    const en = readSource("src/i18n/messages/en.ts");
    const fr = readSource("src/i18n/messages/fr.ts");
    expect(en).toContain('confirm: "Confirm"');
    expect(fr).toContain('confirm: "Confirmer"');
    expect(en).toContain("submit: {");
    expect(fr).toContain("submit: {");
  });
});
