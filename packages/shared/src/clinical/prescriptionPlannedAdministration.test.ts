import { describe, expect, it } from "vitest";
import { clinicalDatetimeLocalFromInstant } from "./clinicalTimeZone.js";
import { wallClockToUtc } from "../medication/medicationDoseExpansionPlanner.js";
import {
  browserLocalDatetimeLocalValue,
  isBrowserLocalPlannedAdminArtifact,
  shouldReplaceUntouchedPlannedAdminLocal,
} from "./prescriptionPlannedAdministration.js";

describe("prescriptionPlannedAdministration (K.10B.5)", () => {
  const haiti = "America/Port-au-Prince";

  it("detects browser-local datetime-local artifact", () => {
    const now = wallClockToUtc(2026, 6, 12, 12, 21, "America/Chicago");
    const browserArtifact = browserLocalDatetimeLocalValue(now);
    expect(isBrowserLocalPlannedAdminArtifact(browserArtifact, now)).toBe(true);
    expect(
      isBrowserLocalPlannedAdminArtifact(
        clinicalDatetimeLocalFromInstant(now, haiti),
        now
      )
    ).toBe(false);
  });

  it("shouldReplaceUntouchedPlannedAdminLocal replaces browser artifact with facility authority", () => {
    const now = wallClockToUtc(2026, 6, 12, 12, 21, haiti);
    const browserArtifact = browserLocalDatetimeLocalValue(now);
    expect(
      shouldReplaceUntouchedPlannedAdminLocal({
        localValue: browserArtifact,
        plannedAdminAtTouched: false,
        facilityTimeZone: haiti,
        now,
      })
    ).toBe(true);
    expect(
      shouldReplaceUntouchedPlannedAdminLocal({
        localValue: clinicalDatetimeLocalFromInstant(now, haiti),
        plannedAdminAtTouched: false,
        facilityTimeZone: haiti,
        now,
      })
    ).toBe(false);
  });

  it("does not replace touched provider edit", () => {
    const now = wallClockToUtc(2026, 6, 12, 12, 21, haiti);
    expect(
      shouldReplaceUntouchedPlannedAdminLocal({
        localValue: "2026-06-12T06:00",
        plannedAdminAtTouched: true,
        facilityTimeZone: haiti,
        now,
      })
    ).toBe(false);
  });
});
