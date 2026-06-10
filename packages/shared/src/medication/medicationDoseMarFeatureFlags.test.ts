import { describe, expect, it } from "vitest";
import { MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF } from "./medicationFrequencyEdHardening.js";
import { medicationDoseGatedMarEnabled } from "./medicationDoseMarFeatureFlags.js";

describe("medicationDoseMarFeatureFlags (M1.8B.7I.1)", () => {
  it("default OFF", () => {
    expect(medicationDoseGatedMarEnabled(MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF)).toBe(
      false
    );
  });

  it("requires all three flags", () => {
    expect(
      medicationDoseGatedMarEnabled({
        MEDICATION_SCHEDULING_V1: true,
        MEDICATION_DOSE_INSTANCES: false,
        MEDICATION_DOSE_GATED_MAR: true,
      })
    ).toBe(false);
    expect(
      medicationDoseGatedMarEnabled({
        MEDICATION_SCHEDULING_V1: true,
        MEDICATION_DOSE_INSTANCES: true,
        MEDICATION_DOSE_GATED_MAR: false,
      })
    ).toBe(false);
    expect(
      medicationDoseGatedMarEnabled({
        MEDICATION_SCHEDULING_V1: false,
        MEDICATION_DOSE_INSTANCES: true,
        MEDICATION_DOSE_GATED_MAR: true,
      })
    ).toBe(false);
    expect(
      medicationDoseGatedMarEnabled({
        MEDICATION_SCHEDULING_V1: true,
        MEDICATION_DOSE_INSTANCES: true,
        MEDICATION_DOSE_GATED_MAR: true,
      })
    ).toBe(true);
  });
});
