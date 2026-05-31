import {
  MRV_CLASSIFIER_DOMAIN_COUNTS,
  MRV_CLASSIFIER_FOUNDATION,
} from "../../prisma/data/mrv-classifier-foundation";

describe("mrv-classifier-foundation manifest", () => {
  it("seeds exactly 28 BODY_REGION classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.BODY_REGION).toBe(28);
    expect(MRV_CLASSIFIER_FOUNDATION.filter((e) => e.domain === "BODY_REGION")).toHaveLength(28);
  });

  it("seeds exactly 4 MODALITY classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.MODALITY).toBe(4);
  });

  it("seeds exactly 16 LAB_CATEGORY classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.LAB_CATEGORY).toBe(16);
  });

  it("seeds exactly 1 VIEW_COUNT classifier", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.VIEW_COUNT).toBe(1);
  });

  it("seeds exactly 2 CONTRAST_TYPE classifiers", () => {
    expect(MRV_CLASSIFIER_DOMAIN_COUNTS.CONTRAST_TYPE).toBe(2);
    const codes = MRV_CLASSIFIER_FOUNDATION.filter((e) => e.domain === "CONTRAST_TYPE").map((e) => e.code);
    expect(codes).toEqual(["CONTRAST_TYPE_WITHOUT", "CONTRAST_TYPE_ANGIOGRAPHIC"]);
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
});
