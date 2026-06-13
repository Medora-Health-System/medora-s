import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isMarShiftTimelineItemActionable,
  isMarShiftTimelineItemReadOnly,
  resolveMarShiftTimelineStatusColorKey,
} from "@medora/shared";
import {
  isMarShiftTimelineDrawerReadOnly,
  isMarShiftTimelineDrawerScheduledActionable,
  marShiftTimelineItemStatusStyle,
} from "@/features/mar/marShiftTimelineDisplay";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function plannedItem(overrides: Partial<MarShiftTimelineCellItem> = {}): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-1",
    orderItemId: "order-1",
    medicationLabel: "Acetaminophen",
    primaryText: "Acetaminophen",
    secondaryText: "650 mg PO",
    tertiaryText: "",
    doseStatus: "PLANNED",
    doseKind: "FIXED_ADMINISTRATION",
    route: "PO",
    frequencyCode: "Q6H",
    scheduledAt: "2026-06-12T03:00:00.000Z",
    dueWindowStartAt: "2026-06-12T03:00:00.000Z",
    dueWindowEndAt: "2026-06-12T04:00:00.000Z",
    requiresWitness: false,
    readOnly: true,
    clinicalAction: "VIEW_UPCOMING",
    startedAt: null,
    startedByDisplay: null,
    startedByInitials: null,
    stoppedAt: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: null,
    isPrnBand: true,
    hover: {
      title: "Acetaminophen",
      due: "03:00",
      dose: null,
      route: "PO",
      witness: null,
      status: "Planned",
    },
    actions: ["ADMINISTER", "REFUSE", "HOLD", "MARK_MISSED", "VIEW_ORDER"],
    ...overrides,
  };
}

describe("marShiftTimelineActionability (K.10B.11B)", () => {
  it("shared isMarShiftTimelineItemReadOnly returns false for VIEW_UPCOMING PLANNED", () => {
    expect(isMarShiftTimelineItemReadOnly("VIEW_UPCOMING", "PLANNED")).toBe(false);
  });

  it("drawer does not show completed read-only banner for PLANNED", () => {
    const item = plannedItem();
    expect(isMarShiftTimelineDrawerReadOnly(item)).toBe(false);
    expect(isMarShiftTimelineDrawerScheduledActionable(item)).toBe(true);

    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toContain("isMarShiftTimelineDrawerScheduledActionable");
    expect(drawer).toContain("mar-shift-timeline-drawer-scheduled-notice");
    expect(drawer).toContain("scheduledActionNotice");
  });

  it("drawer treats VIEW_UPCOMING as actionable", () => {
    const item = plannedItem({ clinicalAction: "VIEW_UPCOMING", doseStatus: "PLANNED" });
    expect(isMarShiftTimelineItemActionable(item)).toBe(true);
    expect(isMarShiftTimelineDrawerReadOnly(item)).toBe(false);
  });

  it("planned scheduled cell is not administered gray", () => {
    const colorKey = resolveMarShiftTimelineStatusColorKey({
      doseStatus: "PLANNED",
      readOnly: false,
      isPrnBand: false,
      secondaryText: "Scheduled",
    });
    expect(colorKey).toBe("active");

    const style = marShiftTimelineItemStatusStyle("PLANNED", false, false);
    expect(style.backgroundColor).not.toBe("#E5E7EB");
  });

  it("future PRN projection remains active yellow in PRN band", () => {
    const colorKey = resolveMarShiftTimelineStatusColorKey({
      doseStatus: "DUE",
      readOnly: false,
      isPrnBand: true,
      secondaryText: "PRN Q6H",
    });
    expect(colorKey).toBe("prnRow");

    const style = marShiftTimelineItemStatusStyle("DUE", false, true);
    expect(style.backgroundColor).toBe("#FFFBE6");
  });

  it("completed PRN remains read-only gray", () => {
    const item = plannedItem({
      doseStatus: "COMPLETED",
      clinicalAction: "VIEW_ADMINISTRATION",
      readOnly: true,
      secondaryText: "DONE",
      administeredAt: "2026-06-11T22:00:00.000Z",
    });
    expect(isMarShiftTimelineDrawerReadOnly(item)).toBe(true);
    expect(isMarShiftTimelineDrawerScheduledActionable(item)).toBe(false);

    const style = marShiftTimelineItemStatusStyle("COMPLETED", true, true, "DONE");
    expect(style.backgroundColor).toBe("#E5E7EB");
    expect(style.borderColor).toBe("#9CA3AF");
  });

  it("timeline uses isMarShiftTimelineItemActionable for cell read-only styling", () => {
    const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain("isMarShiftTimelineItemActionable");
  });
});
