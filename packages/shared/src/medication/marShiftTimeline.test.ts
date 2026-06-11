import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineCellDisplay,
  buildMarShiftTimelineColumns,
  buildMarShiftTimelineTitle,
  formatMarShiftTimelineHourLabel,
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineColumnKey,
  resolveStandardMarShiftTimelineWindow,
} from "./marShiftTimeline.js";

describe("marShiftTimeline (M1.8B.7K.1)", () => {
  it("buildMarShiftTimelineTitle uses facility name, not Medora MAR", () => {
    expect(buildMarShiftTimelineTitle("St. Mary Hospital")).toBe(
      "St. Mary Hospital MAR SHIFT TIMELINE"
    );
    expect(buildMarShiftTimelineTitle("Medora Demo Facility")).toBe(
      "Medora Demo Facility MAR SHIFT TIMELINE"
    );
  });

  it("7A_7P creates hour columns 07A through 07P", () => {
    const ref = new Date("2026-06-11T10:00:00.000Z");
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", ref);
    const columns = buildMarShiftTimelineColumns(startAt, endAt);
    expect(columns.map((c) => c.label)).toEqual([
      "07A",
      "08A",
      "09A",
      "10A",
      "11A",
      "12P",
      "01P",
      "02P",
      "03P",
      "04P",
      "05P",
      "06P",
      "07P",
    ]);
  });

  it("7P_7A creates overnight columns 07P through 07A", () => {
    const ref = new Date("2026-06-11T22:00:00.000Z");
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", ref);
    const columns = buildMarShiftTimelineColumns(startAt, endAt);
    expect(columns.map((c) => c.label)).toEqual([
      "07P",
      "08P",
      "09P",
      "10P",
      "11P",
      "12A",
      "01A",
      "02A",
      "03A",
      "04A",
      "05A",
      "06A",
      "07A",
    ]);
  });

  it("formatMarShiftTimelineHourLabel handles noon and midnight", () => {
    expect(formatMarShiftTimelineHourLabel(new Date("2026-06-11T12:00:00.000Z"))).toBe("12P");
    expect(formatMarShiftTimelineHourLabel(new Date("2026-06-11T00:00:00.000Z"))).toBe("12A");
    expect(formatMarShiftTimelineHourLabel(new Date("2026-06-11T13:00:00.000Z"))).toBe("01P");
  });

  it("resolveMarShiftTimelineClinicalAction maps FIXED_ADMINISTRATION DUE to ADMINISTER", () => {
    expect(resolveMarShiftTimelineClinicalAction("FIXED_ADMINISTRATION", "DUE")).toBe("ADMINISTER");
  });

  it("resolveMarShiftTimelineClinicalAction maps IVPB_SESSION DUE to START_INFUSION", () => {
    expect(resolveMarShiftTimelineClinicalAction("IVPB_SESSION", "DUE")).toBe("START_INFUSION");
    expect(resolveMarShiftTimelineClinicalAction("IVPB_SESSION", "IN_PROGRESS")).toBe(
      "STOP_INFUSION"
    );
  });

  it("buildMarShiftTimelineCellDisplay uses Witness secondary for witness-required meds", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Potassium Chloride",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      route: "IVPB",
      frequencyCode: "Q12H",
      requiresWitness: true,
    });
    expect(display.primaryText).toContain("KCl");
    expect(display.secondaryText).toBe("Witness");
  });

  it("resolveMarShiftTimelineColumnKey prefers scheduledAt hour", () => {
    const ref = new Date("2026-06-11T10:00:00.000Z");
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", ref);
    const columns = buildMarShiftTimelineColumns(startAt, endAt);
    const key = resolveMarShiftTimelineColumnKey({
      scheduledAt: new Date("2026-06-11T08:30:00.000Z"),
      dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
      columns,
    });
    expect(columns.find((c) => c.key === key)?.label).toBe("08A");
  });
});
