import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataRecentFeed updates (MEDUI.ED.CLINICAL_DATA.3)", () => {
  const feed = readSrc("features/emergency/EmergencyClinicalDataRecentFeed.tsx");

  it("11 — Recent Clinical Documentation remains visible", () => {
    expect(feed).toContain("emergencyClinicalData.summary.recentDocumentation");
  });

  it("recent feed no longer uses vertical grid layout", () => {
    expect(feed).toContain("clinical-data-recent-feed-horizontal");
  });

  it("23 — English labels via i18n keys", () => {
    const en = readSrc("i18n/messages/en.ts");
    expect(en).toContain('recentDocumentation: "Recent Clinical Documentation"');
    expect(en).toContain('viewDetails: "View details"');
  });

  it("24 — French labels via i18n keys", () => {
    const fr = readSrc("i18n/messages/fr.ts");
    expect(fr).toContain('recentDocumentation: "Documentation clinique récente"');
    expect(fr).toContain('viewDetails: "Voir les détails"');
  });

  it("22 — facility timezone helper used in feed", () => {
    expect(feed).toContain("formatClinicalInstantForFacility");
    expect(feed).toContain("facilityTimeZone");
  });
});
