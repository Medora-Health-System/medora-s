import { imagingClassifierSearchOr, labClassifierSearchOr } from "./terminology-classifier-search.util";

describe("terminology-classifier-search.util", () => {
  it("imagingClassifierSearchOr includes bodyRegionClassifier alias match", () => {
    const clauses = imagingClassifierSearchOr("genou");
    expect(clauses.some((c) => "bodyRegionClassifier" in c)).toBe(true);
  });

  it("labClassifierSearchOr includes labCategoryClassifier alias match", () => {
    const clauses = labClassifierSearchOr("hematologie");
    expect(clauses.some((c) => "labCategoryClassifier" in c)).toBe(true);
  });
});
