import { describe, expect, it } from "vitest";
import {
  canAdjustMedicationAdministrationTime,
  canShowMedicationAdministrationTimeClock,
  pickMedicationAdministrationClockTarget,
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

  it("shows dual Clinical + Documented labels when times differ", () => {
    const result = resolveMedicationAdministrationDisplayTimes({
      ...baseRow,
      administeredAt: "2026-05-16T14:42:00.000Z",
      effectiveAdministeredAt: "2026-05-16T17:30:00.000Z",
      effectiveAdministeredAtVersion: 1,
    });
    expect(result.showDualTimeLabels).toBe(true);
    expect(result.showAdjustedBadge).toBe(true);
    expect(result.effectiveIso).toBe("2026-05-16T17:30:00.000Z");
    expect(result.originalAdministeredIso).toBe("2026-05-16T14:42:00.000Z");
  });

  it("hides dual labels when effective equals documented administeredAt", () => {
    const result = resolveMedicationAdministrationDisplayTimes({
      ...baseRow,
      effectiveAdministeredAt: "2026-05-16T14:00:00.000Z",
      effectiveAdministeredAtVersion: 1,
    });
    expect(result.showDualTimeLabels).toBe(false);
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

  it("allows clock for infusion stop terminal notes (effective time adjustment)", () => {
    expect(
      canShowMedicationAdministrationTimeClock(
        {
          ...baseRow,
          notes: "Perfusion IV terminée — durée : 5 min",
        },
        openAdjust
      )
    ).toBe(true);
  });

  it("shows adjusted badge on START row when effective differs", () => {
    const result = resolveMedicationAdministrationDisplayTimes({
      ...baseRow,
      infusionPhase: "INFUSION_START",
      effectiveAdministeredAt: "2026-05-16T13:00:00.000Z",
      effectiveAdministeredAtVersion: 1,
    });
    expect(result.showAdjustedBadge).toBe(true);
  });

  it("hides adjusted badge when effective equals original", () => {
    expect(
      resolveMedicationAdministrationDisplayTimes({
        ...baseRow,
        effectiveAdministeredAt: "2026-05-16T14:00:00.000Z",
      }).showAdjustedBadge
    ).toBe(false);
  });

  it("hides clock without id or administeredAt", () => {
    expect(canShowMedicationAdministrationTimeClock({ ...baseRow, id: "" }, openAdjust)).toBe(false);
    expect(
      canShowMedicationAdministrationTimeClock({ ...baseRow, administeredAt: "" }, openAdjust)
    ).toBe(false);
  });
});

describe("pickMedicationAdministrationClockTarget", () => {
  const startRow = {
    id: "mar-start",
    administeredAt: "2026-05-16T14:00:00.000Z",
    marAction: "administered" as const,
    infusionPhase: "INFUSION_START",
    infusionSessionKey: "sess-a",
  };
  const stopRow = {
    id: "mar-stop",
    administeredAt: "2026-05-16T16:00:00.000Z",
    marAction: "administered" as const,
    infusionPhase: "INFUSION_STOP",
    infusionSessionKey: "sess-a",
    notes: "Perfusion IV terminée — durée : 120 min",
  };
  const otherStart = {
    ...startRow,
    id: "mar-start-b",
    infusionSessionKey: "sess-b",
    administeredAt: "2026-05-16T12:00:00.000Z",
  };

  it("targets START when infusion active even if STOP exists", () => {
    const target = pickMedicationAdministrationClockTarget([stopRow, startRow], {
      infusionActive: true,
      activeInfusionSessionKey: "sess-a",
    });
    expect(target?.id).toBe("mar-start");
  });

  it("never targets STOP when infusion active", () => {
    const target = pickMedicationAdministrationClockTarget([stopRow], { infusionActive: true });
    expect(target).toBeNull();
  });

  it("targets STOP when infusion not active", () => {
    const target = pickMedicationAdministrationClockTarget([startRow, stopRow], {
      infusionActive: false,
      activeInfusionSessionKey: "sess-a",
    });
    expect(target?.id).toBe("mar-stop");
  });

  it("does not cross infusion sessions when session key provided", () => {
    const target = pickMedicationAdministrationClockTarget([otherStart, startRow], {
      infusionActive: true,
      activeInfusionSessionKey: "sess-a",
    });
    expect(target?.id).toBe("mar-start");
  });

  it("targets standard administered row for non-infusion meds", () => {
    const standard = { ...startRow, id: "mar-std", infusionPhase: null, infusionSessionKey: null };
    const target = pickMedicationAdministrationClockTarget([standard]);
    expect(target?.id).toBe("mar-std");
  });
});
