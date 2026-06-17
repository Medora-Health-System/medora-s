import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineColumns,
  findMarShiftTimelineColumnKeyForInstant,
  resolveMarUniversalPlacementInstant,
  resolveStandardMarShiftTimelineWindow,
} from "@medora/shared";

describe("marTimelineClinicalPlacementCertification (H9F)", () => {
  const ref = new Date("2026-06-03T12:00:00.000Z");
  const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", ref, "UTC");
  const columns = buildMarShiftTimelineColumns(startAt, endAt, "UTC");

  function expectColumn(iso: string, label: string) {
    const placement = resolveMarUniversalPlacementInstant({
      clinicalTime: iso,
      isTerminalOrCompleted: true,
    });
    const key = findMarShiftTimelineColumnKeyForInstant(placement, columns, "UTC");
    expect(columns.find((c) => c.key === key)?.label).toBe(label);
  }

  it("regular admin and PRN at 14:15 → 02P", () => {
    expectColumn("2026-06-03T14:15:00.000Z", "02P");
  });

  it("refused 10:02 → 10A", () => {
    expectColumn("2026-06-03T10:02:00.000Z", "10A");
  });

  it("held 08:45 → 08A", () => {
    expectColumn("2026-06-03T08:45:00.000Z", "08A");
  });

  it("missed 12:10 → 12P", () => {
    expectColumn("2026-06-03T12:10:00.000Z", "12P");
  });

  it("infusion start/stop and bolus complete at 09:51-09:52 → 09A", () => {
    expectColumn("2026-06-03T09:51:00.000Z", "09A");
    expectColumn("2026-06-03T09:52:00.000Z", "09A");
  });

  it("pending uses adjusted scheduled time when no clinical terminal time", () => {
    const adjusted = "2026-06-03T13:00:00.000Z";
    const placement = resolveMarUniversalPlacementInstant({
      isPending: true,
      adjustedScheduledTime: adjusted,
      originalScheduledTime: "2026-06-03T14:00:00.000Z",
    });
    expect(placement.toISOString()).toBe(adjusted);
  });
});
