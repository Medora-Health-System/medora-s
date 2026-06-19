import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  datetimeLocalToUtcIsoInFacilityTimeZone,
  utcIsoToDatetimeLocalValueInFacilityTimeZone,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");
const chicago = "America/Chicago";
const instant = "2026-06-19T07:00:00.000Z";

describe("marPostHocAdjustTimeTimezone (MEDUI.ENTERPRISE.TIMEZONE.1)", () => {
  it("14 — post-hoc adjust modal uses facility timezone conversion", () => {
    const modal = readFileSync(
      join(webRoot, "components/encounters/MedicationAdministrationEffectiveTimeModal.tsx"),
      "utf8"
    );
    expect(modal).toContain("utcIsoToDatetimeLocalValueInFacilityTimeZone");
    expect(modal).toContain("datetimeLocalToUtcIsoInFacilityTimeZone");
    expect(modal).not.toContain("datetimeLocalValueToUtcIso");
  });

  it("post-hoc modal roundtrip matches MAR timeline display", () => {
    const local = utcIsoToDatetimeLocalValueInFacilityTimeZone({
      iso: instant,
      facilityTimezone: chicago,
    });
    const stored = datetimeLocalToUtcIsoInFacilityTimeZone({
      localValue: local,
      facilityTimezone: chicago,
    });
    expect(stored).toBe(instant);
  });

  it("20 — no datetimeLocalValueToUtcIso in MAR clinical paths (tab)", () => {
    const tab = readFileSync(
      join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(tab).not.toContain("datetimeLocalValueToUtcIso(");
    expect(tab).toContain("marClinicalDateTimeLocalToUtcIso");
  });
});
