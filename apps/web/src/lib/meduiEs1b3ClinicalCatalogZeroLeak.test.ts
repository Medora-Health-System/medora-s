import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getLocalizedDiagnosisDisplayLabel } from "@/features/emergency/diagnosisFrenchDisplayLabels";
import {
  diagnosisMatchesLocalizedSearch,
  resolveLocalizedDiagnosisSearchQueries,
} from "@/features/emergency/diagnosisFrenchSearchAliases";
import {
  catalogSearchItemFullDisplayLine,
  getCatalogSearchItemDisplayLabel,
  getCatalogSearchItemSecondaryLine,
} from "@/lib/catalogDisplayLabel";
import { chartSummaryOrderItemLineLabel } from "@/lib/chartSummaryOrderLabel";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { printT } from "@/lib/printI18n";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { existingOrderDisplayLabel } from "@medora/shared";
import { supportedLanguages } from "@/i18n/config";

const tEn = (key: string) => i18nMessage("en", key);
const tFr = (key: string) => i18nMessage("fr", key);
const webRoot = join(__dirname, "..");

function webSource(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

const DIAGNOSIS_FIXTURES = [
  { code: "R07.9", en: "Chest pain, unspecified", fr: "Douleur thoracique non précisée", frQuery: "douleur thoracique" },
  { code: "R10.9", en: "Unspecified abdominal pain", fr: "Douleur abdominale non précisée", frQuery: "douleur abdominale" },
  { code: "I10", en: "Essential (primary) hypertension", fr: "Hypertension essentielle", frQuery: "hypertension" },
  { code: "N39.0", en: "Urinary tract infection, site not specified", fr: "Infection urinaire, siège non précisé", frQuery: "infection urinaire" },
] as const;

const LAB_ITEM: CatalogSearchItem = {
  id: "lab-cbc",
  code: "CBC",
  type: "LAB_TEST",
  displayNameEn: "Complete Blood Count",
  displayNameFr: "Numération formule sanguine",
  secondaryText: "CBC · Hématologie",
  secondaryTextFr: "CBC · Hématologie",
  secondaryTextEn: "CBC · Hematology",
};

const IMAGING_ITEM: CatalogSearchItem = {
  id: "img-ct",
  code: "CT_HEAD",
  type: "IMAGING_STUDY",
  displayNameEn: "CT head",
  displayNameFr: "Scanner cérébral",
  secondaryText: "CT_HEAD · Radiographie",
  secondaryTextFr: "CT_HEAD · TDM",
  secondaryTextEn: "CT_HEAD · CT",
};

const MED_ITEM: CatalogSearchItem = {
  id: "med-met",
  code: "MET500",
  type: "MEDICATION",
  displayNameEn: "Metformin",
  displayNameFr: "Metformine",
  secondaryText: "500 mg · comprimé · orale",
  secondaryTextFr: "500 mg · comprimé · orale",
  secondaryTextEn: "500 mg · tablet · oral",
  metadata: { strength: "500 mg", dosageForm: "comprimé", route: "orale" },
};

describe("MEDUI.ES.1B.3 diagnosis zero-leak", () => {
  it.each(DIAGNOSIS_FIXTURES)("$code EN display is English only", (row) => {
    const label = getLocalizedDiagnosisDisplayLabel({ code: row.code, description: row.en }, "en");
    expect(label).toBe(row.en);
    expect(label).not.toBe(row.fr);
  });

  it.each(DIAGNOSIS_FIXTURES)("$code FR display is French only", (row) => {
    const label = getLocalizedDiagnosisDisplayLabel({ code: row.code, description: row.en }, "fr");
    expect(label).toBe(row.fr);
    expect(label).not.toMatch(/chest pain|abdominal pain|urinary tract infection/i);
  });

  it("French alias search may match while EN display stays English", () => {
    const queries = resolveLocalizedDiagnosisSearchQueries("douleur thoracique", "fr");
    expect(queries.some((q) => /chest pain/i.test(q))).toBe(true);
    const hit = { id: "1", code: "R07.9", shortDescription: "Chest pain, unspecified", longDescription: null };
    expect(diagnosisMatchesLocalizedSearch(hit, "douleur thoracique", "fr")).toBe(true);
    expect(getLocalizedDiagnosisDisplayLabel(hit, "en")).toBe("Chest pain, unspecified");
    expect(getLocalizedDiagnosisDisplayLabel(hit, "fr")).toBe("Douleur thoracique non précisée");
  });

  it("unmapped FR diagnosis uses code, not English prose", () => {
    const label = getLocalizedDiagnosisDisplayLabel(
      { code: "A41.9", description: "Sepsis, unspecified organism" },
      "fr"
    );
    expect(label).toBe("A41.9");
    expect(label).not.toMatch(/sepsis/i);
  });

  it("es diagnosis display is Spanish overlay, not EN or FR", () => {
    const label = getLocalizedDiagnosisDisplayLabel(
      { code: "R07.9", description: "Chest pain, unspecified" },
      "es"
    );
    expect(label).toBe("Dolor torácico no especificado");
    expect(label).not.toMatch(/chest pain/i);
    expect(label).not.toMatch(/douleur/i);
  });
});

describe("MEDUI.ES.1B.3 radiology / lab / pharmacy catalog display", () => {
  it("EN lab display does not include French secondary", () => {
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "en", tEn)).toBe("Complete Blood Count");
    expect(getCatalogSearchItemSecondaryLine(LAB_ITEM, "en")).toBe("CBC · Hematology");
    expect(catalogSearchItemFullDisplayLine(LAB_ITEM, "en", tEn)).not.toContain("Hématologie");
    expect(catalogSearchItemFullDisplayLine(LAB_ITEM, "en", tEn)).not.toContain("Numération");
  });

  it("FR lab display does not include English secondary", () => {
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "fr", tFr)).toBe("Numération formule sanguine");
    expect(getCatalogSearchItemSecondaryLine(LAB_ITEM, "fr")).toBe("CBC · Hématologie");
    expect(catalogSearchItemFullDisplayLine(LAB_ITEM, "fr", tFr)).not.toContain("Complete Blood Count");
    expect(catalogSearchItemFullDisplayLine(LAB_ITEM, "fr", tFr)).not.toContain("Hematology");
  });

  it("EN imaging display does not include French catalog prose", () => {
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "en", tEn)).toBe("CT head");
    expect(getCatalogSearchItemSecondaryLine(IMAGING_ITEM, "en")).toBe("CT_HEAD · CT");
    expect(catalogSearchItemFullDisplayLine(IMAGING_ITEM, "en", tEn)).not.toContain("Scanner");
    expect(catalogSearchItemFullDisplayLine(IMAGING_ITEM, "en", tEn)).not.toContain("TDM");
  });

  it("FR imaging display does not include English catalog prose", () => {
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "fr", tFr)).toBe("Scanner cérébral");
    expect(catalogSearchItemFullDisplayLine(IMAGING_ITEM, "fr", tFr)).not.toBe("CT head");
  });

  it("missing FR lab label uses code, not English", () => {
    const item = { ...LAB_ITEM, displayNameFr: "", secondaryTextFr: "" };
    expect(getCatalogSearchItemDisplayLabel(item, "fr", tFr)).toBe("CBC");
    expect(getCatalogSearchItemSecondaryLine(item, "fr")).toBe("");
    expect(getCatalogSearchItemDisplayLabel(item, "fr", tFr)).not.toBe("Complete Blood Count");
  });

  it("missing EN imaging label uses code or EN unlocalized chrome, not French", () => {
    const item = { ...IMAGING_ITEM, displayNameEn: "", secondaryTextEn: "" };
    const label = getCatalogSearchItemDisplayLabel(item, "en", tEn);
    expect(label).not.toBe("Scanner cérébral");
    expect(label.toLowerCase()).not.toContain("scanner");
    expect(label === "CT_HEAD" || label.includes("Imaging") || label.includes("label")).toBe(true);
  });

  it("EN medication does not show French form/route", () => {
    const line = catalogSearchItemFullDisplayLine(MED_ITEM, "en", tEn);
    expect(line).toContain("Metformin");
    expect(line.toLowerCase()).not.toContain("comprimé");
    expect(line.toLowerCase()).not.toContain("orale");
    expect(line.toLowerCase()).not.toContain("metformine");
  });

  it("FR medication does not show English form/route when FR exists", () => {
    const line = catalogSearchItemFullDisplayLine(MED_ITEM, "fr", tFr);
    expect(line).toContain("Metformine");
    expect(line).not.toContain("tablet");
    expect(line).not.toMatch(/\boral\b/i);
  });

  it("ES catalog display is Spanish overlay or code, not EN or FR", () => {
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "es")).toBe("Hemograma completo");
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "es")).toBe("TC de cráneo");
    expect(getCatalogSearchItemDisplayLabel(MED_ITEM, "es")).toBe("Metformina 500 mg, comprimido oral");
    for (const item of [LAB_ITEM, IMAGING_ITEM, MED_ITEM]) {
      expect(getCatalogSearchItemDisplayLabel(item, "es")).not.toBe(item.displayNameEn);
      expect(getCatalogSearchItemDisplayLabel(item, "es")).not.toBe(item.displayNameFr);
    }
  });
});

describe("MEDUI.ES.1B.3 order composer persist/reload + print", () => {
  it("FR order chrome does not use EN catalog snapshot", () => {
    const label = getOrderItemDisplayLabelForLanguage(
      {
        catalogItemType: "LAB_TEST",
        displayLabelEn: "Complete Blood Count",
        catalogLabTest: { code: "CBC", displayNameEn: "Complete Blood Count", displayNameFr: "" },
      },
      "fr",
      tFr
    );
    expect(label).not.toBe("Complete Blood Count");
  });

  it("EN order chrome does not use FR catalog snapshot", () => {
    const label = getOrderItemDisplayLabelForLanguage(
      {
        catalogItemType: "IMAGING_STUDY",
        displayLabelFr: "Scanner cérébral",
        catalogImagingStudy: { code: "CT_HEAD", displayNameFr: "Scanner cérébral", displayNameEn: "" },
      },
      "en",
      tEn
    );
    expect(label).toBe("CT_HEAD");
    expect(label).not.toContain("Scanner");
  });

  it("es order chrome uses governed Spanish or code, not EN/FR", () => {
    const label = getOrderItemDisplayLabelForLanguage(
      {
        catalogItemType: "MEDICATION",
        catalogMedication: { code: "MET500", displayNameEn: "Metformin", displayNameFr: "Metformine" },
      },
      "es",
      tEn
    );
    expect(label).toBe("Metformina");
    expect(label).not.toBe("Metformin");
    expect(label).not.toBe("Metformine");
  });

  it("chart/print order line FR missing does not render EN", () => {
    const row = {
      catalogItemType: "LAB_TEST",
      displayLabelEn: "Complete Blood Count",
      displayLabelFr: "",
    } as Parameters<typeof chartSummaryOrderItemLineLabel>[0];
    expect(chartSummaryOrderItemLineLabel(row, "fr", tFr)).toBe("—");
    expect(chartSummaryOrderItemLineLabel(row, "fr", tFr)).not.toBe("Complete Blood Count");
    expect(chartSummaryOrderItemLineLabel(row, "en", tEn)).toBe("Complete Blood Count");
    expect(chartSummaryOrderItemLineLabel(row, "es", tEn)).toBe("—");
  });

  it("print chrome stays on active locale", () => {
    expect(printT("en", "printOutput.discharge.documentH1")).not.toBe(printT("fr", "printOutput.discharge.documentH1"));
  });

  it("reloaded observation LAB with EN-only snapshot stays code in FR", () => {
    const label = existingOrderDisplayLabel(
      {
        id: "lab-1",
        type: "LAB",
        items: [
          {
            catalogItemType: "LAB_TEST",
            displayLabelEn: "Complete Blood Count",
            catalogLabTest: { code: "CBC", displayNameEn: "CBC", displayNameFr: "" },
          },
        ],
      },
      "fr"
    );
    expect(label).toBe("CBC");
    expect(label).not.toBe("Complete Blood Count");
  });
});

describe("MEDUI.ES.1B.3 composer/dental source isolation", () => {
  it("CreateOrderModal no longer stuffs EN into displayNameFr", () => {
    const src = webSource("components/orders/CreateOrderModal.tsx");
    expect(src).not.toMatch(/displayNameFr:\s*item\.displayNameFr\s*\?\?\s*item\.displayNameEn/);
    expect(src).not.toMatch(/locale === "fr" \? procedure\.displayNameFr : procedure\.displayNameEn/);
  });

  it("SharedCatalogAutocomplete does not render lab/imaging secondaryText as EN chrome", () => {
    const src = webSource("components/catalog/SharedCatalogAutocomplete.tsx");
    expect(src).toContain("getCatalogResultOneLineDisplay");
    expect(src).not.toMatch(/item\.type === "MEDICATION"[\s\S]*: item\.secondaryText/);
  });

  it("dental clinical surfaces do not coalesce displayNameEn || displayNameFr", () => {
    const dental = webSource("features/dental-care/procedures/EnterpriseDentalProceduresPanel.tsx");
    expect(dental).not.toMatch(/displayNameEn\s*\|\|\s*displayNameFr/);
    expect(dental).not.toMatch(/displayNameFr\s*\|\|\s*displayNameEn/);
  });

  it("supportedLanguages includes hidden Spanish; public selectors stay EN/FR", () => {
    expect([...supportedLanguages]).toEqual(["fr", "en", "es"]);
  });
});
