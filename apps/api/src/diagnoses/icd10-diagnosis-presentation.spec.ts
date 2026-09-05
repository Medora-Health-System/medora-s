import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyIcd10DiagnosisPresentation,
  attachIcd10DiagnosisPresentation,
  uniqueIcd10PresentationCatalogRows,
} from "./icd10-diagnosis-presentation";
import type { Icd10TerminologyService } from "./icd10-terminology.service";

const catalog = {
  id: "cat-r1085",
  code: "R10.85",
  codeSystem: "ICD-10-CM",
  releaseVersion: "FY2026",
  shortDescription: "Generalized abdominal pain",
  longDescription: null,
};

describe("icd10-diagnosis-presentation adapter", () => {
  it("is a mapping adapter: unique catalog ids, one terminology batch, no second ranking engine", async () => {
    const source = readFileSync(join(__dirname, "icd10-diagnosis-presentation.ts"), "utf8");
    expect(source).toContain("resolveDisplaysForCatalogRows");
    expect(source).toContain("uniqueIcd10PresentationCatalogRows");
    expect(source).not.toContain("sourcePriority");
    expect(source).not.toContain("isEffective");
    expect(source).not.toContain("searchAlias");
    expect(source).not.toContain("resolveIcd10DiagnosisDisplay(");

    const resolveDisplaysForCatalogRows = jest.fn().mockResolvedValue(
      new Map([
        [
          "cat-r1085",
          {
            code: "R10.85",
            displayName: "Dolor abdominal en varios sitios",
            exactness: "EXACT_GOVERNED",
            provenance: "MEDORA_GOVERNED",
            localized: true,
          },
        ],
      ]),
    );
    const rows = [
      { code: "R10.85", description: "Generalized abdominal pain", icd10Catalog: catalog },
      { code: "R10.85", description: "Generalized abdominal pain", icd10Catalog: catalog },
    ];
    const presented = await attachIcd10DiagnosisPresentation(
      { resolveDisplaysForCatalogRows } as unknown as Icd10TerminologyService,
      "es",
      rows,
    );
    expect(resolveDisplaysForCatalogRows).toHaveBeenCalledTimes(1);
    expect(resolveDisplaysForCatalogRows.mock.calls[0][0].catalogRows).toHaveLength(1);
    expect(presented[0]?.description).toBe("Generalized abdominal pain");
    expect(presented[0]?.code).toBe("R10.85");
    expect(presented[0]?.displayLabel).toBe("Dolor abdominal en varios sitios");
    expect(uniqueIcd10PresentationCatalogRows([catalog, catalog, null])).toHaveLength(1);
  });

  it("missing FR/ES catalog display is code-only; EN may use stored English description without catalog", () => {
    const orphan = { code: "A42.1", description: "Abdominal actinomycosis", icd10Catalog: null };
    const es = applyIcd10DiagnosisPresentation("es", orphan, new Map());
    expect(es.displayLabel).toBe("A42.1");
    expect(es.displayResolution).toBe("UNLOCALIZED_CODE");
    expect(es.description).toBe("Abdominal actinomycosis");
    const en = applyIcd10DiagnosisPresentation("en", orphan, new Map());
    expect(en.displayLabel).toBe("Abdominal actinomycosis");
    expect(en.displayResolution).toBe("EXACT_SOURCE_LABEL");
  });
});
