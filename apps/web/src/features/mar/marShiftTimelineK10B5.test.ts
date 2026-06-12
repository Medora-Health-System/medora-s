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

  it("early administration requires reason before save", () => {
    const scheduled = wallClockToUtc(2026, 6, 12, 10, 0, haiti);
    const dueEnd = new Date(scheduled.getTime() + 60 * 60 * 1000);
    const early = wallClockToUtc(2026, 6, 12, 9, 15, haiti);
    const timing = evaluateMarScheduleAdministrationTiming({
      administeredAt: early,
      scheduledAt: scheduled,
      dueWindowStartAt: scheduled,
      dueWindowEndAt: dueEnd,
      facilityTimeZone: haiti,
      locale: "fr-FR",
    });
    expect(timing.kind).toBe("early");
    expect(timing.requiresReason).toBe(true);
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

  it("MedicationAdministrationTab wires schedule timing reason validation (K.10B.5)", () => {
    const source = readFileSync(
      join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(source).toContain("evaluateMarScheduleAdministrationTiming");
    expect(source).toContain("marScheduleTimingReason");
    expect(source).toContain('t("marScheduleTiming.reasonRequired")');
    expect(source).toContain("clinicalDatetimeLocalFromInstant(new Date(), tz)");
  });

  it("CreateOrderModal blocks submit when facility timezone not ready (K.10B.5)", () => {
    const source = readFileSync(join(webSrcRoot, "components/orders/CreateOrderModal.tsx"), "utf8");
    expect(source).toContain("facilityClinicalTimeZoneReady");
    expect(source).toContain('t("createOrderModal.errFacilityTimezoneNotReady")');
    expect(source).toContain("isAdministerToPatientIntent");
  });
});
