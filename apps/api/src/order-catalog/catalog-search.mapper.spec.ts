import {
  buildImagingClassifierMetaLine,
  resolveLabCategoryDisplay,
} from "../terminology/resolve-classifier-catalog-meta.util";
import { mapImagingRowToCatalogSearchItem, mapLabRowToCatalogSearchItem } from "./catalog-search.mapper";

describe("catalog-search.mapper dual-read", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.TERMINOLOGY_READ_CLASSIFIER;
  });

  afterAll(() => {
    process.env = env;
  });

  it("returns legacy imaging meta when read flag off", () => {
    const item = mapImagingRowToCatalogSearchItem({
      id: "1",
      code: "XR_KNEE",
      name: "Genou",
      displayNameFr: "Radiographie du genou",
      displayNameEn: "Knee X-ray",
      modality: "XR",
      bodyRegion: "GENOU",
      searchText: null,
    });
    expect(item.secondaryText).toContain("XR");
    expect(item.secondaryText).toContain("GENOU");
  });

  it("returns classifier imaging meta when read flag on and labels present", () => {
    process.env.TERMINOLOGY_READ_CLASSIFIER = "true";
    const item = mapImagingRowToCatalogSearchItem({
      id: "1",
      code: "XR_KNEE",
      name: "Genou",
      displayNameFr: "Radiographie du genou",
      displayNameEn: "Knee X-ray",
      modality: "XR",
      bodyRegion: "GENOU",
      searchText: null,
      modalityClassifier: { labels: [{ locale: "fr", displayName: "Radiographie" }] },
      bodyRegionClassifier: { labels: [{ locale: "fr", displayName: "Genou" }] },
    });
    expect(item.secondaryText).toContain("Radiographie");
    expect(item.secondaryText).toContain("Genou");
    expect(item.secondaryText).not.toContain("GENOU");
    expect(item.secondaryTextFr).toContain("Radiographie");
    expect(item.secondaryTextEn).not.toContain("Radiographie");
    expect(item.secondaryTextEn).toContain("XR");
  });

  it("falls back to legacy imaging meta when read flag on but classifier missing", () => {
    process.env.TERMINOLOGY_READ_CLASSIFIER = "true";
    expect(
      buildImagingClassifierMetaLine({ modality: "CT", bodyRegion: "THORAX", modalityClassifier: null, bodyRegionClassifier: null }, "en")
    ).toBe("CT · THORAX");
  });

  it("returns classifier lab category when read flag on", () => {
    process.env.TERMINOLOGY_READ_CLASSIFIER = "true";
    const item = mapLabRowToCatalogSearchItem({
      id: "1",
      code: "CBC",
      name: "NFS",
      displayNameFr: "NFS",
      displayNameEn: "CBC",
      description: "Catégorie : HEMATOLOGIE",
      searchText: null,
      billingCodeDefault: null,
      labCategoryClassifier: { labels: [{ locale: "fr", displayName: "Hématologie" }] },
    });
    expect(item.secondaryText).toContain("Hématologie");
    expect(item.secondaryTextFr).toContain("Hématologie");
    expect(item.secondaryTextEn).not.toContain("Hématologie");
  });
});
