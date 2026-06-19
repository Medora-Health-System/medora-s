import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataSideBySideLayout (MEDUI.ED.CLINICAL_DATA.4)", () => {
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");

  it("14 — Clinical Summary and Recent Documentation share desktop grid row", () => {
    expect(panel).toContain('data-testid="clinical-data-header-grid"');
    expect(panel).toContain("clinical-data-header-grid");
    expect(panel).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)");
    expect(panel).toContain("EmergencyClinicalDataSummary");
    expect(panel).toContain("EmergencyClinicalDataRecentFeed");
  });

  it("15 — Cards stack on narrow viewport via media query", () => {
    expect(panel).toContain("@media (max-width: 767.98px)");
    expect(panel).toContain("grid-template-columns: minmax(0, 1fr)");
  });

  it("Summary and recent cards use equal-height shell", () => {
    const summary = readSrc("features/emergency/EmergencyClinicalDataSummary.tsx");
    const recent = readSrc("features/emergency/EmergencyClinicalDataRecentFeed.tsx");
    expect(summary).toContain('height: "100%"');
    expect(recent).toContain('height: "100%"');
  });
});
