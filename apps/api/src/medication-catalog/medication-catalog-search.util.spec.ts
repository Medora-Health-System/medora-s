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

  it("keeps original query term and adds enterprise brand expansion", () => {
    const terms = expandMedicationSearchQuery("metformin");
    expect(terms).toContain("metformin");
    expect(terms).toContain("glucophage");
  });

  it("M1.6C expands cumadin to coumadin and warfarin", () => {
    const terms = expandMedicationSearchQuery("cumadin");
    expect(terms).toContain("cumadin");
    expect(terms).toContain("coumadin");
    expect(terms).toContain("warfarin");
  });

  it("M1.6C expands lovanox to lovenox and enoxaparin", () => {
    const terms = expandMedicationSearchQuery("lovanox");
    expect(terms).toContain("lovenox");
    expect(terms).toContain("enoxaparin");
  });

  it("M1.6C expands coumadin to warfarin", () => {
    expect(expandMedicationSearchQuery("coumadin")).toContain("warfarin");
  });

  it("M1.6C does not expand cumadin to unrelated drugs", () => {
    const terms = expandMedicationSearchQuery("cumadin");
    expect(terms).not.toContain("metformin");
    expect(terms).not.toContain("lovenox");
  });

  it("IV fluids — expands NS to normal saline and sodium chloride", () => {
    const terms = expandMedicationSearchQuery("ns");
    expect(terms).toContain("normal saline");
    expect(terms).toContain("sodium chloride");
  });

  it("IV fluids — expands D5 to d5w and dextrose", () => {
    const terms = expandMedicationSearchQuery("d5");
    expect(terms).toContain("d5w");
    expect(terms).toContain("dextrose");
  });

  it("IV fluids — expands LR to lactated ringer", () => {
    const terms = expandMedicationSearchQuery("lr");
    expect(terms).toContain("lactated ringer");
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
