import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineColumns,
  findMarShiftTimelineColumnKeyForInstant,
  resolveMarShiftTimelineDosePlacementInstant,
  resolveStandardMarShiftTimelineWindow,
} from "./marShiftTimeline.js";

describe("marBolusTimelinePlacement (H9E)", () => {
  const ref = new Date("2026-06-03T12:00:00.000Z");
  const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", ref, "UTC");
  const columns = buildMarShiftTimelineColumns(startAt, endAt, "UTC");

  it("7 — STOP event appears in stop-time hour (not scheduled hour)", () => {
    const scheduledAt = new Date("2026-06-03T14:00:00.000Z");
    const stoppedAt = "2026-06-03T11:00:00.000Z";
    const placement = resolveMarShiftTimelineDosePlacementInstant({
      doseStatus: "COMPLETED",
      doseKind: "IVPB_SESSION",
      scheduledAt,
      enrichment: { startedAt: "2026-06-03T09:00:00.000Z", stoppedAt, administeredAt: null },
    });
    expect(placement.toISOString()).toBe(stoppedAt);
    const columnKey = findMarShiftTimelineColumnKeyForInstant(placement, columns, "UTC");
    expect(columnKey).toBe(columns.find((c) => c.label === "11A")?.key ?? null);
  });

  it("8 — START / IN_PROGRESS event appears in start-time hour", () => {
    const scheduledAt = new Date("2026-06-03T14:00:00.000Z");
    const startedAt = "2026-06-03T09:00:00.000Z";
    const placement = resolveMarShiftTimelineDosePlacementInstant({
      doseStatus: "IN_PROGRESS",
      doseKind: "IVPB_SESSION",
      scheduledAt,
      enrichment: { startedAt, stoppedAt: null, administeredAt: null },
    });
    expect(placement.toISOString()).toBe(startedAt);
    const columnKey = findMarShiftTimelineColumnKeyForInstant(placement, columns, "UTC");
    expect(columnKey).toBe(columns.find((c) => c.label === "09A")?.key ?? null);
  });

  it("completed fluid bolus uses fluidCompletedAt for placement", () => {
    const scheduledAt = new Date("2026-06-03T14:00:00.000Z");
    const completedAt = "2026-06-03T10:30:00.000Z";
    const placement = resolveMarShiftTimelineDosePlacementInstant({
      doseStatus: "COMPLETED",
      doseKind: "FIXED_ADMINISTRATION",
      scheduledAt,
      fluid: {
        isFluidBolus: true,
        fluidBolusStatus: "COMPLETED",
        fluidStartedAt: "2026-06-03T09:00:00.000Z",
        fluidCompletedAt: completedAt,
      },
    });
    expect(placement.toISOString()).toBe(completedAt);
  });

  it("falls back to scheduledAt when no clinical stop is known", () => {
    const scheduledAt = new Date("2026-06-03T14:00:00.000Z");
    const placement = resolveMarShiftTimelineDosePlacementInstant({
      doseStatus: "COMPLETED",
      doseKind: "IVPB_SESSION",
      scheduledAt,
      enrichment: { startedAt: null, stoppedAt: null, administeredAt: null },
    });
    expect(placement.toISOString()).toBe(scheduledAt.toISOString());
  });
});
