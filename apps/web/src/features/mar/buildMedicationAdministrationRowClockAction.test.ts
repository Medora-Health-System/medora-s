import { describe, expect, it } from "vitest";
import { buildMedicationAdministrationRowClockAction } from "./buildMedicationAdministrationRowClockAction";

const baseAdmin = {
  id: "mar-a",
  administeredAt: "2026-05-16T14:00:00.000Z",
  marAction: "administered" as const,
};

const openRn = { encounterOpen: true, canAdjust: true };

describe("buildMedicationAdministrationRowClockAction", () => {
  it("returns independent administration ids per row", () => {
    const rowA = buildMedicationAdministrationRowClockAction({
      administration: { ...baseAdmin, id: "mar-a" },
      ...openRn,
    });
    const rowB = buildMedicationAdministrationRowClockAction({
      administration: { ...baseAdmin, id: "mar-b" },
      ...openRn,
    });
    expect(rowA.show).toBe(true);
    expect(rowB.show).toBe(true);
    expect(rowA.administrationId).toBe("mar-a");
    expect(rowB.administrationId).toBe("mar-b");
    expect(rowA.administrationId).not.toBe(rowB.administrationId);
  });

  it("shows enabled clock for RN on normal administered row", () => {
    const action = buildMedicationAdministrationRowClockAction({
      administration: baseAdmin,
      ...openRn,
    });
    expect(action.show).toBe(true);
    expect(action.enabled).toBe(true);
    expect(action.tooltipKey).toBe("marTab.adminTime.adjustTooltip");
  });

  it("hides clock when no administration id", () => {
    expect(
      buildMedicationAdministrationRowClockAction({
        administration: null,
        ...openRn,
      }).show
    ).toBe(false);
    expect(
      buildMedicationAdministrationRowClockAction({
        administration: { ...baseAdmin, id: "" },
        ...openRn,
      }).show
    ).toBe(false);
  });

  it("hides clock for unauthorized role", () => {
    expect(
      buildMedicationAdministrationRowClockAction({
        administration: baseAdmin,
        encounterOpen: true,
        canAdjust: false,
      }).show
    ).toBe(false);
  });

  it("hides clock when encounter closed", () => {
    expect(
      buildMedicationAdministrationRowClockAction({
        administration: baseAdmin,
        encounterOpen: false,
        canAdjust: true,
      }).show
    ).toBe(false);
  });

  it("shows disabled clock for infusion terminal row", () => {
    const action = buildMedicationAdministrationRowClockAction({
      administration: {
        ...baseAdmin,
        notes: "Perfusion IV terminée — durée : 12 min",
      },
      ...openRn,
    });
    expect(action.show).toBe(true);
    expect(action.enabled).toBe(false);
    expect(action.tooltipKey).toBe("marTab.adminTime.infusionDeferred");
  });

  it("shows adjusted badge only on corrected row", () => {
    const adjusted = buildMedicationAdministrationRowClockAction({
      administration: {
        ...baseAdmin,
        effectiveAdministeredAt: "2026-05-16T13:00:00.000Z",
        effectiveAdministeredAtVersion: 1,
      },
      ...openRn,
    });
    const plain = buildMedicationAdministrationRowClockAction({
      administration: baseAdmin,
      ...openRn,
    });
    expect(adjusted.showAdjustedBadge).toBe(true);
    expect(plain.showAdjustedBadge).toBe(false);
  });
});
