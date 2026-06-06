import { describe, expect, it } from "vitest";
import { marHighAlertWorkflowVisible } from "@/components/medication/MarHighAlertFields";
import { marLasaWorkflowVisible } from "@/components/medication/MarLasaFields";
import { marPharmacyWorkflowVisible } from "@/components/medication/MarPharmacyVerificationPanel";
import {
  marLasaAcknowledgementComplete,
  orderItemToMedicationSafetyGovernanceDisplay,
} from "./orderItemMedicationSafetyGovernance";

describe("orderItemMedicationSafetyGovernance", () => {
  it("derives requiresPharmacyVerification for Schedule II Hydromorphone when flag omitted", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: {
        isControlled: true,
        controlledSchedule: "II",
        pharmacyVerificationStatus: "PENDING",
      },
      catalogMedication: {
        isControlled: true,
        controlledSchedule: "II",
        requiresWitness: false,
        requiresDoubleSign: true,
      },
    });

    expect(display.requiresPharmacyVerification).toBe(true);
    expect(marPharmacyWorkflowVisible(display, "administered")).toBe(false);
  });

  it("Hydromorphone IV push shows LASA only — no pharmacy or double-check block (M1.7A.9)", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: {
        isControlled: true,
        controlledSchedule: "II",
        isHighAlert: true,
        highAlertClass: "HIGH_ALERT_OPIOID",
        lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
        lasaGroupLabel: "Morphine / hydromorphone",
        lasaSeverity: "LASA_HIGH",
        requiresWitness: false,
        requiresDoubleSign: true,
        pharmacyVerificationStatus: "PENDING",
        requiresPharmacyVerification: true,
      },
    });

    expect(marPharmacyWorkflowVisible(display, "administered")).toBe(false);
    expect(
      marHighAlertWorkflowVisible(display, "administered", { route: "IV", isContinuousInfusion: false })
    ).toBe(false);
    expect(marLasaWorkflowVisible(display, "administered")).toBe(true);
  });

  it("insulin requires double-check workflow", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: {
        isHighAlert: true,
        highAlertClass: "HIGH_ALERT_INSULIN",
        requiresDoubleSign: true,
      },
    });
    expect(marHighAlertWorkflowVisible(display, "administered", { orderRoute: "SQ" })).toBe(true);
  });

  it("insulin SQ requires double-check when safety profile missing but catalog present (M1.8B.4A.2)", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: null,
      catalogMedication: {
        code: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
        genericName: "Regular Insulin",
        displayNameEn: "Insulin (regular)",
        strength: "100 UI/mL",
        dosageForm: "injectable",
      },
    });
    expect(display.highAlertClass).toBe("HIGH_ALERT_INSULIN");
    expect(marHighAlertWorkflowVisible(display, "administered", { orderRoute: "SQ" })).toBe(true);
  });

  it("heparin SQ does not require double-check workflow (M1.8B.4A)", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: {
        isHighAlert: true,
        highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
        requiresDoubleSign: true,
      },
    });
    expect(marHighAlertWorkflowVisible(display, "administered", { orderRoute: "SQ" })).toBe(false);
    expect(marHighAlertWorkflowVisible(display, "administered", { orderRoute: "IVP" })).toBe(true);
  });

  it("marLasaAcknowledgementComplete requires both ack checkboxes or override", () => {
    expect(
      marLasaAcknowledgementComplete({
        lasaAcknowledged: true,
        lasaMedicationSelectionConfirmed: false,
        secondReadUserId: null,
        secondReadDisplayName: "",
        useOverride: false,
        lasaOverrideReason: "",
        lasaOverrideAcknowledged: false,
      })
    ).toBe(false);
    expect(
      marLasaAcknowledgementComplete({
        lasaAcknowledged: true,
        lasaMedicationSelectionConfirmed: true,
        secondReadUserId: null,
        secondReadDisplayName: "",
        useOverride: false,
        lasaOverrideReason: "",
        lasaOverrideAcknowledged: false,
      })
    ).toBe(true);
  });
});
