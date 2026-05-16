import { describe, expect, it } from "vitest";
import {
  canShowMedicationAdministrationTimeClock,
  resolveMedicationAdministrationDisplayTimes,
} from "./medicationAdministrationEffectiveTimeDisplay";

describe("medicationAdministrationEffectiveTimeDisplay", () => {
  it("shows adjusted badge when effective differs from original", () => {
    const result = resolveMedicationAdministrationDisplayTimes({
      id: "mar-1",
      administeredAt: "2026-05-16T14:00:00.000Z",
      createdAt: "2026-05-16T14:30:00.000Z",
      effectiveAdministeredAt: "2026-05-16T13:00:00.000Z",
      effectiveAdministeredAtVersion: 1,
      marAction: "administered",
    });
    expect(result.showAdjustedBadge).toBe(true);
    expect(result.effectiveIso).toBe("2026-05-16T13:00:00.000Z");
  });

  it("hides clock for pending sync rows", () => {
    expect(
      canShowMedicationAdministrationTimeClock(
        {
          id: "p",
          administeredAt: "2026-05-16T14:00:00.000Z",
          marAction: "administered",
          pendingSync: true,
        },
        { encounterOpen: true, canAdjust: true }
      )
    ).toBe(false);
  });

  it("hides clock for infusion terminal notes", () => {
    expect(
      canShowMedicationAdministrationTimeClock(
        {
          id: "i",
          administeredAt: "2026-05-16T14:00:00.000Z",
          marAction: "administered",
          notes: "Perfusion IV terminée — durée : 5 min",
        },
        { encounterOpen: true, canAdjust: true }
      )
    ).toBe(false);
  });
});
