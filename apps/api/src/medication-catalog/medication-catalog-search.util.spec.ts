import {
  expandCombinationSeparatorVariants,
  expandMedicationSearchQuery,
} from "./medication-catalog-search.util";

describe("medication catalog search query expansion", () => {
  it("expands amoxicillin clavulanate separator variants", () => {
    const terms = expandMedicationSearchQuery("amoxicillin clavulanate");
    expect(terms).toEqual(
      expect.arrayContaining([
        "amoxicillin clavulanate",
        "amoxicillin/clavulanate",
        "amoxicillin-clavulanate",
        "augmentin",
      ])
    );
  });

  it("expands sacubitril valsartan separator variants", () => {
    const terms = expandMedicationSearchQuery("sacubitril valsartan");
    expect(terms).toEqual(
      expect.arrayContaining([
        "sacubitril valsartan",
        "sacubitril/valsartan",
        "sacubitril-valsartan",
        "entresto",
      ])
    );
  });

  it("expands slash form to spaced form", () => {
    expect(expandCombinationSeparatorVariants("amoxicillin/clavulanate")).toEqual(
      expect.arrayContaining(["amoxicillin clavulanate", "amoxicillin/clavulanate"])
    );
  });

  it("keeps jardiance jar expansion distinct from tirzepatide", () => {
    const terms = expandMedicationSearchQuery("jard");
    expect(terms).toEqual(expect.arrayContaining(["jard", "jardiance", "empagliflozin"]));
    expect(terms.join(" ")).not.toContain("tirzepatide");
  });
});
