import {
  buildCatalogMedicationSearchWhere,
  expandMedicationSearchQuery,
  tokenizeMedicationSearchQuery,
} from "./medication-catalog-search.util";

describe("expandMedicationSearchQuery", () => {
  it("expands brand prefix jard to empagliflozin", () => {
    const terms = expandMedicationSearchQuery("jard");
    expect(terms).toContain("jard");
    expect(terms).toContain("empagliflozin");
    expect(terms).toContain("jardiance");
  });

  it("expands atorvas to atorvastatin", () => {
    const terms = expandMedicationSearchQuery("atorvas");
    expect(terms).toContain("atorvastatin");
  });

  it("expands lipitor to atorvastatin", () => {
    expect(expandMedicationSearchQuery("lipitor")).toContain("atorvastatin");
  });

  it("keeps original query term", () => {
    expect(expandMedicationSearchQuery("metformin")).toEqual(["metformin"]);
  });
});

describe("buildCatalogMedicationSearchWhere", () => {
  it("includes genericName in search fields", () => {
    const where = buildCatalogMedicationSearchWhere(["atorvastatin"]);
    const serialized = JSON.stringify(where);
    expect(serialized).toContain("genericName");
  });
});

describe("tokenizeMedicationSearchQuery", () => {
  it("splits multi-word queries", () => {
    expect(tokenizeMedicationSearchQuery("10 mg tablet")).toEqual(["10", "mg", "tablet"]);
  });
});
