import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMarMedicationDoseDisplayFields } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("MAR dose and directions visibility (MEDUI.MAR.DOSE_AND_DIRECTIONS_VISIBILITY_SAFETY_FIX.1)", () => {
  it("shared helper shows potassium 20 mEq PO with directions and structured total", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "20",
      doseUnit: "mEq",
      quantity: "2",
      route: "PO",
      frequencyCode: "ONCE",
      directionsSig: "2 tabs PO now",
    });

    expect(fields.doseLabel).toBe("20 mEq");
    expect(fields.totalDoseLabel).toBe("40 mEq");
    expect(fields.directionsLabel).toBe("2 tabs PO now");
    expect(fields.routeLabel).toBe("PO");
  });

  it("timeline card renders bold dose label near medication name", () => {
    const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain('data-testid="mar-shift-timeline-dose-label"');
    expect(timeline).toContain("item.doseDisplay?.doseLabel");
    expect(timeline).toContain("fontWeight: 700");
    expect(timeline).toContain('data-testid="mar-shift-timeline-directions-label"');
  });

  it("drawer emphasizes dose near the top below medication title", () => {
    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-dose-emphasis"');
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-dose-emphasis-amount"');
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-dose-emphasis-route"');
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-directions"');
  });

  it("API projection includes doseDisplay on timeline cell items", () => {
    const service = readFileSync(
      join(
        webSrcRoot,
        "../../api/src/medication-dose/mar-shift-timeline.service.ts"
      ),
      "utf8"
    );
    expect(service).toContain("buildMarMedicationDoseDisplayFields");
    expect(service).toContain("doseDisplay");
  });

  it("web timeline types include doseDisplay fields", () => {
    const apiTypes = readSrc("lib/marShiftTimelineApi.ts");
    expect(apiTypes).toContain("MarMedicationDoseDisplayFields");
    expect(apiTypes).toContain("doseDisplay?:");
  });
});
