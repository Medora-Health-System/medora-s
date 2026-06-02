import { describe, expect, it } from "vitest";
import {
  getMedicationSafetyBadges,
  medicationSafetyGovernanceHasDisplay,
} from "@medora/shared";
import { orderItemToMedicationSafetyGovernanceDisplay } from "./orderItemMedicationSafetyGovernance";

describe("medicationMarSafetyGovernance (M1.3F.3)", () => {
  it("maps API governance snapshot for badge rendering", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: {
        isControlled: true,
        isHighAlert: true,
        lasaGroupId: "GROUP_LASA_OPIOID",
        requiresWitness: true,
        requiresDoubleSign: true,
        pharmacyVerificationStatus: "PENDING",
      },
      catalogMedication: { isControlled: false },
    });
    expect(getMedicationSafetyBadges(display)).toContain("CONTROLLED");
    expect(getMedicationSafetyBadges(display)).toContain("PHARMACY_VERIFY");
    expect(medicationSafetyGovernanceHasDisplay(display)).toBe(true);
  });

  it("renders no governance badges for plain medications", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: null,
      catalogMedication: { isControlled: false, requiresWitness: false, requiresDoubleSign: false },
    });
    expect(getMedicationSafetyBadges(display)).toEqual([]);
  });

  it("does not enforce hard stops (display-only contract)", () => {
    const display = orderItemToMedicationSafetyGovernanceDisplay({
      medicationSafetyGovernance: {
        isControlled: true,
        requiresWitness: true,
        requiresDoubleSign: true,
      },
    });
    expect(display.requiresWitness).toBe(true);
    expect(typeof (display as { blocksAdministration?: boolean }).blocksAdministration).toBe("undefined");
  });
});
