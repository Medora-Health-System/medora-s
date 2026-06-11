import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isMedicationAdministrationManagedInMar,
  resolveMedicationOrderMarStatusLabel,
} from "@/features/emergency/medicationOrderMarExecutionPolicy";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("Orders dashboard medication MAR execution policy (M1.8B.7K.5)", () => {
  const panel = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyErOrdersPanel.tsx"),
    "utf8"
  );

  it("medication order rows do not render Start infusion button when MAR-managed", () => {
    expect(panel).toContain("isMedicationAdministrationManagedInMar");
    const marBranch = panel.match(
      /if \(marManagedInMar && hasAnyRole[\s\S]*?\} else if \(isInfusionLifecycleMed/
    )?.[0];
    expect(marBranch).toBeTruthy();
    expect(marBranch).toContain("acknowledgeOrder");
    expect(marBranch).not.toContain("startInfusion");
  });

  it("medication order rows do not render Stop infusion button when MAR-managed", () => {
    const marBranch = panel.match(
      /if \(marManagedInMar && hasAnyRole[\s\S]*?\} else if \(isInfusionLifecycleMed/
    )?.[0];
    expect(marBranch).not.toContain("stopInfusion");
  });

  it("medication order rows do not render Mark bedside med complete when MAR-managed", () => {
    const marBranch = panel.match(
      /if \(marManagedInMar && hasAnyRole[\s\S]*?\} else if \(isInfusionLifecycleMed/
    )?.[0];
    expect(marBranch).not.toContain("nurseMarkBedsideComplete");
  });

  it("medication order rows show MAR helper text key", () => {
    expect(panel).toContain("MEDICATION_ORDER_MAR_HELPER_I18N_KEY");
    expect(panel).toContain("renderMedicationMarOrdersStatusSection");
  });

  it("lab/imaging/care acknowledge actions remain in non-MAR branch", () => {
    expect(panel).toContain('t("erEmergencyOrders.acknowledgeOrder")');
    expect(panel).toContain('t("erEmergencyOrders.completeOrder")');
  });

  it("resolveMedicationOrderMarStatusLabel maps infusion in progress", () => {
    const label = resolveMedicationOrderMarStatusLabel(
      "IN_PROGRESS",
      {
        active: { infusionSessionKey: "k1", infusionStartedAtIso: null },
        lastCompleted: null,
      },
      (k) => k
    );
    expect(label).toBe("erEmergencyOrders.marStatusInfusionInProgress");
  });

  it("isMedicationAdministrationManagedInMar is true for bedside chart meds", () => {
    expect(
      isMedicationAdministrationManagedInMar("MEDICATION", {
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      })
    ).toBe(true);
    expect(
      isMedicationAdministrationManagedInMar("LAB", {
        catalogItemType: "LAB",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      })
    ).toBe(false);
  });
});
