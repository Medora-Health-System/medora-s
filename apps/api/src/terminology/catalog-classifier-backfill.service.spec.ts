import {
  BODY_REGION_LEGACY_TO_CLASSIFIER,
  CONTRAST_CATALOG_CODE_TO_CLASSIFIER,
  CONTRAST_INTENTIONAL_NULL_IMAGING_CODES,
  LAB_CATEGORY_LEGACY_TO_CLASSIFIER,
  parseLabCategoryFromDescription,
} from "./catalog-classifier-backfill-map";
import {
  planFieldBackfill,
  resolveClassifierId,
  runCatalogClassifierBackfill,
} from "./catalog-classifier-backfill.service";

describe("catalog-classifier-backfill maps", () => {
  it("maps GENOU to BODY_REGION_KNEE", () => {
    expect(BODY_REGION_LEGACY_TO_CLASSIFIER.GENOU).toBe("BODY_REGION_KNEE");
  });

  it("maps EPAULE to BODY_REGION_SHOULDER", () => {
    expect(BODY_REGION_LEGACY_TO_CLASSIFIER.EPAULE).toBe("BODY_REGION_SHOULDER");
  });

  it("maps THORAX to BODY_REGION_CHEST", () => {
    expect(BODY_REGION_LEGACY_TO_CLASSIFIER.THORAX).toBe("BODY_REGION_CHEST");
  });

  it("maps HEMATOLOGIE to LAB_CATEGORY_HEMATOLOGY", () => {
    expect(LAB_CATEGORY_LEGACY_TO_CLASSIFIER.HEMATOLOGIE).toBe("LAB_CATEGORY_HEMATOLOGY");
  });

  it("maps BIOCHIMIE to LAB_CATEGORY_CHEMISTRY", () => {
    expect(LAB_CATEGORY_LEGACY_TO_CLASSIFIER.BIOCHIMIE).toBe("LAB_CATEGORY_CHEMISTRY");
  });

  it("maps CTA_CHEST to CONTRAST_TYPE_ANGIOGRAPHIC", () => {
    expect(CONTRAST_CATALOG_CODE_TO_CLASSIFIER.CTA_CHEST).toBe("CONTRAST_TYPE_ANGIOGRAPHIC");
  });

  it("maps CT_HEAD_WO_CONTRAST to CONTRAST_TYPE_WITHOUT", () => {
    expect(CONTRAST_CATALOG_CODE_TO_CLASSIFIER.CT_HEAD_WO_CONTRAST).toBe("CONTRAST_TYPE_WITHOUT");
  });

  it("lists intentional null contrast codes (4 rows)", () => {
    expect(CONTRAST_INTENTIONAL_NULL_IMAGING_CODES).toEqual([
      "CT_HEAD",
      "CT_ABD",
      "CT_CHEST_ABDOMEN_PELVIS_TRAUMA",
      "MRI_SPINE",
    ]);
    expect(CONTRAST_CATALOG_CODE_TO_CLASSIFIER.CT_HEAD).toBeUndefined();
    expect(CONTRAST_CATALOG_CODE_TO_CLASSIFIER.CT_CHEST).toBe("CONTRAST_TYPE_WITHOUT");
  });
});

describe("planFieldBackfill", () => {
  it("returns APPLIED when FK differs", () => {
    const r = planFieldBackfill(null, "id-2");
    expect(r.status).toBe("APPLIED");
    expect(r.classifierId).toBe("id-2");
  });

  it("returns SKIPPED when target missing", () => {
    expect(planFieldBackfill(null, null).status).toBe("SKIPPED");
  });
});

describe("parseLabCategoryFromDescription", () => {
  it("parses Catégorie prefix", () => {
    expect(parseLabCategoryFromDescription("Catégorie : HEMATOLOGIE")).toBe("HEMATOLOGIE");
  });
});

describe("runCatalogClassifierBackfill gating", () => {
  it("does not run when TERMINOLOGY_BACKFILL_ENABLED is false", async () => {
    const summary = await runCatalogClassifierBackfill({} as never);
    expect(summary.runId).toBe("");
    expect(summary.applied).toBe(0);
  });
});
