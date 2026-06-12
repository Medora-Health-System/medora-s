import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineColumns,
  formatMarShiftTimelineHourLabel,
  resolveMarShiftTimelineColumnKey,
  resolveMarShiftTimelineOrderItemPlacementInstant,
  resolveStandardMarShiftTimelineWindow,
  wallClockToUtc,
} from "@medora/shared";

describe("marShiftTimelineK10B1 — facility timezone authority", () => {
  const haitiTz = "America/Port-au-Prince";

  function columnForCreatedAt(createdAt: Date): string {
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", createdAt, haitiTz);
    const columns = buildMarShiftTimelineColumns(startAt, endAt, haitiTz);
    const placement = resolveMarShiftTimelineOrderItemPlacementInstant({
      createdAt,
      intendedAdministrationAt: wallClockToUtc(2026, 6, 12, 0, 34, haitiTz),
      frequencyCode: "NOW",
      notes: null,
    });
    const key = resolveMarShiftTimelineColumnKey({
      scheduledAt: placement,
      columns,
      facilityTimeZone: haitiTz,
    });
    const col = columns.find((c) => c.key === key);
    return col?.label ?? "none";
  }

  it("NOW order at 10:15 PM facility maps to 10P (not browser Central)", () => {
    const createdAt = wallClockToUtc(2026, 6, 11, 22, 15, haitiTz);
    expect(formatMarShiftTimelineHourLabel(createdAt, haitiTz)).toBe("10P");
    expect(columnForCreatedAt(createdAt)).toBe("10P");
  });

  it("NOW order at 10:45 PM facility maps to 10P", () => {
    const createdAt = wallClockToUtc(2026, 6, 11, 22, 45, haitiTz);
    expect(columnForCreatedAt(createdAt)).toBe("10P");
  });

  it("NOW order at 11:05 PM facility maps to 11P", () => {
    const createdAt = wallClockToUtc(2026, 6, 11, 23, 5, haitiTz);
    expect(columnForCreatedAt(createdAt)).toBe("11P");
  });

  it("NOW order at 11:35 PM facility maps to 11P (not 12A)", () => {
    const createdAt = wallClockToUtc(2026, 6, 11, 23, 35, haitiTz);
    expect(columnForCreatedAt(createdAt)).toBe("11P");
    expect(columnForCreatedAt(createdAt)).not.toBe("12A");
  });

  it("documents Morphine staging mismatch: same UTC reads 11:34 PM Central vs 12:34 AM Haiti", () => {
    const morphineCreatedAt = new Date("2026-06-12T04:34:04.246Z");
    expect(formatMarShiftTimelineHourLabel(morphineCreatedAt, "America/Chicago")).toBe("11P");
    expect(formatMarShiftTimelineHourLabel(morphineCreatedAt, haitiTz)).toBe("12A");
  });
});
