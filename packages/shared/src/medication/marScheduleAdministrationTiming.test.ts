import { describe, expect, it } from "vitest";
import { wallClockToUtc } from "./medicationDoseExpansionPlanner.js";
import { evaluateMarScheduleAdministrationTiming } from "./marScheduleAdministrationTiming.js";

describe("evaluateMarScheduleAdministrationTiming (K.10B.5)", () => {
  const haiti = "America/Port-au-Prince";

  it("flags early administration before due window start", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 10, 0, haiti);
    const dueStart = scheduled;
    const dueEnd = new Date(scheduled.getTime() + 60 * 60 * 1000);
    const administeredEarly = wallClockToUtc(2026, 6, 12, 9, 30, haiti);

    const result = evaluateMarScheduleAdministrationTiming({
      administeredAt: administeredEarly,
      scheduledAt: scheduled,
      dueWindowStartAt: dueStart,
      dueWindowEndAt: dueEnd,
      facilityTimeZone: haiti,
      locale: "en-US",
    });

    expect(result.kind).toBe("early");
    expect(result.requiresReason).toBe(true);
    expect(result.scheduledTimeDisplay.length).toBeGreaterThan(0);
  });

  it("flags late administration after due window end", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 10, 0, haiti);
    const dueStart = scheduled;
    const dueEnd = new Date(scheduled.getTime() + 60 * 60 * 1000);
    const administeredLate = wallClockToUtc(2026, 6, 12, 11, 15, haiti);

    const result = evaluateMarScheduleAdministrationTiming({
      administeredAt: administeredLate,
      scheduledAt: scheduled,
      dueWindowStartAt: dueStart,
      dueWindowEndAt: dueEnd,
      facilityTimeZone: haiti,
      locale: "en-US",
    });

    expect(result.kind).toBe("late");
    expect(result.requiresReason).toBe(true);
  });

  it("on-time administration within due window does not require reason", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 10, 0, haiti);
    const dueStart = scheduled;
    const dueEnd = new Date(scheduled.getTime() + 60 * 60 * 1000);
    const administeredOnTime = wallClockToUtc(2026, 6, 12, 10, 30, haiti);

    const result = evaluateMarScheduleAdministrationTiming({
      administeredAt: administeredOnTime,
      scheduledAt: scheduled,
      dueWindowStartAt: dueStart,
      dueWindowEndAt: dueEnd,
      facilityTimeZone: haiti,
      locale: "en-US",
    });

    expect(result.kind).toBe("on_time");
    expect(result.requiresReason).toBe(false);
  });
});
