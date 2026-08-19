import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineColumns,
  doseOverlapsMarShiftTimelineWindow,
  findMarShiftTimelineColumnKeyForInstant,
  resolveMarScheduledDoseInstanceShiftCellInstant,
  resolveMarShiftTimelineColumnKey,
  resolveStandardMarShiftTimelineWindow,
} from "./marShiftTimeline.js";
import { resolveMarUniversalShiftTimelineDosePlacementInstant } from "../mar/marUniversalClinicalTimeGovernance.js";
import { resolveMarShiftTimelineOrderItemPlacementInstant } from "./marShiftTimelineOrderItemFallback.js";

describe("resolveMarScheduledDoseInstanceShiftCellInstant (MEDUI.INP.2E.1)", () => {
  const scheduledAt = new Date("2026-06-11T09:00:00.000Z");
  const onTime = new Date("2026-06-11T09:00:00.000Z");
  const early = new Date("2026-06-11T08:00:00.000Z");
  const late = new Date("2026-06-11T11:00:00.000Z");
  const outsideShift = new Date("2026-06-11T00:15:00.000Z");

  const dayRef = new Date("2026-06-11T12:00:00.000Z");
  const { startAt: dayStart, endAt: dayEnd } = resolveStandardMarShiftTimelineWindow(
    "7A_7P",
    dayRef,
    "UTC"
  );
  const dayColumns = buildMarShiftTimelineColumns(dayStart, dayEnd, "UTC");

  const nightRef = new Date("2026-06-11T00:30:00.000Z");
  const { startAt: nightStart, endAt: nightEnd } = resolveStandardMarShiftTimelineWindow(
    "7P_7A",
    nightRef,
    "UTC"
  );
  const nightColumns = buildMarShiftTimelineColumns(nightStart, nightEnd, "UTC");

  function columnLabel(instant: Date, columns: typeof dayColumns): string | null {
    const key = findMarShiftTimelineColumnKeyForInstant(instant, columns, "UTC");
    return columns.find((c) => c.key === key)?.label ?? null;
  }

  function scheduledCell(clinical: Date) {
    return resolveMarScheduledDoseInstanceShiftCellInstant({
      scheduledAt,
      clinicalPlacementInstant: clinical,
      doseKind: "FIXED_ADMINISTRATION",
    });
  }

  it("on-time 09:00 administration stays in the 09:00 planned cell", () => {
    const cell = scheduledCell(onTime);
    expect(cell.toISOString()).toBe(scheduledAt.toISOString());
    expect(columnLabel(cell, dayColumns)).toBe("09A");
  });

  it("early administration stays in the 09:00 planned cell", () => {
    const cell = scheduledCell(early);
    expect(cell.toISOString()).toBe(scheduledAt.toISOString());
    expect(columnLabel(cell, dayColumns)).toBe("09A");
  });

  it("late administration stays in the 09:00 planned cell", () => {
    const cell = scheduledCell(late);
    expect(cell.toISOString()).toBe(scheduledAt.toISOString());
    expect(columnLabel(cell, dayColumns)).toBe("09A");
  });

  it("clinical time outside the display shift does not drop or move the planned cell", () => {
    const clinicalPlacement = resolveMarUniversalShiftTimelineDosePlacementInstant({
      doseStatus: "COMPLETED",
      doseKind: "FIXED_ADMINISTRATION",
      scheduledAt,
      enrichment: { administeredAt: outsideShift.toISOString() },
    });
    expect(clinicalPlacement.toISOString()).toBe(outsideShift.toISOString());
    expect(columnLabel(clinicalPlacement, dayColumns)).toBeNull();

    const cell = resolveMarScheduledDoseInstanceShiftCellInstant({
      scheduledAt,
      clinicalPlacementInstant: clinicalPlacement,
      doseKind: "FIXED_ADMINISTRATION",
    });
    expect(cell.toISOString()).toBe(scheduledAt.toISOString());
    expect(columnLabel(cell, dayColumns)).toBe("09A");
    expect(
      resolveMarShiftTimelineColumnKey({
        scheduledAt: cell,
        columns: nightColumns,
        facilityTimeZone: "UTC",
      })
    ).toBeNull();

    expect(
      doseOverlapsMarShiftTimelineWindow({
        shiftStart: dayStart,
        shiftEnd: dayEnd,
        scheduledAt: cell,
        dueWindowStartAt: scheduledAt,
        dueWindowEndAt: new Date(scheduledAt.getTime() + 60 * 60 * 1000),
        doseStatus: "COMPLETED",
      })
    ).toBe(true);

    expect(
      doseOverlapsMarShiftTimelineWindow({
        shiftStart: nightStart,
        shiftEnd: nightEnd,
        scheduledAt: cell,
        dueWindowStartAt: scheduledAt,
        dueWindowEndAt: new Date(scheduledAt.getTime() + 60 * 60 * 1000),
        doseStatus: "COMPLETED",
      })
    ).toBe(false);
  });

  it("refused scheduled dose remains in the scheduled cell", () => {
    const cell = scheduledCell(outsideShift);
    expect(cell.toISOString()).toBe(scheduledAt.toISOString());
    expect(columnLabel(cell, dayColumns)).toBe("09A");
  });

  it("missed/not-given scheduled dose remains in the scheduled cell", () => {
    const cell = scheduledCell(outsideShift);
    expect(cell.toISOString()).toBe(scheduledAt.toISOString());
    expect(
      doseOverlapsMarShiftTimelineWindow({
        shiftStart: dayStart,
        shiftEnd: dayEnd,
        scheduledAt: cell,
        dueWindowStartAt: scheduledAt,
        dueWindowEndAt: new Date(scheduledAt.getTime() + 60 * 60 * 1000),
        doseStatus: "MISSED",
      })
    ).toBe(true);
  });

  it("IVPB completed cells still use clinical placement", () => {
    const stopAt = new Date("2026-06-11T11:30:00.000Z");
    const cell = resolveMarScheduledDoseInstanceShiftCellInstant({
      scheduledAt,
      clinicalPlacementInstant: stopAt,
      doseKind: "IVPB_SESSION",
    });
    expect(cell.toISOString()).toBe(stopAt.toISOString());
  });

  it("fluid bolus/continuous cells still use clinical placement", () => {
    const startAt = new Date("2026-06-11T07:30:00.000Z");
    expect(
      resolveMarScheduledDoseInstanceShiftCellInstant({
        scheduledAt,
        clinicalPlacementInstant: startAt,
        doseKind: "FIXED_ADMINISTRATION",
        isFluidBolus: true,
      }).toISOString()
    ).toBe(startAt.toISOString());
    expect(
      resolveMarScheduledDoseInstanceShiftCellInstant({
        scheduledAt,
        clinicalPlacementInstant: startAt,
        doseKind: "FIXED_ADMINISTRATION",
        isContinuousFluid: true,
      }).toISOString()
    ).toBe(startAt.toISOString());
  });

  it("PRN_EVENT cells still use clinical placement", () => {
    const givenAt = new Date("2026-06-11T14:40:00.000Z");
    const cell = resolveMarScheduledDoseInstanceShiftCellInstant({
      scheduledAt,
      clinicalPlacementInstant: givenAt,
      doseKind: "PRN_EVENT",
    });
    expect(cell.toISOString()).toBe(givenAt.toISOString());
  });

  it("NOW/STAT without a dose instance still places from administration time", () => {
    const createdAt = new Date("2026-06-11T00:19:00.000Z");
    const administeredAt = new Date("2026-06-11T00:19:20.000Z");
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: null,
      frequencyCode: "NOW",
      notes: null,
      administeredAt,
      useAdministeredPlacement: true,
    });
    expect(placement.toISOString()).toBe(administeredAt.toISOString());
  });
});
