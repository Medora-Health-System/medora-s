import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineCellDisplay,
  isMarShiftTimelineItemReadOnly,
} from "@medora/shared";
import {
  isMarShiftTimelineDrawerReadOnly,
  marShiftTimelineDrawerPerformerValue,
  marShiftTimelineItemStatusStyle,
} from "@/features/mar/marShiftTimelineDisplay";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function completedIvpbItem(
  overrides?: Partial<MarShiftTimelineCellItem>
): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-1",
    orderItemId: "oi-1",
    medicationLabel: "Ceftriaxone IVPB",
    primaryText: "Rocephin",
    secondaryText: "DONE",
    tertiaryText: "EP 17:14–EP 17:42",
    doseStatus: "COMPLETED",
    doseKind: "IVPB_SESSION",
    route: "IVPB",
    frequencyCode: "Q12H",
    scheduledAt: "2026-06-11T17:00:00.000Z",
    dueWindowStartAt: "2026-06-11T16:00:00.000Z",
    dueWindowEndAt: "2026-06-11T18:00:00.000Z",
    requiresWitness: false,
    readOnly: true,
    clinicalAction: "VIEW_ADMINISTRATION",
    startedAt: "2026-06-11T17:14:00.000Z",
    startedByDisplay: "Elizabeth Posada RN",
    startedByInitials: "EP",
    stoppedAt: "2026-06-11T17:42:00.000Z",
    stoppedByDisplay: "Elizabeth Posada RN",
    stoppedByInitials: "EP",
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: "EP 17:14–EP 17:42",
    hover: {
      title: "Ceftriaxone IVPB",
      due: "17:00",
      dose: "1 g",
      route: "IVPB",
      witness: null,
      status: "Completed",
    },
    actions: ["VIEW_ORDER"],
    ...overrides,
  };
}

describe("MAR timeline display (M1.8B.7K.5)", () => {
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );

  it("IN_PROGRESS IVPB cell displays INFUSING and initials/time", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Rocephin",
      doseKind: "IVPB_SESSION",
      doseStatus: "IN_PROGRESS",
      route: "IVPB",
      frequencyCode: "Q12H",
      requiresWitness: false,
      enrichment: {
        startedAt: "2026-06-11T17:14:00.000Z",
        startedByDisplay: "Elizabeth Posada RN",
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
    expect(display.tertiaryText).toContain("▶");
  });

  it("COMPLETED IVPB cell displays DONE and start-stop initials/time", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Rocephin",
      doseKind: "IVPB_SESSION",
      doseStatus: "COMPLETED",
      route: "IVPB",
      frequencyCode: "Q12H",
      requiresWitness: false,
      enrichment: {
        startedAt: "2026-06-11T17:14:00.000Z",
        startedByDisplay: "Elizabeth Posada RN",
        startedByInitials: "EP",
        stoppedAt: "2026-06-11T17:42:00.000Z",
        stoppedByDisplay: "Elizabeth Posada RN",
        stoppedByInitials: "EP",
        administeredAt: null,
        administeredByDisplay: null,
        administeredByInitials: null,
        completionSummary: "EP 17:14–EP 17:42",
      },
    });
    expect(display.secondaryText).toBe("DONE");
    expect(display.tertiaryText).toBe("EP 17:14–EP 17:42");
  });

  it("completed cell is gray/read-only", () => {
    const item = completedIvpbItem();
    expect(item.readOnly).toBe(true);
    expect(isMarShiftTimelineDrawerReadOnly(item)).toBe(true);
    expect(isMarShiftTimelineItemReadOnly("VIEW_ADMINISTRATION")).toBe(true);
    const style = marShiftTimelineItemStatusStyle(item.doseStatus, item.readOnly);
    expect(style.color).toBe("#374151");
    expect(timeline).toContain("marShiftTimelineItemStatusStyle");
  });

  it("drawer shows Started by / Started at / Stopped by / Stopped at fields", () => {
    expect(drawer).toContain('t("marShiftTimeline.drawer.startedBy")');
    expect(drawer).toContain('t("marShiftTimeline.drawer.startedAt")');
    expect(drawer).toContain('t("marShiftTimeline.drawer.stoppedBy")');
    expect(drawer).toContain('t("marShiftTimeline.drawer.stoppedAt")');
    expect(drawer).toContain("mar-shift-timeline-drawer-started-by");
    expect(drawer).toContain("mar-shift-timeline-drawer-stopped-at");
  });

  it("drawer performer fallback uses initials when display missing", () => {
    expect(marShiftTimelineDrawerPerformerValue(null, "EP")).toBe("EP");
    expect(marShiftTimelineDrawerPerformerValue("Elizabeth Posada RN", "EP")).toBe(
      "Elizabeth Posada RN"
    );
  });

  it("completed drawer has no mutation action section when read-only", () => {
    expect(drawer).toContain("{!readOnly ? (");
    expect(drawer).toContain('data-read-only={readOnly ? "true" : "false"}');
  });
});
