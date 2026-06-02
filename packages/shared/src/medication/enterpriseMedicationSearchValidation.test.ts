import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_MEDICATION_ALIAS_MANIFEST,
  ENTERPRISE_MEDICATION_SEARCH_TYPOS,
} from "./enterpriseMedicationAliasManifest.js";
import { buildEnterpriseMedicationSearchQueryExpansions } from "./enterpriseMedicationSearchExpansion.js";
import {
  computeEnterpriseMedicationSearchReadiness,
  queryExpansionResolvesTypo,
  validateEnterpriseMedicationSearchPair,
} from "./enterpriseMedicationSearchValidation.js";
import type { EnterpriseMedicationSearchCatalogHit } from "./enterpriseMedicationAliasTypes.js";

function mockCatalog(
  code: string,
  generic: string,
  aliases: string[],
  searchText?: string
): EnterpriseMedicationSearchCatalogHit {
  return {
    catalogCode: code,
    genericName: generic,
    aliases,
    searchText: searchText ?? `${generic} ${aliases.join(" ")}`,
  };
}

describe("enterprise medication search validation M1.6C", () => {
  it("expands cumadin to coumadin and warfarin terms", () => {
    const expansions = buildEnterpriseMedicationSearchQueryExpansions();
    const terms = expansions.cumadin ?? [];
    expect(terms).toContain("coumadin");
    expect(terms).toContain("warfarin");
    expect(queryExpansionResolvesTypo("cumadin", "coumadin")).toBe(true);
  });

  it("expands lovanox to lovenox", () => {
    expect(queryExpansionResolvesTypo("lovanox", "lovenox")).toBe(true);
  });

  it("does not map cumadin to unrelated drugs via expansion", () => {
    const expansions = buildEnterpriseMedicationSearchQueryExpansions();
    const terms = expansions.cumadin ?? [];
    expect(terms).not.toContain("metformin");
    expect(terms).not.toContain("lovenox");
  });

  it("validates warfarin/coumadin pair on catalog hits", () => {
    const catalogs = [
      mockCatalog("WARFARIN_5_MG_COMPRIME_ORAL", "Warfarin", [
        "coumadin",
        "jantoven",
        "warfarin",
      ]),
    ];
    const result = validateEnterpriseMedicationSearchPair(catalogs, {
      generic: "warfarin",
      brand: "coumadin",
      catalogCode: "WARFARIN_5_MG_COMPRIME_ORAL",
    });
    expect(result.pass).toBe(true);
  });

  it("computes readiness above 90% when full manifest aliases indexed", () => {
    const catalogs: EnterpriseMedicationSearchCatalogHit[] =
      ENTERPRISE_MEDICATION_ALIAS_MANIFEST.map((entry) => {
        const aliases = entry.aliases.map((a) => a.text.toLowerCase());
        return mockCatalog(entry.catalogCode, entry.genericName, aliases);
      });
    const report = computeEnterpriseMedicationSearchReadiness(catalogs);
    expect(report.pairPassCount).toBeGreaterThanOrEqual(15);
    expect(report.readinessPct).toBeGreaterThanOrEqual(90);
  });

  it("covers all declared typo entries in expansion map", () => {
    for (const typo of ENTERPRISE_MEDICATION_SEARCH_TYPOS) {
      expect(queryExpansionResolvesTypo(typo.typo, typo.canonical)).toBe(true);
    }
  });
});
