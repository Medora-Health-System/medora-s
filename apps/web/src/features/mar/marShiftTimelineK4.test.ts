import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineStopPayload,
  isMarShiftTimelineActionEnabled,
  isMarShiftTimelineActionShowComingSoon,
  MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED,
} from "@/features/mar/marShiftTimelineActions";
import { marShiftTimelineItemStatusStyle } from "@/features/mar/marShiftTimelineDisplay";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import { buildMarShiftTimelineCellDisplay } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function sampleItem(overrides?: Partial<MarShiftTimelineCellItem>): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-1",
    orderItemId: "oi-1",
    medicationLabel: "Ceftriaxone IVPB",
    primaryText: "Rocephin",
    secondaryText: "INFUSING",
    tertiaryText: "EP 17:14 ▶",
    doseStatus: "IN_PROGRESS",
    doseKind: "IVPB_SESSION",
    route: "IVPB",
    frequencyCode: "Q12H",
    scheduledAt: "2026-06-11T17:00:00.000Z",
    dueWindowStartAt: "2026-06-11T16:00:00.000Z",
    dueWindowEndAt: "2026-06-11T18:00:00.000Z",
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "STOP_INFUSION",
    startedAt: "2026-06-11T17:14:00.000Z",
    startedByDisplay: "Elizabeth Posada",
    startedByInitials: "EP",
    stoppedAt: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: "EP 17:14 ▶",
    hover: {
      title: "Ceftriaxone IVPB",
      due: "17:00",
      dose: "1 g",
      route: "IVPB",
      witness: null,
      status: "In progress",
    },
    actions: ["START_INFUSION", "STOP_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

const enabledHandlers = {
  disabled: false,
  busy: false,
  onRequestAdminister: async () => undefined,
  onRequestStartInfusion: async () => true,
  onExecuteStopInfusion: async () => undefined,
  onExecuteRefuse: async () => undefined,
  onExecuteHold: async () => undefined,
};

describe("MAR unified action workflow (M1.8B.7K.4)", () => {
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const marTab = readFileSync(
    join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );
  const infusionApi = readFileSync(join(webSrcRoot, "lib/medicationInfusionApi.ts"), "utf8");

  it("MAR tab hides legacy section headings by default", () => {
    expect(marTab).toContain("MAR_TAB_SHOW_LEGACY_SECTIONS");
    expect(marTab).toContain("{MAR_TAB_SHOW_LEGACY_SECTIONS ? (");
    expect(marTab).toContain('{t("marTab.title")}');
    expect(marTab).toContain('{t("marTab.historyTitle")}');
  });

  it("IN_PROGRESS IVPB cell display uses INFUSING and initials/time", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Ceftriaxone",
      doseKind: "IVPB_SESSION",
      doseStatus: "IN_PROGRESS",
      route: "IVPB",
      frequencyCode: "Q12H",
      requiresWitness: false,
      enrichment: {
        startedAt: "2026-06-11T17:14:00.000Z",
        startedByDisplay: "EP",
        startedByInitials: "EP",
        stoppedAt: null,
        stoppedByDisplay: null,
        stoppedByInitials: null,
        administeredAt: null,
        administeredByDisplay: null,
        administeredByInitials: null,
        completionSummary: "EP 17:14 ▶",
      },
    });
    expect(display.secondaryText).toBe("INFUSING");
    expect(display.tertiaryText).toContain("EP");
    expect(timeline).toContain('data-testid="mar-shift-timeline-tertiary-text"');
  });

  it("COMPLETED IVPB cell display uses DONE and completion summary", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Ceftriaxone",
      doseKind: "IVPB_SESSION",
      doseStatus: "COMPLETED",
      route: "IVPB",
      frequencyCode: "Q12H",
      requiresWitness: false,
      enrichment: {
        startedAt: "2026-06-11T17:14:00.000Z",
        startedByDisplay: "EP",
        startedByInitials: "EP",
        stoppedAt: "2026-06-11T17:42:00.000Z",
        stoppedByDisplay: "EP",
        stoppedByInitials: "EP",
        administeredAt: null,
        administeredByDisplay: null,
        administeredByInitials: null,
        completionSummary: "EP 17:14–17:42",
      },
    });
    expect(display.secondaryText).toBe("DONE");
    expect(display.tertiaryText).toBe("EP 17:14–17:42");
  });

  it("completed cell uses gray read-only style", () => {
    const style = marShiftTimelineItemStatusStyle("COMPLETED", true);
    expect(style.backgroundColor).toBe("#E5E7EB");
    expect(style.color).toBe("#374151");
  });

  it("DUE IVPB drawer enables Start infusion action", () => {
    const dueItem = sampleItem({
      doseStatus: "DUE",
      clinicalAction: "START_INFUSION",
      secondaryText: "START",
      tertiaryText: "",
      startedAt: null,
      startedByInitials: null,
      actions: ["ADMINISTER", "START_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    });
    expect(isMarShiftTimelineActionEnabled("START_INFUSION", dueItem, enabledHandlers)).toBe(true);
    expect(drawer).toContain("onRequestStartInfusion");
    expect(drawer).toContain('data-enabled={enabled ? "true" : "false"}');
  });

  it("IN_PROGRESS IVPB drawer enables Stop infusion action", () => {
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", sampleItem(), enabledHandlers)).toBe(true);
    expect(drawer).toContain("onExecuteStopInfusion");
    expect(drawer).toContain('testId="mar-shift-timeline-drawer-stop-time"');
  });

  it("COMPLETED drawer is read-only without enabled mutation buttons", () => {
    const completed = sampleItem({
      doseStatus: "COMPLETED",
      clinicalAction: "VIEW_ADMINISTRATION",
      readOnly: true,
      secondaryText: "DONE",
      actions: ["VIEW_ORDER"],
    });
    expect(isMarShiftTimelineActionEnabled("STOP_INFUSION", completed, enabledHandlers)).toBe(false);
    expect(isMarShiftTimelineActionEnabled("START_INFUSION", completed, enabledHandlers)).toBe(false);
    expect(drawer).toContain('data-read-only={readOnly ? "true" : "false"}');
    expect(drawer).toContain("{!readOnly ? (");
  });

  it("start infusion uses existing medicationInfusionApi client", () => {
    expect(marTab).toContain("startMedicationInfusion");
    expect(marTab).toContain("medicationDoseInstanceId");
    expect(infusionApi).toContain("/infusion/start");
    expect(infusionApi).toContain("medicationDoseInstanceId");
  });

  it("stop infusion uses existing medicationInfusionApi client with stoppedAt", () => {
    expect(marTab).toContain("stopMedicationInfusion");
    expect(infusionApi).toContain("stoppedAt");
    expect(infusionApi).toContain("/infusion/stop");
    const payload = buildMarShiftTimelineStopPayload({ stopTimeLocal: "2026-06-11T17:42" });
    expect(payload.stoppedAt).toBeTruthy();
  });

  it("start effective time is sent when API supports it (K.8)", () => {
    expect(MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED).toBe(true);
    expect(drawer).toContain("buildMarShiftTimelineStartPayload");
    expect(infusionApi).toContain("startedAt");
  });

  it("timeline refresh is registered and called after successful actions", () => {
    expect(timeline).toContain("onRegisterRefresh");
    expect(timeline).toContain("onActionSuccess");
    expect(timeline).toContain("loadTimeline");
    expect(marTab).toContain("timelineRefreshRef");
  });

  it("non-IVPB Administer is enabled when handlers are wired (K.9)", () => {
    const administerItem = sampleItem({
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "DUE",
      clinicalAction: "ADMINISTER",
      route: "PO",
      actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
    });
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", administerItem, enabledHandlers)).toBe(true);
    expect(isMarShiftTimelineActionShowComingSoon("ADMINISTER", administerItem)).toBe(false);
  });
});
