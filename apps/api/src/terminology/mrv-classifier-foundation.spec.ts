import {
  MRV_CLASSIFIER_DOMAIN_COUNTS,
  MRV_CLASSIFIER_FOUNDATION,
} from "../../prisma/data/mrv-classifier-foundation";

describe("mrv-classifier-foundation manifest", () => {
  it("seeds exactly 42 BODY_REGION classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.BODY_REGION).toBe(42);
    expect(MRV_CLASSIFIER_FOUNDATION.filter((e) => e.domain === "BODY_REGION")).toHaveLength(42);
  });

  it("seeds exactly 8 MODALITY classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.MODALITY).toBe(8);
  });

  it("seeds exactly 16 LAB_CATEGORY classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.LAB_CATEGORY).toBe(16);
  });

  it("seeds exactly 6 VIEW_COUNT classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.VIEW_COUNT).toBe(6);
    const codes = MRV_CLASSIFIER_FOUNDATION.filter((e) => e.domain === "VIEW_COUNT").map((e) => e.code);
    expect(codes).toEqual([
      "VIEW_COUNT_TWO",
      "VIEW_COUNT_ONE",
      "VIEW_COUNT_THREE",
      "VIEW_COUNT_FOUR",
      "VIEW_COUNT_COMPLETE",
      "VIEW_COUNT_UNSPECIFIED",
    ]);
  });

  it("seeds exactly 5 CONTRAST_TYPE classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.CONTRAST_TYPE).toBe(5);
    const codes = MRV_CLASSIFIER_FOUNDATION.filter((e) => e.domain === "CONTRAST_TYPE").map((e) => e.code);
    expect(codes).toEqual([
      "CONTRAST_TYPE_WITHOUT",
      "CONTRAST_TYPE_ANGIOGRAPHIC",
      "CONTRAST_TYPE_WITH",
      "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "CONTRAST_TYPE_NONE",
    ]);
  });

  it("seeds exactly 4 LATERALITY classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.LATERALITY).toBe(4);
    const codes = MRV_CLASSIFIER_FOUNDATION.filter((e) => e.domain === "LATERALITY").map((e) => e.code);
    expect(codes).toEqual([
      "LATERALITY_LEFT",
      "LATERALITY_RIGHT",
      "LATERALITY_BILATERAL",
      "LATERALITY_UNSPECIFIED",
    ]);
  });

  it("seeds exactly 36 ANATOMIC_SUBREGION classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.ANATOMIC_SUBREGION).toBe(36);
    expect(MRV_CLASSIFIER_FOUNDATION.filter((e) => e.domain === "ANATOMIC_SUBREGION")).toHaveLength(36);
  });

  it("seeds exactly 40 PROTOCOL classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.PROTOCOL).toBe(40);
    expect(MRV_CLASSIFIER_FOUNDATION.filter((e) => e.domain === "PROTOCOL")).toHaveLength(40);
  });

  it("does not seed CARE_LEVEL or UNIT_TYPE", () => {
    const domains = new Set(MRV_CLASSIFIER_FOUNDATION.map((e) => e.domain));
    expect(domains.has("CARE_LEVEL")).toBe(false);
    expect(domains.has("UNIT_TYPE")).toBe(false);
  });

  it("does not seed CONTRAST_TYPE_UNSPECIFIED", () => {
    expect(MRV_CLASSIFIER_FOUNDATION.some((e) => e.code === "CONTRAST_TYPE_UNSPECIFIED")).toBe(false);
  });

  it("maps GENOU alias to BODY_REGION_KNEE", () => {
    const knee = MRV_CLASSIFIER_FOUNDATION.find((e) => e.code === "BODY_REGION_KNEE");
    expect(knee?.aliases).toContain("GENOU");
  });

  it("contains exactly 61 S1 imaging classifiers", () => {
    const s1Domains = new Set(["MODALITY", "BODY_REGION", "VIEW_COUNT", "CONTRAST_TYPE"]);
    const count = MRV_CLASSIFIER_FOUNDATION.filter((e) => s1Domains.has(e.domain)).length;
    expect(count).toBe(61);
  });

  it("contains exactly 80 S2 imaging classifiers", () => {
    const s2Domains = new Set(["LATERALITY", "ANATOMIC_SUBREGION", "PROTOCOL"]);
    const count = MRV_CLASSIFIER_FOUNDATION.filter((e) => s2Domains.has(e.domain)).length;
    expect(count).toBe(80);
  });

  it("contains exactly 141 S1+S2 imaging classifiers", () => {
    const imagingDomains = new Set([
      "MODALITY",
      "BODY_REGION",
      "VIEW_COUNT",
      "CONTRAST_TYPE",
      "LATERALITY",
      "ANATOMIC_SUBREGION",
      "PROTOCOL",
    ]);
    const count = MRV_CLASSIFIER_FOUNDATION.filter((e) => imagingDomains.has(e.domain)).length;
    expect(count).toBe(141);
  });
});
