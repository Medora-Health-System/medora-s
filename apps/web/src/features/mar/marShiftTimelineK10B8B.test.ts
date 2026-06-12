import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAR_SHIFT_TIMELINE_STATUS_COLORS } from "@medora/shared";
import { marShiftTimelineItemStatusStyle } from "@/features/mar/marShiftTimelineDisplay";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("marShiftTimelineK10B8B — PRN dedup + clinical status colors", () => {
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );
  const service = readFileSync(
    join(webSrcRoot, "../../api/src/medication-dose/mar-shift-timeline.service.ts"),
    "utf8"
  );

  it("API suppresses PRN fallback when visible dose-instance PRN cell exists", () => {
    expect(service).toContain("collectVisiblePrnOrderItemIds");
    expect(service).toContain("visiblePrnOrderItemIds");
    expect(service).toContain("marShiftTimelinePrnRowHasOrderItem");
  });

  it("DONE color is gray", () => {
    const style = marShiftTimelineItemStatusStyle("COMPLETED", true, false, "DONE");
    expect(style.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.administered.backgroundColor);
    expect(style.color).toBe("#374151");
  });

  it("REFUSED color is gray", () => {
    const style = marShiftTimelineItemStatusStyle("COMPLETED", true, false, "REFUSED");
    expect(style.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.refused.backgroundColor);
    expect(style.color).toBe("#4B5563");
  });

  it("HELD color is amber", () => {
    const style = marShiftTimelineItemStatusStyle("HELD", true, false, "HELD");
    expect(style.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.held.backgroundColor);
    expect(style.color).toBe("#92400E");
  });

  it("ACTIVE/DUE color is green", () => {
    const style = marShiftTimelineItemStatusStyle("DUE", false, false, "PO");
    expect(style.backgroundColor).toBe(MAR_SHIFT_TIMELINE_STATUS_COLORS.active.backgroundColor);
    expect(style.color).toBe("#166534");
  });

  it("PRN band cell styling remains yellow", () => {
    const style = marShiftTimelineItemStatusStyle("DUE", false, true, "PO");
    expect(style.backgroundColor).toBe("#FFFBE6");
  });

  it("drawer status badge uses shared timeline status colors", () => {
    expect(drawer).toContain("mar-shift-timeline-drawer-status-badge");
    expect(drawer).toContain("marShiftTimelineItemStatusStyle");
    expect(timeline).toContain("item.secondaryText");
  });
});
