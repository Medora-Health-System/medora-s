import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultMarShiftTimelineStartTimeValue,
  defaultMarShiftTimelineStopTimeValue,
  isMarShiftTimelineDrawerReadOnly,
  isMarShiftTimelineMutationAction,
  marShiftTimelineItemStatusStyle,
  marShiftTimelinePrimaryDrawerAction,
} from "@/features/mar/marShiftTimelineDisplay";
import { MAR_TAB_SHOW_LEGACY_SECTIONS } from "@/features/mar/marTabUnifiedTimeline";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function sampleItem(overrides?: Partial<MarShiftTimelineCellItem>): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-1",
    orderItemId: "oi-1",
    medicationLabel: "Ceftriaxone IVPB",
    primaryText: "Rocephin",
    secondaryText: "IVPB",
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

describe("MAR unified timeline shell (M1.8B.7K.3)", () => {
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

  it("MAR tab renders FacilityMarShiftTimeline as primary UI", () => {
    expect(marTab).toContain("<FacilityMarShiftTimeline");
    expect(marTab).toContain("MAR_TAB_SHOW_LEGACY_SECTIONS");
    expect(MAR_TAB_SHOW_LEGACY_SECTIONS).toBe(false);
  });

  it("MAR tab hides legacy pass queue, MAR table, and history headings by default", () => {
    expect(marTab).toContain("{MAR_TAB_SHOW_LEGACY_SECTIONS ? (");
    expect(marTab).toContain('<MedicationPassQueuePanel');
    expect(marTab).toContain('{t("marTab.title")}');
    expect(marTab).toContain('{t("marTab.historyTitle")}');
    const legacyGateIdx = marTab.indexOf("{MAR_TAB_SHOW_LEGACY_SECTIONS ? (");
    const passQueueIdx = marTab.indexOf("<MedicationPassQueuePanel");
    const marTitleIdx = marTab.indexOf('{t("marTab.title")}');
    const historyIdx = marTab.indexOf('{t("marTab.historyTitle")}');
    expect(legacyGateIdx).toBeLessThan(passQueueIdx);
    expect(legacyGateIdx).toBeLessThan(marTitleIdx);
    expect(legacyGateIdx).toBeLessThan(historyIdx);
  });

  it("header shows facility-name MAR title from API", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-title"');
    expect(timeline).toContain("data?.title");
  });

  it("header shows current date/time refreshed every 60 seconds", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-current-time"');
    expect(timeline).toContain("HEADER_CLOCK_REFRESH_MS");
    expect(timeline).toContain("60_000");
    expect(timeline).toContain('t("marShiftTimeline.currentTimeLine")');
    expect(timeline).toContain("formatMarShiftTimelineHeaderClock");
  });

  it("timeline cell shows in-progress IVPB tertiary started initials/time", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-tertiary-text"');
    expect(timeline).toContain("item.tertiaryText");
    const item = sampleItem();
    expect(item.tertiaryText).toContain("EP");
    expect(item.tertiaryText).toContain("▶");
  });

  it("completed cell renders gray inactive style", () => {
    const style = marShiftTimelineItemStatusStyle("COMPLETED", true);
    expect(style.backgroundColor).toBe("#E5E7EB");
    expect(style.color).toBe("#374151");
    expect(timeline).toContain('data-read-only={readOnly ? "true" : "false"}');
  });

  it("completed drawer is read-only without mutation actions", () => {
    const completed = sampleItem({
      doseStatus: "COMPLETED",
      clinicalAction: "VIEW_ADMINISTRATION",
      readOnly: true,
      secondaryText: "DONE",
      tertiaryText: "EP 17:14–17:42",
      actions: ["VIEW_ORDER"],
    });
    expect(isMarShiftTimelineDrawerReadOnly(completed)).toBe(true);
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-readonly-notice"');
    expect(drawer).toContain("{!readOnly ? (");
  });

  it("IN_PROGRESS IVPB drawer highlights Stop infusion as primary action", () => {
    const item = sampleItem();
    expect(marShiftTimelinePrimaryDrawerAction(item)).toBe("STOP_INFUSION");
    expect(drawer).toContain('data-testid={`mar-shift-timeline-action-${action}`}');
    expect(drawer).toContain('data-primary-action={isPrimary ? "true" : "false"}');
    expect(drawer).toContain("STOP_INFUSION");
    expect(drawer).toContain("onExecuteStopInfusion");
  });

  it("drawer shows editable stop time field for IN_PROGRESS IVPB", () => {
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-stop-time"');
    expect(drawer).toContain('type="datetime-local"');
    expect(defaultMarShiftTimelineStopTimeValue(sampleItem())).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("drawer shows editable start time field for DUE IVPB", () => {
    const dueItem = sampleItem({
      doseStatus: "DUE",
      clinicalAction: "START_INFUSION",
      tertiaryText: "",
      startedAt: null,
      startedByInitials: null,
      actions: ["ADMINISTER", "START_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    });
    expect(marShiftTimelinePrimaryDrawerAction(dueItem)).toBe("START_INFUSION");
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-start-time"');
    expect(defaultMarShiftTimelineStartTimeValue(dueItem)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("drawer delegates mutations to actionHandlers rather than calling APIs directly", () => {
    expect(drawer).not.toContain("apiFetch");
    expect(drawer).not.toContain("startMedicationInfusion");
    expect(drawer).not.toContain("stopMedicationInfusion");
    expect(drawer).toContain("actionHandlers");
    expect(drawer).toContain("onRequestStartInfusion");
    expect(drawer).toContain("onExecuteStopInfusion");
  });
});
