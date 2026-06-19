import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataRecentCompactDetails (MEDUI.ED.CLINICAL_DATA.4)", () => {
  const summary = readSrc("features/emergency/EmergencyClinicalDataSummary.tsx");
  const recent = readSrc("features/emergency/EmergencyClinicalDataRecentFeed.tsx");
  const drawer = readSrc("features/emergency/EmergencyClinicalDataDetailDrawer.tsx");

  it("16 — Clinical Summary uses inline detail formatting", () => {
    expect(summary).toContain("formatClinicalDocumentationDetailInline");
    expect(summary).toContain("clinical-data-summary-metric-inline");
  });

  it("17 — Clinical Summary shows score via detail rows projection", () => {
    expect(summary).toContain("buildClinicalDataSummaryProjection");
    expect(summary).toContain("detailRows");
  });

  it("18 — Recent Documentation shows details inline horizontally", () => {
    expect(recent).toContain("formatClinicalDocumentationDetailInline");
    expect(recent).toContain("clinical-data-recent-feed-inline");
    expect(recent).toContain("clinical-data-recent-feed-horizontal");
  });

  it("19 — Recent card does not render vertical bullet list", () => {
    expect(recent).not.toContain("<ul");
    expect(recent).not.toContain("<li");
  });

  it("20 — Drawer shows full detail rows vertically", () => {
    expect(drawer).toContain("buildClinicalDocumentationDetailRows");
    expect(drawer).toContain("clinical-data-detail-row");
  });

  it("View details affordance preserved on recent cards", () => {
    expect(recent).toContain("emergencyClinicalData.detail.viewDetails");
  });
});
