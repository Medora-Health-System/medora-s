import { describe, expect, it } from "vitest";
import {
  canAdjustMedicationAdministrationTime,
  canShowMedicationAdministrationTimeClock,
  resolveMedicationAdministrationDisplayTimes,
} from "./medicationAdministrationEffectiveTimeDisplay";

const baseRow = {
  id: "mar-1",
  administeredAt: "2026-05-16T14:00:00.000Z",
  marAction: "administered" as const,
};

const openAdjust = { encounterOpen: true, canAdjust: true };

describe("medicationAdministrationEffectiveTimeDisplay", () => {
  it("shows adjusted badge when effective differs from original", () => {
    const result = resolveMedicationAdministrationDisplayTimes({
      ...baseRow,
      createdAt: "2026-05-16T14:30:00.000Z",
      effectiveAdministeredAt: "2026-05-16T13:00:00.000Z",
      effectiveAdministeredAtVersion: 1,
    });
    expect(result.showAdjustedBadge).toBe(true);
    expect(result.effectiveIso).toBe("2026-05-16T13:00:00.000Z");
  });

  it("RN / PROVIDER / ADMIN may adjust; LAB may not", () => {
    expect(canAdjustMedicationAdministrationTime(["RN"])).toBe(true);
    expect(canAdjustMedicationAdministrationTime(["PROVIDER"])).toBe(true);
    expect(canAdjustMedicationAdministrationTime(["ADMIN"])).toBe(true);
    expect(canAdjustMedicationAdministrationTime(["LAB"])).toBe(false);
    expect(canAdjustMedicationAdministrationTime(["BILLING"])).toBe(false);
  });

  it("shows clock for normal administered row when encounter open", () => {
    expect(canShowMedicationAdministrationTimeClock(baseRow, openAdjust)).toBe(true);
  });

  it("shows clock without linked order item", () => {
    expect(
      canShowMedicationAdministrationTimeClock(
        { ...baseRow, orderItemId: null } as typeof baseRow & { orderItemId: null },
        openAdjust
      )
    ).toBe(true);
  });

  it("hides clock when encounter closed", () => {
    expect(canShowMedicationAdministrationTimeClock(baseRow, { encounterOpen: false, canAdjust: true })).toBe(
      false
    );
  });

  it("hides clock when role cannot adjust", () => {
    expect(canShowMedicationAdministrationTimeClock(baseRow, { encounterOpen: true, canAdjust: false })).toBe(
      false
    );
  });

  it("hides clock for pending sync rows", () => {
    expect(
      canShowMedicationAdministrationTimeClock({ ...baseRow, pendingSync: true }, openAdjust)
    ).toBe(false);
  });

  it("hides clock for infusion terminal notes", () => {
    expect(
      canShowMedicationAdministrationTimeClock(
        {
          ...baseRow,
          notes: "Perfusion IV terminée — durée : 5 min",
        },
        openAdjust
      )
    ).toBe(false);
  });

  it("hides clock without id or administeredAt", () => {
    expect(canShowMedicationAdministrationTimeClock({ ...baseRow, id: "" }, openAdjust)).toBe(false);
    expect(
      canShowMedicationAdministrationTimeClock({ ...baseRow, administeredAt: "" }, openAdjust)
    ).toBe(false);
  });
});
