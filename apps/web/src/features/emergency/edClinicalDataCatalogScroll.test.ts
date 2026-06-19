import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataCatalogScroll (MEDUI.ED.CLINICAL_DATA.5/5C)", () => {
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("catalog uses shared horizontal scroll strip", () => {
    expect(hub).toContain('data-testid="clinical-documentation-catalog"');
    expect(hub).toContain('data-testid="clinical-documentation-catalog-scroll"');
    expect(hub).toContain('overflowX: "auto"');
    expect(hub).toContain('flexWrap: "nowrap"');
  });

  it("catalog no longer uses wrapping grid that clips right-edge cards", () => {
    expect(hub).not.toContain('gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"');
    expect(hub).not.toContain('data-testid="clinical-documentation-cards-grid"');
  });
});
