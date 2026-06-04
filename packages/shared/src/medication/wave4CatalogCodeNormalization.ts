/**
 * M1.7C.8 — Wave 4 ENRICH catalog-code normalization (prior-wave alias resolution).
 */

/** Explicit manifest → prior-wave catalog code aliases (single source of truth). */
export const WAVE4_ENRICH_CATALOG_CODE_ALIASES: Readonly<Record<string, string>> = {
  "BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE":
    "BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE",
};

/**
 * Tokenization normalization for strength segments (e.g. 0.5 → 0_5, drop _PER_).
 * Used as a fallback when explicit alias map does not apply.
 */
export function normalizeWave4CatalogCodeTokenization(catalogCode: string): string {
  return catalogCode.replace(/(\d)\.(\d)/g, "$1_$2").replace(/_PER_/g, "_");
}

/** Ordered lookup candidates for ENRICH catalog/product resolution (first match wins). */
export function resolveWave4EnrichCatalogLookupCandidates(manifestCatalogCode: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (code: string | null | undefined) => {
    const trimmed = code?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  add(manifestCatalogCode);
  add(WAVE4_ENRICH_CATALOG_CODE_ALIASES[manifestCatalogCode]);
  add(normalizeWave4CatalogCodeTokenization(manifestCatalogCode));

  return out;
}

/**
 * Resolve the canonical DB catalog code for an ENRICH manifest entry.
 * Returns the manifest code when no alias/token normalization applies.
 */
export function resolveWave4EnrichCatalogLookupCode(
  manifestCatalogCode: string,
  knownPriorWaveCodes?: ReadonlySet<string>
): string {
  const candidates = resolveWave4EnrichCatalogLookupCandidates(manifestCatalogCode);
  if (knownPriorWaveCodes) {
    for (const code of candidates) {
      if (knownPriorWaveCodes.has(code)) return code;
    }
  }
  return candidates[0] ?? manifestCatalogCode;
}
