import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { shouldRetainPrnTimelineItem } from "@medora/shared";
import { marShiftTimelineItemStatusStyle } from "@/features/mar/marShiftTimelineDisplay";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("marShiftTimelinePrnPermanence (K.10B.11)", () => {
  it("shared shouldRetainPrnTimelineItem keeps terminal PRN visible", () => {
    expect(
      shouldRetainPrnTimelineItem({
        isPrnBand: true,
        doseStatus: "COMPLETED",
        includeCompleted: false,
      })
    ).toBe(true);
  });

  it("administered PRN maps to administered gray inside PRN band", () => {
    const style = marShiftTimelineItemStatusStyle("COMPLETED", true, true, "500 mg PO");
    expect(style.backgroundColor).toBe("#E5E7EB");
    expect(style.borderColor).toBe("#9CA3AF");
  });

  it("PRN row shell remains yellow while cells gray out", () => {
    const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain("marShiftTimelinePrnRowStyle");
    expect(timeline).toContain('row.rowKind === "PRN"');
    const administeredCell = marShiftTimelineItemStatusStyle("COMPLETED", true, true);
    expect(administeredCell.backgroundColor).not.toBe("#FFFBE6");
  });

  it("drawer shows PRN yes and read-only for completed terminal PRN", () => {
    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toContain('"mar-shift-timeline-drawer-prn-yes"');
    expect(drawer).toContain("drawer.administeredAt");
    expect(drawer).toContain("isMarShiftTimelineDrawerReadOnly");
    expect(drawer).toContain('data-read-only={readOnly ? "true" : "false"}');
  });
});
