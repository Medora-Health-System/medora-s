import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataCatalogScroll (MEDUI.ED.CLINICAL_DATA.5)", () => {
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("11 — catalog uses responsive grid without horizontal clipping", () => {
    expect(hub).toContain('data-testid="clinical-documentation-catalog"');
    expect(hub).toContain('gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"');
    expect(hub).toContain('overflowX: "visible"');
    expect(hub).toContain('width: "100%"');
  });

  it("12 — catalog cards grid is reachable inside scrollable vertical container", () => {
    expect(hub).toContain('data-testid="clinical-documentation-cards-grid"');
    expect(hub).toContain('overflowY: "auto"');
    expect(hub).not.toContain('flexWrap: "nowrap"');
  });
});
