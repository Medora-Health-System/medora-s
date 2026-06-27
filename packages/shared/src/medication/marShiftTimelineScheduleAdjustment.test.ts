import { describe, expect, it } from "vitest";
import {
  filterMarShiftTimelineDrawerActionsForDoseContext,
  marShiftTimelineHasScheduleAdjustmentDoseContext,
  resolveMarShiftTimelineDrawerActions,
} from "./marShiftTimeline.js";

describe("marShiftTimeline schedule adjustment dose context", () => {
  it("requires a non-empty medication dose instance id", () => {
    expect(marShiftTimelineHasScheduleAdjustmentDoseContext("dose-1")).toBe(true);
    expect(marShiftTimelineHasScheduleAdjustmentDoseContext("")).toBe(false);
    expect(marShiftTimelineHasScheduleAdjustmentDoseContext(null)).toBe(false);
    expect(marShiftTimelineHasScheduleAdjustmentDoseContext(undefined)).toBe(false);
  });

  it("removes CHANGE_SCHEDULED_TIME when dose instance id is missing", () => {
    const base = resolveMarShiftTimelineDrawerActions("ADMINISTER");
    expect(base).toContain("CHANGE_SCHEDULED_TIME");
    expect(filterMarShiftTimelineDrawerActionsForDoseContext(base, "dose-1")).toContain(
      "CHANGE_SCHEDULED_TIME"
    );
    expect(filterMarShiftTimelineDrawerActionsForDoseContext(base, "")).not.toContain(
      "CHANGE_SCHEDULED_TIME"
    );
    expect(filterMarShiftTimelineDrawerActionsForDoseContext(base, null)).not.toContain(
      "CHANGE_SCHEDULED_TIME"
    );
  });

  it("preserves other administer actions when schedule change is filtered", () => {
    const filtered = filterMarShiftTimelineDrawerActionsForDoseContext(
      resolveMarShiftTimelineDrawerActions("ADMINISTER"),
      ""
    );
    expect(filtered).toEqual(
      expect.arrayContaining(["ADMINISTER", "REFUSE", "HOLD", "MARK_MISSED", "VIEW_ORDER"])
    );
    expect(filtered).not.toContain("CHANGE_SCHEDULED_TIME");
  });
});
