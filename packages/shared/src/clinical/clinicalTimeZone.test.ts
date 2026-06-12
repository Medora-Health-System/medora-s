import { describe, expect, it } from "vitest";
import {
  clinicalDatetimeLocalFromInstant,
  clinicalDatetimeLocalToUtcIso,
  formatClinicalDateTimeInZone,
  resolveClinicalTimeZone,
} from "./clinicalTimeZone.js";
import { formatMarShiftTimelineHourLabel } from "../medication/marShiftTimeline.js";
import { wallClockToUtc } from "../medication/medicationDoseExpansionPlanner.js";

describe("clinicalTimeZone (K.10B.1)", () => {
  const haitiTz = "America/Port-au-Prince";

  it("resolveClinicalTimeZone prefers facility over hospital over UTC", () => {
    expect(resolveClinicalTimeZone({ facilityTimeZone: haitiTz })).toBe(haitiTz);
    expect(resolveClinicalTimeZone({ facilityTimeZone: null, hospitalTimeZone: haitiTz })).toBe(haitiTz);
    expect(resolveClinicalTimeZone({})).toBe("UTC");
  });

  it("clinicalDatetimeLocal round-trips facility wall clock", () => {
    const instant = wallClockToUtc(2026, 6, 11, 23, 35, haitiTz);
    const local = clinicalDatetimeLocalFromInstant(instant, haitiTz);
    expect(local).toBe("2026-06-11T23:35");
    expect(clinicalDatetimeLocalToUtcIso(local, haitiTz)).toBe(instant.toISOString());
  });

  it("formatClinicalDateTimeInZone uses facility TZ not runtime local", () => {
    const instant = wallClockToUtc(2026, 6, 11, 23, 34, haitiTz);
    const formatted = formatClinicalDateTimeInZone(instant, "en-US", haitiTz);
    expect(formatted).toMatch(/11:34\sPM|23:34/);
    expect(formatMarShiftTimelineHourLabel(instant, haitiTz)).toBe("11P");
  });
});
