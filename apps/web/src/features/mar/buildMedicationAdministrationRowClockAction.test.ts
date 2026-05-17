import { describe, expect, it } from "vitest";
import {
  buildMedicationAdministrationRowClockAction,
  buildMedicationAdministrationRowDocumentAction,
  buildMedicationAdministrationTaskRowClockAction,
} from "./buildMedicationAdministrationRowClockAction";

const baseAdmin = {
  id: "mar-a",
  administeredAt: "2026-05-16T14:00:00.000Z",
  marAction: "administered" as const,
};

const openRn = { encounterOpen: true, canAdjust: true };

describe("buildMedicationAdministrationRowClockAction", () => {
  it("enables normal administered medication row", () => {
    const action = buildMedicationAdministrationRowClockAction({
      administration: baseAdmin,
      ...openRn,
    });
    expect(action.show).toBe(true);
    expect(action.enabled).toBe(true);
    expect(action.actionKind).toBe("admin");
    expect(action.tooltipKey).toBe("marTab.adminTime.adjustTooltip");
  });

  it("uses distinct tooltip keys for infusion start vs stop", () => {
    const start = buildMedicationAdministrationRowClockAction({
      administration: { ...baseAdmin, infusionPhase: "INFUSION_START" },
      ...openRn,
    });
    const stop = buildMedicationAdministrationRowClockAction({
      administration: {
        ...baseAdmin,
        notes: "Perfusion IV terminée — durée : 12 min",
      },
      ...openRn,
    });
    expect(start.tooltipKey).toBe("marTab.adminTime.adjustStartTooltip");
    expect(stop.tooltipKey).toBe("marTab.adminTime.adjustStopTooltip");
    expect(start.tooltipKey).not.toBe(stop.tooltipKey);
  });

  it("enables infusion stop terminal row (effective time only)", () => {
    const action = buildMedicationAdministrationRowClockAction({
      administration: {
        ...baseAdmin,
        id: "mar-stop",
        notes: "Perfusion IV terminée — durée : 12 min",
      },
      ...openRn,
    });
    expect(action.show).toBe(true);
    expect(action.enabled).toBe(true);
    expect(action.actionKind).toBe("infusionStop");
    expect(action.tooltipKey).toBe("marTab.adminTime.adjustStopTooltip");
  });

  it("returns independent administration ids for two rows", () => {
    const a = buildMedicationAdministrationRowClockAction({
      administration: { ...baseAdmin, id: "mar-a" },
      ...openRn,
    });
    const b = buildMedicationAdministrationRowClockAction({
      administration: { ...baseAdmin, id: "mar-b" },
      ...openRn,
    });
    expect(a.administrationId).toBe("mar-a");
    expect(b.administrationId).toBe("mar-b");
  });

  it("hides clock when no administration id", () => {
    expect(
      buildMedicationAdministrationRowClockAction({ administration: null, ...openRn }).show
    ).toBe(false);
  });

  it("shows adjusted badge on infusion START row when effective differs", () => {
    const action = buildMedicationAdministrationRowClockAction({
      administration: {
        ...baseAdmin,
        infusionPhase: "INFUSION_START",
        effectiveAdministeredAt: "2026-05-16T13:00:00.000Z",
        effectiveAdministeredAtVersion: 1,
      },
      ...openRn,
    });
    expect(action.showAdjustedBadge).toBe(true);
  });

  it("shows adjusted badge on infusion STOP row when effective differs", () => {
    const action = buildMedicationAdministrationRowClockAction({
      administration: {
        ...baseAdmin,
        notes: "Perfusion IV terminée — durée : 5 min",
        infusionPhase: "INFUSION_STOP",
        effectiveAdministeredAt: "2026-05-16T15:00:00.000Z",
        effectiveAdministeredAtVersion: 1,
      },
      ...openRn,
    });
    expect(action.showAdjustedBadge).toBe(true);
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

describe("buildMedicationAdministrationTaskRowClockAction", () => {
  it("picks latest administered row for task line", () => {
    const action = buildMedicationAdministrationTaskRowClockAction({
      administrations: [
        { ...baseAdmin, id: "mar-old", administeredAt: "2026-05-16T12:00:00.000Z" },
        { ...baseAdmin, id: "mar-new", administeredAt: "2026-05-16T15:00:00.000Z" },
      ],
      ...openRn,
    });
    expect(action.administrationId).toBe("mar-new");
    expect(action.enabled).toBe(true);
  });

  it("enables stop row when it is the only administered MAR", () => {
    const action = buildMedicationAdministrationTaskRowClockAction({
      administrations: [
        {
          ...baseAdmin,
          id: "mar-stop",
          notes: "Perfusion IV terminée — durée : 5 min",
        },
      ],
      ...openRn,
    });
    expect(action.show).toBe(true);
    expect(action.enabled).toBe(true);
    expect(action.actionKind).toBe("infusionStop");
  });

  it("shows no clock for pending line without MAR row", () => {
    const action = buildMedicationAdministrationTaskRowClockAction({
      administrations: [],
      ...openRn,
      infusionActive: true,
    });
    expect(action.show).toBe(false);
    expect(action.administrationId).toBeNull();
  });

  it("enables start clock on active infusion when START MAR exists", () => {
    const action = buildMedicationAdministrationTaskRowClockAction({
      administrations: [
        {
          ...baseAdmin,
          id: "mar-start",
          infusionPhase: "INFUSION_START",
          notes: "Perfusion IV — début",
          administeredAt: "2026-05-16T14:00:00.000Z",
        },
      ],
      ...openRn,
      infusionActive: true,
    });
    expect(action.show).toBe(true);
    expect(action.enabled).toBe(true);
    expect(action.administrationId).toBe("mar-start");
    expect(action.actionKind).toBe("infusionStart");
    expect(action.tooltipKey).toBe("marTab.adminTime.adjustStartTooltip");
  });

  it("binds active infusion clock to matching session START row", () => {
    const action = buildMedicationAdministrationTaskRowClockAction({
      administrations: [
        {
          ...baseAdmin,
          id: "mar-start-b",
          infusionPhase: "INFUSION_START",
          infusionSessionKey: "sess-b",
          administeredAt: "2026-05-16T12:00:00.000Z",
        },
        {
          ...baseAdmin,
          id: "mar-start-a",
          infusionPhase: "INFUSION_START",
          infusionSessionKey: "sess-a",
          administeredAt: "2026-05-16T14:00:00.000Z",
        },
      ],
      ...openRn,
      infusionActive: true,
      activeInfusionSessionKey: "sess-a",
    });
    expect(action.administrationId).toBe("mar-start-a");
  });

  it("prefers START MAR over older STOP while infusion is active", () => {
    const action = buildMedicationAdministrationTaskRowClockAction({
      administrations: [
        {
          ...baseAdmin,
          id: "mar-stop-old",
          notes: "Perfusion IV terminée — durée : 30 min",
          administeredAt: "2026-05-16T10:00:00.000Z",
        },
        {
          ...baseAdmin,
          id: "mar-start-new",
          infusionPhase: "INFUSION_START",
          notes: "Perfusion IV — début",
          administeredAt: "2026-05-16T14:00:00.000Z",
        },
      ],
      ...openRn,
      infusionActive: true,
    });
    expect(action.administrationId).toBe("mar-start-new");
    expect(action.actionKind).toBe("infusionStart");
  });

  it("does not disable standard med because route is IV", () => {
    const action = buildMedicationAdministrationTaskRowClockAction({
      administrations: [{ ...baseAdmin, id: "mar-iv", notes: "Action: Administré\nVoie: IV" }],
      ...openRn,
      infusionActive: false,
    });
    expect(action.enabled).toBe(true);
  });
});

describe("buildMedicationAdministrationRowDocumentAction", () => {
  it("shows documentation action when encounter open and role allowed", () => {
    expect(buildMedicationAdministrationRowDocumentAction({ encounterOpen: true, canAdjust: true }).show).toBe(
      true
    );
    expect(buildMedicationAdministrationRowDocumentAction({ encounterOpen: false, canAdjust: true }).show).toBe(
      false
    );
    expect(buildMedicationAdministrationRowDocumentAction({ encounterOpen: true, canAdjust: false }).show).toBe(
      false
    );
  });
});
