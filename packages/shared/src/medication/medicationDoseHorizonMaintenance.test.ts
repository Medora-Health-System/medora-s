import { describe, expect, it } from "vitest";
import {
  computeMedicationDoseFutureCoverageMs,
  resolveMedicationDoseMaintenanceHorizonEnd,
  shouldReplenishMedicationDoseHorizon,
  MEDICATION_DOSE_EXPANSION_HORIZON_MS,
  MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS,
} from "./medicationDoseHorizonMaintenance.js";

describe("medicationDoseHorizonMaintenance (M1.8B.7H.1b)", () => {
  const now = new Date("2026-06-10T12:00:00.000Z");

  it("computes future coverage from scheduledAt times", () => {
    expect(
      computeMedicationDoseFutureCoverageMs(now, [
        new Date("2026-06-10T10:00:00.000Z"),
        new Date("2026-06-11T09:00:00.000Z"),
      ])
    ).toBe(21 * 60 * 60 * 1000);
  });

  it("returns zero coverage when no future doses", () => {
    expect(
      computeMedicationDoseFutureCoverageMs(now, [new Date("2026-06-10T10:00:00.000Z")])
    ).toBe(0);
  });

  it("replenishes below 48h threshold", () => {
    expect(shouldReplenishMedicationDoseHorizon(MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS - 1)).toBe(
      true
    );
    expect(shouldReplenishMedicationDoseHorizon(MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS)).toBe(
      false
    );
  });

  it("resolves 72h maintenance horizon end", () => {
    expect(resolveMedicationDoseMaintenanceHorizonEnd(now).toISOString()).toBe(
      new Date(now.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS).toISOString()
    );
  });
});
