import { describe, expect, it } from "vitest";
import {
  MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX,
} from "../mar/marUniversalClinicalTimeGovernance.js";
import {
  buildMarBolusTimelinePlacement,
  buildMarInfusionTimelinePlacement,
  buildMarIvpbTimelinePlacement,
  mergeMarClinicalFluidOverlay,
  resolveMarClinicalAdministrationPlacementInstant,
  resolveMarClinicalDoseTimelinePlacementInstant,
} from "./marClinicalTimelinePlacement.js";
import {
  buildMarShiftTimelineColumns,
  findMarShiftTimelineColumnKeyForInstant,
  resolveStandardMarShiftTimelineWindow,
} from "./marShiftTimeline.js";

describe("marClinicalTimelinePlacement (H9K)", () => {
  const scheduledAt = new Date("2026-06-03T14:00:00.000Z");

  it("bolus RUNNING uses clinical start not scheduled hour", () => {
    const placement = buildMarBolusTimelinePlacement({
      bolusStatus: "RUNNING",
      doseStatus: "IN_PROGRESS",
      scheduledAt,
      clinicalStartAt: "2026-06-03T09:00:00.000Z",
    });
    expect(placement.toISOString()).toBe("2026-06-03T09:00:00.000Z");
  });

  it("bolus COMPLETE uses clinical completion time", () => {
    const placement = buildMarBolusTimelinePlacement({
      bolusStatus: "COMPLETED",
      doseStatus: "COMPLETED",
      scheduledAt,
      clinicalStartAt: "2026-06-03T09:00:00.000Z",
      clinicalCompleteAt: "2026-06-03T09:45:00.000Z",
    });
    expect(placement.toISOString()).toBe("2026-06-03T09:45:00.000Z");
  });

  it("late documentation does not move bolus placement when MAR clinical overlay present", () => {
    const universalNotes = `${MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX} action=BOLUS_START clinical=2026-06-03T09:00:00.000Z documented=2026-06-03T14:02:00.000Z reason=CLINICAL_ACCURACY`;
    const merged = mergeMarClinicalFluidOverlay({
      fluidStartedAt: "2026-06-03T14:02:00.000Z",
      marStartedAt: "2026-06-03T14:02:00.000Z",
      marNotes: universalNotes,
    });
    expect(merged.clinicalStartAt).toBe("2026-06-03T09:00:00.000Z");
  });

  it("infusion start/stop use clinical timestamps", () => {
    expect(
      buildMarInfusionTimelinePlacement({
        doseStatus: "IN_PROGRESS",
        scheduledAt,
        startedAt: "2026-06-03T08:30:00.000Z",
        isContinuousFluid: true,
      }).toISOString()
    ).toBe("2026-06-03T08:30:00.000Z");
    expect(
      buildMarInfusionTimelinePlacement({
        doseStatus: "COMPLETED",
        scheduledAt,
        startedAt: "2026-06-03T08:30:00.000Z",
        stoppedAt: "2026-06-03T12:15:00.000Z",
        isContinuousFluid: true,
      }).toISOString()
    ).toBe("2026-06-03T12:15:00.000Z");
  });

  it("IVPB start/stop use clinical timestamps", () => {
    expect(
      buildMarIvpbTimelinePlacement({
        doseStatus: "IN_PROGRESS",
        scheduledAt,
        startedAt: "2026-06-03T10:00:00.000Z",
      }).toISOString()
    ).toBe("2026-06-03T10:00:00.000Z");
    expect(
      buildMarIvpbTimelinePlacement({
        doseStatus: "COMPLETED",
        scheduledAt,
        startedAt: "2026-06-03T10:00:00.000Z",
        stoppedAt: "2026-06-03T11:30:00.000Z",
      }).toISOString()
    ).toBe("2026-06-03T11:30:00.000Z");
  });

  it("NS bolus production scenario — 09:00 start lands in 09A column not 14:00", () => {
    const ref = new Date("2026-06-03T12:00:00.000Z");
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", ref, "UTC");
    const columns = buildMarShiftTimelineColumns(startAt, endAt, "UTC");
    const placement = resolveMarClinicalDoseTimelinePlacementInstant({
      doseStatus: "IN_PROGRESS",
      doseKind: "FIXED_ADMINISTRATION",
      scheduledAt,
      fluid: {
        isFluidBolus: true,
        fluidBolusStatus: "RUNNING",
        fluidStartedAt: "2026-06-03T09:00:00.000Z",
      },
    });
    const columnKey = findMarShiftTimelineColumnKeyForInstant(placement, columns, "UTC");
    expect(columnKey).toBe(columns.find((c) => c.label === "09A")?.key ?? null);
    expect(columnKey).not.toBe(columns.find((c) => c.label === "14P")?.key ?? null);
  });

  it("administered placement prefers effectiveAdministeredAt", () => {
    const placement = resolveMarClinicalAdministrationPlacementInstant({
      administeredAt: "2026-06-03T14:02:00.000Z",
      effectiveAdministeredAt: "2026-06-03T09:15:00.000Z",
    });
    expect(placement?.toISOString()).toBe("2026-06-03T09:15:00.000Z");
  });
});
