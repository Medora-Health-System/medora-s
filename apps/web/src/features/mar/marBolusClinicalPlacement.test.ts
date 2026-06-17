import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarBolusTimelinePlacement,
  buildMarShiftTimelineColumns,
  findMarShiftTimelineColumnKeyForInstant,
  resolveMarClinicalDoseTimelinePlacementInstant,
  resolveStandardMarShiftTimelineWindow,
} from "@medora/shared";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readRepo(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("marBolusClinicalPlacement (H9K)", () => {
  const scheduledAt = new Date("2026-06-03T14:00:00.000Z");

  it("bolus start placed at clinical start time", () => {
    expect(
      buildMarBolusTimelinePlacement({
        bolusStatus: "RUNNING",
        doseStatus: "IN_PROGRESS",
        scheduledAt,
        clinicalStartAt: "2026-06-03T09:00:00.000Z",
      }).toISOString()
    ).toBe("2026-06-03T09:00:00.000Z");
  });

  it("bolus complete placed at clinical complete time", () => {
    expect(
      buildMarBolusTimelinePlacement({
        bolusStatus: "COMPLETED",
        doseStatus: "COMPLETED",
        scheduledAt,
        clinicalStartAt: "2026-06-03T09:00:00.000Z",
        clinicalCompleteAt: "2026-06-03T09:30:00.000Z",
      }).toISOString()
    ).toBe("2026-06-03T09:30:00.000Z");
  });

  it("production NS bolus — 09:00 clinical start not 14:00 scheduled column", () => {
    const ref = new Date("2026-06-03T12:00:00.000Z");
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", ref, "UTC");
    const columns = buildMarShiftTimelineColumns(startAt, endAt, "UTC");
    const placement = resolveMarClinicalDoseTimelinePlacementInstant({
      doseStatus: "IN_PROGRESS",
      doseKind: "FIXED_ADMINISTRATION",
      scheduledAt,
      fluid: {
        isFluidBolus: true,
        fluidBolusStatus: "RUNNING",
        fluidStartedAt: "2026-06-03T09:00:00.000Z",
      },
    });
    expect(findMarShiftTimelineColumnKeyForInstant(placement, columns, "UTC")).toBe(
      columns.find((c) => c.label === "09A")?.key ?? null
    );
  });

  it("order-item fallback uses clinical placement for column key", () => {
    const fallback = readRepo("apps/api/src/medication-dose/mar-shift-timeline-order-item-fallback.util.ts");
    expect(fallback).toContain("resolveMarClinicalDoseTimelinePlacementInstant");
    expect(fallback).toContain("scheduledAt: cellPlacementInstant");
  });
});
