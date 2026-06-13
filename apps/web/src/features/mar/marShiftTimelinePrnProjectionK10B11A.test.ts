import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPrnTimelineAvailabilityProjections } from "@medora/shared";
import { marShiftTimelineItemStatusStyle } from "@/features/mar/marShiftTimelineDisplay";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("marShiftTimelinePrnProjection (K.10B.11A)", () => {
  it("shared buildPrnTimelineAvailabilityProjections supports projectionKey", () => {
    const projections = buildPrnTimelineAvailabilityProjections({
      orderItemId: "oi-1",
      frequencyCode: "Q6H",
      createdAt: "2026-06-11T21:00:00.000Z",
      shiftStartAt: "2026-06-11T19:00:00.000Z",
      shiftEndAt: "2026-06-12T08:00:00.000Z",
    });
    expect(projections[0]?.projectionKey).toContain("oi-1:");
  });

  it("API supports prnProjectionKey dedupe", () => {
    const prnUtil = readSrc("../../api/src/medication-dose/mar-shift-timeline-prn.util.ts");
    expect(prnUtil).toContain("prnProjectionKey");
    expect(prnUtil).toContain("resolveMarShiftTimelinePrnCellDedupeKey");
    expect(prnUtil).toContain("appendMarShiftTimelinePrnAvailabilityProjections");
  });

  it("projected PRN cell uses yellow available styling", () => {
    const style = marShiftTimelineItemStatusStyle("DUE", false, true, "500 mg PO");
    expect(style.backgroundColor).toBe("#FFFBE6");
  });

  it("administered PRN cell remains gray inside PRN band", () => {
    const style = marShiftTimelineItemStatusStyle("COMPLETED", true, true, "PO");
    expect(style.backgroundColor).toBe("#E5E7EB");
  });

  it("drawer receives prnNextEligibleAt for projected PRN", () => {
    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    const api = readSrc("lib/marShiftTimelineApi.ts");
    expect(drawer).toContain("prnNextEligibleAt");
    expect(api).toContain("prnNextEligibleAt");
  });
});
