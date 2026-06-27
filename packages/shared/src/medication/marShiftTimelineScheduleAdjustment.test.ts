import { describe, expect, it } from "vitest";
import {
  filterMarShiftTimelineDrawerActionsForDoseContext,
  marShiftTimelineHasScheduleAdjustmentDoseContext,
  resolveMarShiftTimelineDrawerActions,
} from "./marShiftTimeline.js";

describe("marShiftTimeline schedule adjustment dose context", () => {
  it("requires a non-empty medication dose instance id for direct dose PATCH", () => {
    expect(marShiftTimelineHasScheduleAdjustmentDoseContext("dose-1")).toBe(true);
    expect(marShiftTimelineHasScheduleAdjustmentDoseContext("")).toBe(false);
    expect(marShiftTimelineHasScheduleAdjustmentDoseContext(null)).toBe(false);
    expect(marShiftTimelineHasScheduleAdjustmentDoseContext(undefined)).toBe(false);
  });

  it("keeps CHANGE_SCHEDULED_TIME visible even when dose instance id is missing", () => {
    const base = resolveMarShiftTimelineDrawerActions("ADMINISTER");
    expect(base).toContain("CHANGE_SCHEDULED_TIME");
    expect(filterMarShiftTimelineDrawerActionsForDoseContext(base, "dose-1")).toContain(
      "CHANGE_SCHEDULED_TIME"
    );
    expect(filterMarShiftTimelineDrawerActionsForDoseContext(base, "")).toContain(
      "CHANGE_SCHEDULED_TIME"
    );
    expect(filterMarShiftTimelineDrawerActionsForDoseContext(base, null)).toContain(
      "CHANGE_SCHEDULED_TIME"
    );
  });
});
