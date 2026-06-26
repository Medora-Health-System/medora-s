import { describe, expect, it } from "vitest";
import {
  isMarShiftTimelineActiveInfusionSessionItem,
  isMarShiftTimelineItemRequiresInfusionStopClosure,
  isMarShiftTimelineStopInfusionActionEligible,
} from "./marShiftTimelineInfusionStop.js";

describe("marShiftTimelineInfusionStop", () => {
  it("1. started Keppra IVPB with STOP_INFUSION clinical action is stop-eligible", () => {
    const item = {
      doseStatus: "IN_PROGRESS",
      doseKind: "IVPB_SESSION",
      clinicalAction: "STOP_INFUSION",
      startedAt: "2026-06-11T14:10:00.000Z",
      stoppedAt: null,
      secondaryText: "INFUSING",
    };
    expect(isMarShiftTimelineStopInfusionActionEligible(item)).toBe(true);
    expect(isMarShiftTimelineItemRequiresInfusionStopClosure(item)).toBe(true);
  });

  it("2. stop remains eligible when scheduled date is historical (OVERDUE + active runtime)", () => {
    const item = {
      doseStatus: "OVERDUE",
      doseKind: "IVPB_SESSION",
      clinicalAction: "START_INFUSION",
      startedAt: "2026-06-10T08:00:00.000Z",
      stoppedAt: null,
      medicationInfusionRuntime: { status: "RUNNING", startedAt: "2026-06-10T08:00:00.000Z" },
    };
    expect(isMarShiftTimelineActiveInfusionSessionItem(item)).toBe(true);
    expect(isMarShiftTimelineStopInfusionActionEligible(item)).toBe(true);
  });

  it("3. stop remains eligible when dose is overdue but infusion is running", () => {
    const item = {
      doseStatus: "OVERDUE",
      doseKind: "IVPB_SESSION",
      clinicalAction: "START_INFUSION",
      startedAt: "2026-06-10T08:00:00.000Z",
      medicationInfusionRuntime: { status: "RUNNING" },
    };
    expect(isMarShiftTimelineStopInfusionActionEligible(item)).toBe(true);
  });

  it("4. completed infusion is not stop-eligible", () => {
    const item = {
      doseStatus: "COMPLETED",
      doseKind: "IVPB_SESSION",
      clinicalAction: "VIEW_ADMINISTRATION",
      startedAt: "2026-06-10T08:00:00.000Z",
      stoppedAt: "2026-06-10T09:00:00.000Z",
      medicationInfusionRuntime: { status: "COMPLETED", stoppedAt: "2026-06-10T09:00:00.000Z" },
    };
    expect(isMarShiftTimelineStopInfusionActionEligible(item)).toBe(false);
  });

  it("5. IN_PROGRESS without start time is not active session", () => {
    expect(
      isMarShiftTimelineActiveInfusionSessionItem({
        doseStatus: "IN_PROGRESS",
        doseKind: "IVPB_SESSION",
      })
    ).toBe(false);
  });
});
