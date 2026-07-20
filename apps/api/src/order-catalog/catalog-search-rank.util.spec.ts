import {
  compareCatalogRows,
  identitySurfaceScore,
  matchTierForQuery,
} from "./catalog-search-rank.util";

describe("catalog search ranking — brand identity preference", () => {
  const sps = {
    code: "KAYEXALATE_15_G_PER_60_ML_ORAL_SUSPENSION_ORAL",
    name: "Kayexalate",
    genericName: "Sodium Polystyrene Sulfonate",
    searchText: "kayexalate sodium polystyrene sulfonate",
    isEssential: false,
    sortPriority: 100,
  };
  const dextrose = {
    code: "DEXTROSE_5_500_ML_PERFUSION_INTRAVEINEUSE",
    name: "Dextrose 5%",
    genericName: "Dextrose",
    searchText: "dextrose hyperk kayexalate protocol",
    isEssential: true,
    sortPriority: 1,
  };

  it("scores Kayexalate identity above cocktail searchText collision", () => {
    expect(identitySurfaceScore("kayexalate", sps)).toBeGreaterThan(
      identitySurfaceScore("kayexalate", dextrose)
    );
  });

  it("ranks exact Kayexalate alias target above unrelated essential Dextrose at same tier", () => {
    const cmp = compareCatalogRows(
      { row: sps, tier: 0, query: "kayexalate" },
      { row: dextrose, tier: 0, query: "kayexalate" }
    );
    expect(cmp).toBeLessThan(0);
  });

  it("keeps exact brand alias at tier 0", () => {
    expect(matchTierForQuery("kayexalate", sps, { aliasOnlyMatch: false, aliases: ["kayexalate"] })).toBe(
      0
    );
  });

  it("demotes orphan exact alias without identity surface", () => {
    const orphan = {
      code: "DEXTROSE_5",
      name: "Dextrose 5%",
      genericName: "Dextrose",
      searchText: "dextrose infusion",
      isEssential: true,
      sortPriority: 1,
    };
    expect(
      matchTierForQuery("kayexalate", orphan, {
        aliasOnlyMatch: false,
        aliases: ["kayexalate"],
      })
    ).toBe(6);
  });
});
