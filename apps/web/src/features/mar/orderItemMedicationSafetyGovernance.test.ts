import { describe, expect, it } from "vitest";
import { marPharmacyWorkflowVisible } from "@/components/medication/MarPharmacyVerificationPanel";
import { marLasaWorkflowVisible } from "@/components/medication/MarLasaFields";
import { orderItemToMedicationSafetyGovernanceDisplay } from "./orderItemMedicationSafetyGovernance";

describe("orderItemMedicationSafetyGovernance (M1.7A.8)", () => {
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
    expect(marPharmacyWorkflowVisible(display, "administered")).toBe(true);
  });

  it("preserves explicit requiresPharmacyVerification from enrichment", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: {
        requiresPharmacyVerification: true,
        pharmacyVerificationStatus: "PENDING",
        lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
        lasaSeverity: "LASA_HIGH",
        isHighAlert: true,
        requiresDoubleSign: true,
      },
    });

    expect(marPharmacyWorkflowVisible(display, "administered")).toBe(true);
    expect(marLasaWorkflowVisible(display, "administered")).toBe(true);
  });
});
