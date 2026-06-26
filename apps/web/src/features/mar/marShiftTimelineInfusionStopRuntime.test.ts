/**
 * MEDUI.MAR.INFUSION_STOP_ACTION_SOURCE_OF_TRUTH_AUDIT_AND_FIX.1
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isMarShiftTimelineActionEnabled,
  type MarShiftTimelineActionHandlers,
} from "./marShiftTimelineActions";
import {
  isMarShiftTimelineDrawerReadOnly,
  marShiftTimelinePrimaryDrawerAction,
} from "./marShiftTimelineDisplay";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function sampleInfusingItem(
  overrides: Partial<MarShiftTimelineCellItem> = {}
): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-1",
    orderItemId: "oi-1",
    medicationLabel: "Keppra IVPB",
    primaryText: "Keppra IVPB",
    secondaryText: "INFUSING",
    tertiaryText: "",
    doseStatus: "IN_PROGRESS",
    readOnly: false,
    clinicalAction: "STOP_INFUSION",
    startedAt: "2026-06-10T08:00:00.000Z",
    stoppedAt: null,
    scheduledAt: "2026-06-10T07:00:00.000Z",
    dueWindowStartAt: "2026-06-10T07:00:00.000Z",
    dueWindowEndAt: "2026-06-10T08:00:00.000Z",
    actions: ["STOP_INFUSION", "VIEW_ORDER"],
    hover: {
      title: "Keppra",
      status: "In progress",
      due: "",
      dose: "",
      route: "IVPB",
      witness: "",
    },
    route: "IVPB",
    doseKind: "IVPB_SESSION",
    frequencyCode: "ONCE",
    requiresWitness: false,
    startedByDisplay: null,
    startedByInitials: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: null,
    medicationInfusionRuntime: {
      status: "RUNNING",
      startedAt: "2026-06-10T08:00:00.000Z",
      stoppedAt: null,
      currentRate: null,
      concentration: null,
      route: "IVPB",
      pumpChannel: null,
      currentBag: null,
      remainingVolume: null,
      startedByDisplay: "RN A",
      verifiedByDisplay: null,
      paused: false,
      highestRate: null,
      finalRate: null,
      bagChangeCount: 0,
      pumpChangeCount: 0,
      totalRuntimeMinutes: null,
      stopReason: null,
      timelineRows: [],
    },
    ...overrides,
  };
}

const enabledHandlers: MarShiftTimelineActionHandlers = {
  disabled: false,
  busy: false,
  onRequestAdminister: async () => {},
  onRequestStartInfusion: async () => true,
  onExecuteStopInfusion: async () => {},
  onExecuteRefuse: async () => {},
  onExecuteHold: async () => {},
};

describe("infusion stop MAR runtime", () => {
  it("1. started Keppra IVPB shows Stop Infusion enabled", () => {
    const item = sampleInfusingItem();
    expect(marShiftTimelinePrimaryDrawerAction(item)).toBe("STOP_INFUSION");
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", item, enabledHandlers)).toBe(true);
    expect(isMarShiftTimelineDrawerReadOnly(item)).toBe(false);
  });

  it("2. stop enabled on historical review when active infusion runtime exists", () => {
    const item = sampleInfusingItem();
    const historicalHandlers: MarShiftTimelineActionHandlers = {
      ...enabledHandlers,
      historicalReviewMode: true,
    };
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", item, historicalHandlers)).toBe(true);
    expect(isMarShiftTimelineActionEnabled("START_INFUSION", item, historicalHandlers)).toBe(false);
    expect(isMarShiftTimelineActionEnabled("REFUSE", item, historicalHandlers)).toBe(false);
  });

  it("3. stop enabled when dose overdue but infusion runtime is running", () => {
    const item = sampleInfusingItem({
      doseStatus: "OVERDUE",
      clinicalAction: "START_INFUSION",
    });
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", item, enabledHandlers)).toBe(true);
    expect(isMarShiftTimelineDrawerReadOnly(item)).toBe(false);
  });

  it("4. historical timeline passes handlers with historicalReviewMode (not null)", () => {
    const timeline = readWebSource("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain("historicalReviewMode: true");
    expect(timeline).not.toContain("historicalReadOnly ? null : actionHandlers");
  });

  it("5. drawer exposes stop time field for active infusion session", () => {
    const drawer = readWebSource("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toContain("isMarShiftTimelineStopInfusionActionEligible");
    expect(drawer).toContain('testId="mar-shift-timeline-drawer-stop-time"');
  });

  it("6. completed infusion disables stop", () => {
    const item = sampleInfusingItem({
      doseStatus: "COMPLETED",
      clinicalAction: "VIEW_ADMINISTRATION",
      readOnly: true,
      stoppedAt: "2026-06-10T09:00:00.000Z",
      medicationInfusionRuntime: {
        ...sampleInfusingItem().medicationInfusionRuntime!,
        status: "COMPLETED",
        stoppedAt: "2026-06-10T09:00:00.000Z",
      },
      actions: ["VIEW_ORDER"],
    });
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", item, enabledHandlers)).toBe(false);
  });

  it("7. null handlers still disables stop (no handler wiring)", () => {
    const item = sampleInfusingItem();
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", item, null)).toBe(false);
  });
});
