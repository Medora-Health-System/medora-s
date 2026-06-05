import { describe, expect, it } from "vitest";
import {
  isHaitiLegacyActiveCatalogCode,
  resolveWave4CatalogIsActiveForSeed,
} from "./wave4EnrichCatalogPreservation.js";

describe("wave4EnrichCatalogPreservation", () => {
  it("keeps Wave 4 CREATE catalogs inactive", () => {
    expect(
      resolveWave4CatalogIsActiveForSeed({
        mode: "CREATE",
        catalogCode: "NEW_WAVE4_ONLY_SKU",
        existingIsActive: undefined,
      })
    ).toBe(false);
  });

  it("preserves already-active legacy catalog on ENRICH", () => {
    expect(
      resolveWave4CatalogIsActiveForSeed({
        mode: "ENRICH",
        catalogCode: "CUSTOM_LEGACY_ACTIVE_CODE",
        existingIsActive: true,
      })
    ).toBe(true);
  });

  it("restores Haiti essential catalog deactivated by prior ENRICH", () => {
    expect(
      resolveWave4CatalogIsActiveForSeed({
        mode: "ENRICH",
        catalogCode: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
        existingIsActive: false,
      })
    ).toBe(true);
    expect(isHaitiLegacyActiveCatalogCode("REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS")).toBe(
      true
    );
  });

  it("does not activate non-Haiti inactive catalog on ENRICH", () => {
    expect(
      resolveWave4CatalogIsActiveForSeed({
        mode: "ENRICH",
        catalogCode: "WAVE4_ONLY_INACTIVE_SKU",
        existingIsActive: false,
      })
    ).toBe(false);
  });
});
