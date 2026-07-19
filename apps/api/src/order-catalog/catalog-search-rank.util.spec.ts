import {
  matchTierForQuery,
  resolveMatchedBrandAlias,
  tokenPrefixMatch,
} from "./catalog-search-rank.util";

describe("catalog search ranking (provider-facing)", () => {
  it("treats jar as a token prefix of jardiance but not mounjaro", () => {
    expect(tokenPrefixMatch("jardiance", "jar")).toBe(true);
    expect(tokenPrefixMatch("mounjaro", "jar")).toBe(false);
  });

  it("ranks jardiance alias above mid-string tirzepatide/mounjaro for jar", () => {
    const jardianceTier = matchTierForQuery(
      "jar",
      {
        code: "EMPAGLIFLOZIN_10_MG_TABLET_ORAL",
        name: "Empagliflozin",
        displayNameEn: "Empagliflozin",
        genericName: "Empagliflozin",
        searchText: "empagliflozin jardiance 10 mg",
        isEssential: true,
        sortPriority: 0,
      },
      { aliasOnlyMatch: false, aliases: ["jardiance", "jard"] }
    );
    const tirzepatideTier = matchTierForQuery(
      "jar",
      {
        code: "TIRZEPATIDE_2_5_MG",
        name: "Tirzepatide",
        displayNameEn: "Tirzepatide",
        genericName: "Tirzepatide",
        searchText: "tirzepatide mounjaro 2.5 mg",
        isEssential: false,
        sortPriority: 10,
      },
      { aliasOnlyMatch: false, aliases: ["mounjaro"] }
    );
    expect(jardianceTier).toBeLessThan(tirzepatideTier);
    expect(tirzepatideTier).toBe(9);
  });

  it("gives exact brand alias the top tier", () => {
    expect(
      matchTierForQuery(
        "biktarvy",
        {
          code: "BICTEGRAVIR_COMBO",
          name: "Bictegravir Emtricitabine Tenofovir Alafenamide",
          displayNameEn: "Bictegravir Emtricitabine Tenofovir Alafenamide",
          genericName: "Bictegravir Emtricitabine Tenofovir Alafenamide",
          searchText: "biktarvy hiv",
          isEssential: false,
          sortPriority: 0,
        },
        { aliasOnlyMatch: false, aliases: ["biktarvy", "bikt"] }
      )
    ).toBe(0);
  });

  it("resolves matched brand alias for display promotion", () => {
    expect(
      resolveMatchedBrandAlias("jard", ["jardiance", "empagliflozin"], ["jard", "jardiance"])
    ).toBe("jardiance");
  });
});
