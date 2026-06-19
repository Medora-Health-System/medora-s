import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildClinicalDataRecentHighlights } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataRecentFeed (MEDUI.ED.CLINICAL_DATA.2)", () => {
  const feed = readSrc("features/emergency/EmergencyClinicalDataRecentFeed.tsx");
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");

  it("13 — recent feed sorted newest first via shared builder", () => {
    const items = buildClinicalDataRecentHighlights([
      {
        id: "old",
        cardId: "score_ciwa_ar",
        category: "SCORES_AND_SCREENS",
        cardTitleEn: "CIWA-Ar",
        cardTitleFr: "CIWA-Ar",
        authorDisplayName: "Elizabeth Posada",
        authorRoleTitle: "RN",
        createdAt: "2026-06-19T07:41:00.000Z",
        voidedAt: null,
        payloadJson: { totalScore: 8 },
      },
      {
        id: "new",
        cardId: "stroke_nihss",
        category: "STROKE_DOCUMENTATION",
        cardTitleEn: "NIHSS Reassessment",
        cardTitleFr: "Réévaluation NIHSS",
        authorDisplayName: "Elizabeth Posada",
        authorRoleTitle: "RN",
        createdAt: "2026-06-19T08:12:00.000Z",
        voidedAt: null,
        payloadJson: { totalScore: 8 },
      },
    ]);
    expect(items[0]?.id).toBe("new");
  });

  it("14 — author displayed in feed component", () => {
    expect(feed).toContain("authorDisplayName");
    expect(feed).toContain("authorRoleTitle");
  });

  it("15 — date displayed in feed component", () => {
    expect(feed).toContain("formatDate");
  });

  it("16 — time displayed in feed component", () => {
    expect(feed).toContain("formatTime");
    expect(feed).toContain("formatClinicalInstantForFacility");
  });

  it("recent feed section exists in panel layout before catalog", () => {
    expect(panel).toContain("EmergencyClinicalDataRecentFeed");
    const panelBody = panel.slice(panel.indexOf("export function EmergencyClinicalDataPanel"));
    const summaryIdx = panelBody.indexOf("<EmergencyClinicalDataSummary");
    const feedIdx = panelBody.indexOf("<EmergencyClinicalDataRecentFeed");
    const hubIdx = panelBody.indexOf("<ClinicalDocumentationHub");
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(feedIdx).toBeGreaterThan(summaryIdx);
    expect(hubIdx).toBeGreaterThan(feedIdx);
  });

  it("feed uses i18n recent documentation title", () => {
    expect(feed).toContain("emergencyClinicalData.summary.recentDocumentation");
  });

  it("empty state uses existing clinical documentation empty message", () => {
    expect(feed).toContain("clinicalDocumentation.savedEntriesEmpty");
  });
});
