import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMarShiftTimelineColumns,
  resolveMarShiftTimelineColumnKey,
  resolveMarShiftTimelineOrderItemPlacementInstant,
  resolveStandardMarShiftTimelineWindow,
  wallClockToUtc,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("marShiftTimelineK10B3 — planned administration authority", () => {
  const haiti = "America/Port-au-Prince";

  function columnForPlacement(
    placement: Date,
    shiftCode: "7A_7P" | "7P_7A" = "7A_7P"
  ): string {
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow(shiftCode, placement, haiti);
    const columns = buildMarShiftTimelineColumns(startAt, endAt, haiti);
    const key = resolveMarShiftTimelineColumnKey({
      scheduledAt: placement,
      columns,
      facilityTimeZone: haiti,
    });
    return columns.find((c) => c.key === key)?.label ?? "none";
  }

  it("NOW 12:21 PM → 12P column", () => {
    const createdAt = wallClockToUtc(2026, 6, 12, 12, 21, haiti);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: null,
      frequencyCode: "NOW",
      notes: null,
    });
    expect(columnForPlacement(placement)).toBe("12P");
  });

  it("NOW +1h auto intended artifact → 12P not 01P", () => {
    const createdAt = wallClockToUtc(2026, 6, 12, 12, 21, haiti);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
      frequencyCode: "NOW",
      notes: null,
    });
    expect(columnForPlacement(placement)).toBe("12P");
  });

  it("provider 06:00 AM intended → 06A", () => {
    const createdAt = wallClockToUtc(2026, 6, 12, 12, 21, haiti);
    const planned = wallClockToUtc(2026, 6, 12, 6, 0, haiti);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: planned,
      frequencyCode: "NOW",
      notes: "give now",
    });
    expect(columnForPlacement(placement, "7P_7A")).toBe("06A");
  });

  it("provider 11:35 PM → 11P", () => {
    const createdAt = wallClockToUtc(2026, 6, 11, 23, 5, haiti);
    const planned = wallClockToUtc(2026, 6, 11, 23, 35, haiti);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: planned,
      frequencyCode: "NOW",
      notes: null,
    });
    expect(columnForPlacement(placement, "7P_7A")).toBe("11P");
  });

  it("Metoprolol NOW 10:07 regression → 10P", () => {
    const createdAt = wallClockToUtc(2026, 6, 3, 22, 7, haiti);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: null,
      frequencyCode: "NOW",
      notes: null,
    });
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", createdAt, haiti);
    const columns = buildMarShiftTimelineColumns(startAt, endAt, haiti);
    const key = resolveMarShiftTimelineColumnKey({
      scheduledAt: placement,
      columns,
      facilityTimeZone: haiti,
    });
    expect(columns.find((c) => c.key === key)?.label).toBe("10P");
  });

  it("CreateOrderModal uses facility TZ for planned admin (K10B3)", () => {
    const modal = readFileSync(
      join(webSrcRoot, "components/orders/CreateOrderModal.tsx"),
      "utf8"
    );
    expect(modal).toContain("useFacilityAndRoles");
    expect(modal).toContain("lastAppliedFacilityTzRef");
    expect(modal).toContain("resolveMedicationOrderItemIntendedUtcForSubmit");
    expect(modal).toContain("resolveClinicalTimeZone");
  });

  it("K10B2 drawer sync regression wiring intact", () => {
    const marTab = readFileSync(
      join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(marTab).toContain("timelineReopenDrawerRef");
  });
});
