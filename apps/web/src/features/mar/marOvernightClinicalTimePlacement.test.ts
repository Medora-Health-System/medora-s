import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineColumns,
  findMarShiftTimelineColumnKeyForInstant,
  resolveMarUniversalPlacementInstant,
  resolveStandardMarShiftTimelineWindow,
} from "@medora/shared";

describe("marOvernightClinicalTimePlacement (H9F.1)", () => {
  const ref = new Date("2026-06-11T22:00:00.000Z");
  const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", ref, "UTC");
  const columns = buildMarShiftTimelineColumns(startAt, endAt, "UTC");

  function expectOvernightColumn(iso: string, label: string) {
    const placement = resolveMarUniversalPlacementInstant({
      clinicalTime: iso,
      isTerminalOrCompleted: true,
    });
    const key = findMarShiftTimelineColumnKeyForInstant(placement, columns, "UTC");
    expect(columns.find((c) => c.key === key)?.label).toBe(label);
  }

  const overnightCases: Array<[string, string, string]> = [
    ["IVPB start", "2026-06-11T23:40:00.000Z", "11P"],
    ["IVPB stop", "2026-06-12T00:30:00.000Z", "12A"],
    ["Infusion start", "2026-06-11T23:50:00.000Z", "11P"],
    ["Infusion stop", "2026-06-12T00:10:00.000Z", "12A"],
    ["Bolus start", "2026-06-11T23:55:00.000Z", "11P"],
    ["Bolus complete", "2026-06-12T00:05:00.000Z", "12A"],
    ["PRN administered", "2026-06-11T23:45:00.000Z", "11P"],
    ["PRN administered", "2026-06-12T00:15:00.000Z", "12A"],
    ["Refused", "2026-06-11T23:55:00.000Z", "11P"],
    ["Refused", "2026-06-12T00:05:00.000Z", "12A"],
    ["Held", "2026-06-11T23:55:00.000Z", "11P"],
    ["Held", "2026-06-12T00:05:00.000Z", "12A"],
    ["Missed", "2026-06-11T23:55:00.000Z", "11P"],
    ["Missed", "2026-06-12T00:05:00.000Z", "12A"],
  ];

  it.each(overnightCases)("%s at %s → %s (7P–7A)", (_label, iso, column) => {
    expectOvernightColumn(iso, column);
  });
});
