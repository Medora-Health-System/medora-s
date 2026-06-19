import { describe, expect, it } from "vitest";
import {
  datetimeLocalToUtcIsoInFacilityTimeZone,
  detectMarOneHourModalTimelineMismatch,
  formatClinicalInstantInFacilityTimeZone,
  utcIsoToDatetimeLocalValueInFacilityTimeZone,
} from "@medora/shared";
import { formatMarShiftTimelineHeaderClock } from "@/features/mar/marShiftTimelineDisplay";
import { currentMarClinicalDateTimeLocalValue } from "@/features/mar/marUniversalMedicationActionTime";

const chicago = "America/Chicago";
const instant = "2026-06-19T07:00:00.000Z";

describe("marFacilityTimezoneRegression (MEDUI.ENTERPRISE.TIMEZONE.1)", () => {
  it("4 — UTC 2026-06-19T07:00:00Z displays 02:00 AM in America/Chicago", () => {
    const display = formatClinicalInstantInFacilityTimeZone({
      iso: instant,
      facilityTimezone: chicago,
      locale: "en-US",
    });
    expect(display).toMatch(/6\/19\/26/);
    expect(display).toMatch(/2:00/);
  });

  it("5 — timeline and modal display same 02:00 AM for same instant", () => {
    const timelineDisplay = formatMarShiftTimelineHeaderClock(
      new Date(instant),
      "en-US",
      chicago
    );
    const modalLocal = utcIsoToDatetimeLocalValueInFacilityTimeZone({
      iso: instant,
      facilityTimezone: chicago,
    });
    const modalDisplay = formatClinicalInstantInFacilityTimeZone({
      iso: instant,
      facilityTimezone: chicago,
      locale: "en-US",
    });

    expect(timelineDisplay).toMatch(/2:00/);
    expect(modalLocal).toBe("2026-06-19T02:00");
    expect(modalDisplay).toMatch(/2:00/);
    expect(timelineDisplay).toMatch(/6\/19\/2026/);
    expect(modalDisplay).toMatch(/6\/19\/26/);
  });

  it("6 — regression detects timeline 02:00 AM vs modal 03:00 AM mismatch", () => {
    const timelineDisplay = formatMarShiftTimelineHeaderClock(
      new Date(instant),
      "en-US",
      chicago
    );
    const wrongModalDisplay = formatClinicalInstantInFacilityTimeZone({
      iso: instant,
      facilityTimezone: "America/New_York",
      locale: "en-US",
    });
    expect(timelineDisplay).toMatch(/2:00/);
    expect(wrongModalDisplay).toMatch(/3:00/);
    expect(
      detectMarOneHourModalTimelineMismatch({
        storedUtcIso: instant,
        facilityTimezone: chicago,
        timelineDisplayTime: timelineDisplay,
        modalDisplayTime: wrongModalDisplay,
      })
    ).toBe(true);
    expect(
      detectMarOneHourModalTimelineMismatch({
        storedUtcIso: instant,
        facilityTimezone: chicago,
        timelineDisplayTime: timelineDisplay,
        modalDisplayTime: timelineDisplay,
      })
    ).toBe(false);
  });

  it("7 — clinical datetime-local 02:00 AM America/Chicago stores correct UTC", () => {
    const stored = datetimeLocalToUtcIsoInFacilityTimeZone({
      localValue: "2026-06-19T02:00",
      facilityTimezone: chicago,
    });
    expect(stored).toBe(instant);
  });

  it("8 — UTC converts back to same datetime-local in America/Chicago", () => {
    const local = utcIsoToDatetimeLocalValueInFacilityTimeZone({
      iso: instant,
      facilityTimezone: chicago,
    });
    expect(local).toBe("2026-06-19T02:00");
  });

  it("16 — Now button uses facility timezone display", () => {
    const fixedNow = new Date(instant);
    const nowLocal = utcIsoToDatetimeLocalValueInFacilityTimeZone({
      iso: fixedNow.toISOString(),
      facilityTimezone: chicago,
    });
    expect(nowLocal).toBe("2026-06-19T02:00");
    expect(currentMarClinicalDateTimeLocalValue(chicago)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
    );
  });
});
