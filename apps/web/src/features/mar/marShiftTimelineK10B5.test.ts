import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateMarScheduleAdministrationTiming,
  resolveMarShiftTimelineOrderItemPlacementInstant,
  wallClockToUtc,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("marShiftTimelineK10B5 — schedule timing governance + placement", () => {
  const haiti = "America/Port-au-Prince";

  it("early administration is advisory only (does not require reason)", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 10, 0, haiti);
    const dueEnd = new Date(scheduled.getTime() + 60 * 60 * 1000);
    const early = wallClockToUtc(2026, 6, 12, 8, 45, haiti);
    const timing = evaluateMarScheduleAdministrationTiming({
      administeredAt: early,
      scheduledAt: scheduled,
      dueWindowStartAt: scheduled,
      dueWindowEndAt: dueEnd,
      facilityTimeZone: haiti,
      locale: "fr-FR",
    });
    expect(timing.kind).toBe("early");
    expect(timing.requiresReason).toBe(false);
  });

  it("completed item placement uses administeredAt hour", () => {
    const createdAt = wallClockToUtc(2026, 6, 12, 14, 7, haiti);
    const administeredAt = wallClockToUtc(2026, 6, 12, 16, 10, haiti);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: createdAt,
      frequencyCode: "NOW",
      notes: null,
      administeredAt,
      useAdministeredPlacement: true,
    });
    expect(placement.toISOString()).toBe(administeredAt.toISOString());
  });

  it("MedicationAdministrationTab shows outside-window advisory (HOTFIX.TIME.1)", () => {
    const source = readFileSync(
      join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(source).toContain("resolveMarMedicationTimingAdvisory");
    expect(source).toContain("mar-outside-window-advisory");
    expect(source).toContain("timingAdvisory.messageKey");
    expect(source).toContain("marClinicalDateTimeLocalToUtcIso");
  });

  it("CreateOrderModal blocks submit when facility timezone not ready (K.10B.5)", () => {
    const source = readFileSync(join(webSrcRoot, "components/orders/CreateOrderModal.tsx"), "utf8");
    expect(source).toContain("facilityClinicalTimeZoneReady");
    expect(source).toContain('t("createOrderModal.errFacilityTimezoneNotReady")');
    expect(source).toContain("isAdministerToPatientIntent");
  });
});
