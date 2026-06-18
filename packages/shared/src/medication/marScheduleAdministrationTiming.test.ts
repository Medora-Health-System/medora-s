import { describe, expect, it } from "vitest";
import { wallClockToUtc } from "./medicationDoseExpansionPlanner.js";
import { evaluateMarScheduleAdministrationTiming } from "./marScheduleAdministrationTiming.js";

describe("evaluateMarScheduleAdministrationTiming (K.10B.5)", () => {
  const haiti = "America/Port-au-Prince";

  it("flags early administration before ±60 minute window", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 10, 0, haiti);
    const dueStart = scheduled;
    const dueEnd = new Date(scheduled.getTime() + 60 * 60 * 1000);
    const administeredEarly = wallClockToUtc(2026, 6, 12, 8, 45, haiti);

    const result = evaluateMarScheduleAdministrationTiming({
      administeredAt: administeredEarly,
      scheduledAt: scheduled,
      dueWindowStartAt: dueStart,
      dueWindowEndAt: dueEnd,
      facilityTimeZone: haiti,
      locale: "en-US",
    });

    expect(result.kind).toBe("early");
    expect(result.requiresReason).toBe(false);
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
    expect(result.requiresReason).toBe(false);
  });

  it("administration within ±60 minutes of scheduled is on-time", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 10, 0, haiti);
    const dueStart = scheduled;
    const dueEnd = new Date(scheduled.getTime() + 60 * 60 * 1000);
    const administeredOnTime = wallClockToUtc(2026, 6, 12, 9, 30, haiti);

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

  it("on-time administration at scheduled time does not require reason", () => {
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
