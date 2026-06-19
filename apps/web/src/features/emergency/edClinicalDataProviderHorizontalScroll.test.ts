import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  filterClinicalDocumentationCardsByRole,
  listClinicalDocumentationCardsForCareSetting,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataProviderHorizontalScroll (MEDUI.ED.CLINICAL_DATA.5C)", () => {
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");
  const edCards = listClinicalDocumentationCardsForCareSetting("ED");
  const providerCards = filterClinicalDocumentationCardsByRole(edCards, "PROVIDER");

  it("Provider catalog includes minimum score and provider-owned forms", () => {
    expect(providerCards.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(providerCards.map((c) => c.id));
    expect(ids.has("score_heart")).toBe(true);
    expect(ids.has("score_rts")).toBe(true);
    expect(ids.has("score_wells_pe")).toBe(true);
    expect(ids.has("score_perc")).toBe(true);
    expect(ids.has("score_geneva")).toBe(true);
  });

  it("Provider cards render beyond viewport width (horizontal strip, not wrapped grid)", () => {
    expect(providerCards.length).toBe(10);
    const minStripWidth = providerCards.length * 220 + (providerCards.length - 1) * 10;
    expect(minStripWidth).toBeGreaterThan(1280);
  });

  it("Horizontal scroll container exists with overflow-x enabled", () => {
    expect(hub).toContain('data-testid="clinical-documentation-catalog-scroll"');
    expect(hub).toContain('overflowX: "auto"');
    expect(hub).toContain('overflowY: "hidden"');
    expect(hub).toContain('flexWrap: "nowrap"');
    expect(hub).toContain('scrollSnapType: "x proximity"');
  });

  it("Mouse wheel maps vertical delta to horizontal scroll", () => {
    expect(hub).toContain("handleCatalogHorizontalWheel");
    expect(hub).toContain("onWheel={handleCatalogHorizontalWheel}");
    expect(hub).toContain("scrollLeft += event.deltaY");
  });

  it("Touch/trackpad scrolling enabled on catalog strip", () => {
    expect(hub).toContain('WebkitOverflowScrolling: "touch"');
  });

  it("Provider and Nursing filters use the same scroll container (no role-specific layout)", () => {
    expect(hub).toContain("data-role-filter={selectedRoleFilter}");
    expect(hub).not.toMatch(/roleFilter === "PROVIDER"[\s\S]{0,400}display: "grid"/);
    expect(hub).not.toMatch(/selectedRoleFilter === "RN"[\s\S]{0,400}display: "grid"/);
    const scrollContainerCount = (hub.match(/clinical-documentation-catalog-scroll/g) ?? []).length;
    expect(scrollContainerCount).toBe(1);
  });

  it("Last provider card is reachable via fixed-width flex items", () => {
    expect(hub).toContain("catalogCardShell");
    expect(hub).toContain('minWidth: 220');
    expect(hub).toContain('flex: "0 0 auto"');
    expect(hub).toContain("scrollSnapAlign");
  });

  it("Exact provider-owned ED card count", () => {
    expect(providerCards).toHaveLength(10);
    expect(providerCards.map((c) => c.id).sort()).toEqual([
      "massive_transfusion_protocol_event",
      "restraint_face_to_face",
      "restraint_renewal",
      "score_geneva",
      "score_heart",
      "score_perc",
      "score_rts",
      "score_wells_pe",
      "sedation_pre_assessment",
      "stroke_abcd2",
    ]);
  });
});
