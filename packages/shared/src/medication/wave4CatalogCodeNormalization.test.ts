import { describe, expect, it } from "vitest";
import {
  WAVE4_ENRICH_CATALOG_CODE_ALIASES,
  normalizeWave4CatalogCodeTokenization,
  resolveWave4EnrichCatalogLookupCandidates,
  resolveWave4EnrichCatalogLookupCode,
} from "./wave4CatalogCodeNormalization.js";

describe("wave4CatalogCodeNormalization (M1.7C.8)", () => {
  it("maps Budesonide Wave 4 manifest code to Wave 3 canonical code", () => {
    const manifest = "BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE";
    const canonical = "BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE";
    expect(WAVE4_ENRICH_CATALOG_CODE_ALIASES[manifest]).toBe(canonical);
    expect(normalizeWave4CatalogCodeTokenization(manifest)).toBe(canonical);
    expect(resolveWave4EnrichCatalogLookupCandidates(manifest)).toEqual([
      manifest,
      canonical,
    ]);
  });

  it("resolves canonical code when prior-wave set contains alias target", () => {
    const manifest = "BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE";
    const prior = new Set(["BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE"]);
    expect(resolveWave4EnrichCatalogLookupCode(manifest, prior)).toBe(
      "BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE"
    );
  });

  it("leaves exact-match ENRICH codes unchanged for primary lookup", () => {
    const code = "ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION";
    const candidates = resolveWave4EnrichCatalogLookupCandidates(code);
    expect(candidates[0]).toBe(code);
    expect(resolveWave4EnrichCatalogLookupCode(code)).toBe(code);
  });
});
