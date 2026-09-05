import { readFileSync } from "node:fs";
import { join } from "node:path";

const apiRoot = join(__dirname, ".");
const encountersRoot = join(__dirname, "../encounters");
const roiRoot = join(__dirname, "../roi");

describe("P3-D chart-summary live presentation batch", () => {
  it("dedupes catalog rows then issues one presentation resolve for active + encounter diagnoses", () => {
    const source = readFileSync(join(apiRoot, "chart-summary.service.ts"), "utf8");
    expect(source).toContain("uniqueIcd10PresentationCatalogRows");
    expect(source).toContain("resolveIcd10PresentationByCatalogId");
    expect(source).toContain("presentationCatalogRows");
    expect(source).toContain("ICD10_PRESENTATION_CATALOG_SELECT");
    expect(source).toContain("parseOptionalIcd10ListLocale");
    expect(source).toContain("[...activeDiagnoses, ...encounterDiagnosesRows]");
    expect(source).not.toContain("resolveDisplaysForCatalogRows");
    expect((source.match(/resolveIcd10PresentationByCatalogId/g) ?? []).length).toBe(2);
    expect((source.match(/uniqueIcd10PresentationCatalogRows/g) ?? []).length).toBe(2);
  });

  it("frozen chart-export and ROI do not call live chart-summary presentation", () => {
    const exportService = readFileSync(join(encountersRoot, "chart-export.service.ts"), "utf8");
    const exportHtml = readFileSync(join(encountersRoot, "chart-export-html.util.ts"), "utf8");
    const roi = readFileSync(join(roiRoot, "chart-roi.service.ts"), "utf8");
    for (const src of [exportService, exportHtml, roi]) {
      expect(src).not.toContain("icd10-diagnosis-presentation");
      expect(src).not.toContain("resolveIcd10PresentationByCatalogId");
      expect(src).not.toContain("ChartSummaryService");
      expect(src).not.toContain("liveIcd10DiagnosisPrimary");
    }
    expect(exportService).toContain("code: true");
    expect(exportService).toContain("description: true");
    expect(exportHtml).toContain("d.description");
    expect(exportHtml).not.toContain("d.displayLabel");
  });
});
