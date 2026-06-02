import {
  ENTERPRISE_MEDICATION_ALIAS_MANIFEST,
  ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS,
  computeEnterpriseMedicationSearchReadiness,
} from "@medora/shared";
import { expandMedicationSearchQuery } from "./medication-catalog-search.util";

describe("enterprise medication search M1.6C", () => {
  it("manifest covers Wave 1 and supplemental ER rows", () => {
    expect(ENTERPRISE_MEDICATION_ALIAS_MANIFEST.length).toBeGreaterThanOrEqual(45);
    const codes = new Set(ENTERPRISE_MEDICATION_ALIAS_MANIFEST.map((e) => e.catalogCode));
    expect(codes.has("WARFARIN_5_MG_COMPRIME_ORAL")).toBe(true);
    expect(codes.has("CEFTRIAXONE_1_G_INJECTABLE_INJECTION")).toBe(true);
  });

  it("required pairs include anticoag and chronic staples", () => {
    const labels = ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS.map((p) => `${p.generic}/${p.brand}`);
    expect(labels).toContain("warfarin/coumadin");
    expect(labels).toContain("enoxaparin/lovenox");
    expect(labels).toContain("metformin/glucophage");
  });

  it("query expansion supports misspelled anticoag brands", () => {
    expect(expandMedicationSearchQuery("cumadin")).toContain("warfarin");
    expect(expandMedicationSearchQuery("lovanox")).toContain("enoxaparin");
    expect(expandMedicationSearchQuery("levothyroxin")).toContain("levothyroxine");
    expect(expandMedicationSearchQuery("hydrochlorothiazid")).toContain("hydrochlorothiazide");
  });

  it("readiness model reaches >90% when manifest aliases are indexed on mock catalogs", () => {
    const catalogs = ENTERPRISE_MEDICATION_ALIAS_MANIFEST.map((entry) => {
      const aliases = entry.aliases.map((a) => a.text.toLowerCase());
      return {
        catalogCode: entry.catalogCode,
        genericName: entry.genericName,
        aliases,
        searchText: [entry.genericName, ...aliases].join(" ").toLowerCase(),
      };
    });
    const report = computeEnterpriseMedicationSearchReadiness(catalogs);
    expect(report.pairPassCount).toBe(ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS.length);
    expect(report.readinessPct).toBeGreaterThanOrEqual(90);
  });
});
