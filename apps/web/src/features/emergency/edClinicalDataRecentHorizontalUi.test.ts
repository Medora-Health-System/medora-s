import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataRecentHorizontalUi (MEDUI.ED.CLINICAL_DATA.3)", () => {
  const feed = readSrc("features/emergency/EmergencyClinicalDataRecentFeed.tsx");
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");

  it("17 — recent feed displays horizontal compact layout", () => {
    expect(feed).toContain("clinical-data-recent-feed-horizontal");
    expect(feed).toContain("overflowX: \"auto\"");
    expect(feed).toContain("flexWrap: \"nowrap\"");
  });

  it("18 — recent feed does not render giant vertical block", () => {
    expect(feed).not.toContain("flexDirection: \"column\"");
    expect(feed).not.toContain("gridTemplateColumns: \"72px");
  });

  it("16 — recent feed sorted newest first via shared builder", () => {
    expect(feed).toContain("buildClinicalDataRecentHighlights");
  });

  it("panel wires onSelectEntry for detail drawer", () => {
    expect(panel).toContain("onSelectEntry={setDetailEntryId}");
    expect(panel).toContain("EmergencyClinicalDataDetailDrawer");
  });
});
