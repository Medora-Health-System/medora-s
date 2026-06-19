import { describe, expect, it } from "vitest";
import { wallClockToUtc } from "../medication/medicationDoseExpansionPlanner.js";
import {
  datetimeLocalToUtcIsoInFacilityTimeZone,
  formatClinicalInstantInFacilityTimeZone,
  utcIsoToDatetimeLocalValueInFacilityTimeZone,
} from "./clinicalTimeZone.js";
import { MEDORA_DEFAULT_FACILITY_TIMEZONE } from "./facilityTimezoneDefaults.js";

describe("clinicalTimeZoneFacilityConversion (MEDUI.ENTERPRISE.TIMEZONE.1)", () => {
  const chicago = "America/Chicago";

  it("4 — UTC instant displays 02:00 AM in America/Chicago (summer)", () => {
    const instant = wallClockToUtc(2026, 6, 19, 2, 0, chicago);
    const display = formatClinicalInstantInFacilityTimeZone({
      iso: instant,
      facilityTimezone: chicago,
      locale: "en-US",
    });
    expect(display).toMatch(/2:00/);
  });

  it("7-8 — datetime-local roundtrip in America/Chicago", () => {
    const local = "2026-06-19T02:00";
    const utc = datetimeLocalToUtcIsoInFacilityTimeZone({
      localValue: local,
      facilityTimezone: chicago,
    });
    expect(utc).toBe("2026-06-19T07:00:00.000Z");
    expect(
      utcIsoToDatetimeLocalValueInFacilityTimeZone({
        iso: utc,
        facilityTimezone: chicago,
      })
    ).toBe(local);
  });

  it("22 — DST America/Chicago summer case passes", () => {
    const summer = wallClockToUtc(2026, 6, 19, 14, 0, chicago);
    expect(
      utcIsoToDatetimeLocalValueInFacilityTimeZone({
        iso: summer,
        facilityTimezone: chicago,
      })
    ).toBe("2026-06-19T14:00");
  });

  it("23 — DST America/Chicago winter case passes", () => {
    const winter = wallClockToUtc(2026, 1, 15, 14, 0, chicago);
    expect(
      utcIsoToDatetimeLocalValueInFacilityTimeZone({
        iso: winter,
        facilityTimezone: chicago,
      })
    ).toBe("2026-01-15T14:00");
  });

  it("32 — UTC storage unchanged after roundtrip", () => {
    const iso = "2026-06-19T07:00:00.000Z";
    const local = utcIsoToDatetimeLocalValueInFacilityTimeZone({
      iso,
      facilityTimezone: chicago,
    });
    const roundTrip = datetimeLocalToUtcIsoInFacilityTimeZone({
      localValue: local,
      facilityTimezone: chicago,
    });
    expect(roundTrip).toBe(iso);
  });

  it("default uses enterprise Chicago when timezone omitted", () => {
    expect(MEDORA_DEFAULT_FACILITY_TIMEZONE).toBe("America/Chicago");
    const local = utcIsoToDatetimeLocalValueInFacilityTimeZone({
      iso: "2026-06-19T07:00:00.000Z",
      facilityTimezone: null,
    });
    expect(local).toBe("2026-06-19T02:00");
  });
});
