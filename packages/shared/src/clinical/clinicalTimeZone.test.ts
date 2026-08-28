import { describe, expect, it } from "vitest";
import {
  clinicalDatetimeLocalFromInstant,
  clinicalDatetimeLocalToUtcIso,
  datetimeLocalToUtcIsoInFacilityTimeZone,
  formatClinicalDateTimeInZone,
  instantToLocalDateTimeInput,
  localDateTimeInputToIso,
  resolveClinicalTimeZone,
  utcIsoToDatetimeLocalValueInFacilityTimeZone,
} from "./clinicalTimeZone.js";
import { formatMarShiftTimelineHourLabel } from "../medication/marShiftTimeline.js";
import { wallClockToUtc } from "../medication/medicationDoseExpansionPlanner.js";

describe("clinicalTimeZone (K.10B.1)", () => {
  const haitiTz = "America/Port-au-Prince";

  it("resolveClinicalTimeZone prefers facility over hospital over enterprise default", () => {
    expect(resolveClinicalTimeZone({ facilityTimeZone: haitiTz })).toBe(haitiTz);
    expect(resolveClinicalTimeZone({ facilityTimeZone: null, hospitalTimeZone: haitiTz })).toBe(
      haitiTz
    );
    expect(resolveClinicalTimeZone({})).toBe("America/Chicago");
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

  it("instantToLocalDateTimeInput / localDateTimeInputToIso round-trip wall clock", () => {
    const iso = new Date(2026, 2, 15, 14, 30, 0, 0).toISOString();
    const local = instantToLocalDateTimeInput(iso);
    expect(local).toBe("2026-03-15T14:30");
    const back = localDateTimeInputToIso(local);
    expect(back).toBe(iso);
    expect(instantToLocalDateTimeInput(back)).toBe(local);
  });

  it("facility America/Chicago datetime-local does not shift on reload", () => {
    const chicago = "America/Chicago";
    // Avoid spring-forward gap (2:00 AM does not exist on DST start).
    const instant = wallClockToUtc(2026, 6, 15, 14, 30, chicago);
    const local = utcIsoToDatetimeLocalValueInFacilityTimeZone({
      iso: instant.toISOString(),
      facilityTimezone: chicago,
    });
    expect(local).toBe("2026-06-15T14:30");
    const roundTrip = datetimeLocalToUtcIsoInFacilityTimeZone({
      localValue: local,
      facilityTimezone: chicago,
    });
    expect(roundTrip).toBe(instant.toISOString());
    expect(
      utcIsoToDatetimeLocalValueInFacilityTimeZone({
        iso: roundTrip,
        facilityTimezone: chicago,
      })
    ).toBe("2026-06-15T14:30");
  });

  it("does not use UTC ISO string slicing for datetime-local (non-UTC offset)", () => {
    const iso = "2026-03-15T19:30:00.000Z";
    const sliced = iso.slice(0, 16);
    const local = instantToLocalDateTimeInput(iso);
    if (new Date().getTimezoneOffset() !== 0) {
      expect(local).not.toBe(sliced);
    }
    const back = localDateTimeInputToIso(local);
    expect(back).toBeTruthy();
    expect(instantToLocalDateTimeInput(back!)).toBe(local);
  });
});
