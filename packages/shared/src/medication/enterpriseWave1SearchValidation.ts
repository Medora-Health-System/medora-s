/**
 * M1.6B — Enterprise Wave 1 search / alias validation.
 */

import type { EnterpriseWave1FormularyEntry } from "./enterpriseWave1Types.js";

export type Wave1SearchCatalogHit = {
  catalogCode: string;
  genericName: string | null;
  aliases: string[];
};

export type Wave1SearchPair = {
  generic: string;
  brand: string;
};

export const ENTERPRISE_WAVE1_REQUIRED_SEARCH_PAIRS: Wave1SearchPair[] = [
  { generic: "warfarin", brand: "coumadin" },
  { generic: "enoxaparin", brand: "lovenox" },
  { generic: "apixaban", brand: "eliquis" },
  { generic: "rivaroxaban", brand: "xarelto" },
  { generic: "dabigatran", brand: "pradaxa" },
  { generic: "furosemide", brand: "lasix" },
  { generic: "ceftriaxone", brand: "rocephin" },
  { generic: "lorazepam", brand: "ativan" },
  { generic: "ondansetron", brand: "zofran" },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function catalogMatchesQuery(catalog: Wave1SearchCatalogHit, query: string): boolean {
  const q = normalize(query);
  if ((catalog.genericName ?? "").toLowerCase().includes(q)) return true;
  return catalog.aliases.some((a) => normalize(a).includes(q) || q.includes(normalize(a)));
}

export function validateWave1SearchPair(
  catalogs: Wave1SearchCatalogHit[],
  pair: Wave1SearchPair
): { pass: boolean; genericHits: number; brandHits: number } {
  const genericHits = catalogs.filter((c) => catalogMatchesQuery(c, pair.generic)).length;
  const brandHits = catalogs.filter((c) => catalogMatchesQuery(c, pair.brand)).length;
  return {
    pass: genericHits > 0 && brandHits > 0,
    genericHits,
    brandHits,
  };
}

export function validateWave1EntrySearchReady(
  entry: EnterpriseWave1FormularyEntry,
  catalog: Wave1SearchCatalogHit | null
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!catalog) {
    failures.push("catalog row missing for search");
    return { pass: false, failures };
  }
  for (const term of entry.searchTerms) {
    if (!catalogMatchesQuery(catalog, term) && !catalogMatchesQuery(catalog, entry.genericName)) {
      failures.push(`search term not indexed: ${term}`);
    }
  }
  for (const alias of entry.aliases) {
    const found = catalog.aliases.some((a) => normalize(a) === normalize(alias));
    if (!found) {
      failures.push(`alias not persisted: ${alias}`);
    }
  }
  return { pass: failures.length === 0, failures };
}

export function computeWave1SearchReadinessScore(
  catalogs: Wave1SearchCatalogHit[],
  wave1CatalogCodes: Set<string>
): number {
  const wave1Catalogs = catalogs.filter((c) => wave1CatalogCodes.has(c.catalogCode));
  const pairResults = ENTERPRISE_WAVE1_REQUIRED_SEARCH_PAIRS.map((p) =>
    validateWave1SearchPair(wave1Catalogs, p)
  );
  const pairPass = pairResults.filter((r) => r.pass).length;
  const pairScore = Math.round((pairPass / ENTERPRISE_WAVE1_REQUIRED_SEARCH_PAIRS.length) * 100);
  const aliasScore =
    wave1Catalogs.length === 0
      ? 0
      : Math.round(
          (wave1Catalogs.filter((c) => c.aliases.length > 0).length / wave1Catalogs.length) * 100
        );
  return Math.round((pairScore + aliasScore) / 2);
}
