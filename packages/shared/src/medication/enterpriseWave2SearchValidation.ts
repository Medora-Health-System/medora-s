/**
 * M1.6D — Enterprise Wave 2 search / alias validation (M1.6C rules).
 */

import type { EnterpriseWave2FormularyEntry } from "./enterpriseWave2Types.js";

export type Wave2SearchCatalogHit = {
  catalogCode: string;
  genericName: string | null;
  aliases: string[];
  searchText?: string | null;
};

export type Wave2SearchPair = {
  generic: string;
  brand: string;
  catalogCode?: string;
};

export const ENTERPRISE_WAVE2_REQUIRED_SEARCH_PAIRS: Wave2SearchPair[] = [
  { generic: "atenolol", brand: "tenormin", catalogCode: "ATENOLOL_50_MG_COMPRIME_ORAL" },
  { generic: "clopidogrel", brand: "plavix", catalogCode: "CLOPIDOGREL_75_MG_COMPRIME_ORAL" },
  { generic: "insulin glargine", brand: "lantus" },
  { generic: "insulin lispro", brand: "humalog" },
  { generic: "glyburide", brand: "diabeta" },
  { generic: "sitagliptin", brand: "januvia" },
  { generic: "salbutamol", brand: "ventolin", catalogCode: "SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALATION" },
  { generic: "albuterol", brand: "ventolin", catalogCode: "SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALATION" },
  { generic: "montelukast", brand: "singulair" },
  { generic: "fluticasone", brand: "flovent" },
  { generic: "sucralfate", brand: "carafate" },
  { generic: "mesalamine", brand: "asacol" },
  { generic: "quetiapine", brand: "seroquel" },
  { generic: "aripiprazole", brand: "abilify" },
  { generic: "ceftriaxone", brand: "rocephin", catalogCode: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION" },
  { generic: "vancomycin", brand: "vancocin", catalogCode: "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS" },
  { generic: "naloxone", brand: "narcan", catalogCode: "NALOXONE_0.4MG_ML" },
  { generic: "epinephrine", brand: "epipen", catalogCode: "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION" },
  { generic: "bisoprolol", brand: "zebeta" },
  { generic: "pravastatin", brand: "pravachol" },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function catalogMatchesQuery(catalog: Wave2SearchCatalogHit, query: string): boolean {
  const q = normalize(query);
  if ((catalog.genericName ?? "").toLowerCase().includes(q)) return true;
  if ((catalog.searchText ?? "").toLowerCase().includes(q)) return true;
  return catalog.aliases.some((a) => normalize(a).includes(q) || q.includes(normalize(a)));
}

export function validateWave2SearchPair(
  catalogs: Wave2SearchCatalogHit[],
  pair: Wave2SearchPair
): { pass: boolean; genericHits: number; brandHits: number } {
  const scoped = pair.catalogCode
    ? catalogs.filter((c) => c.catalogCode === pair.catalogCode)
    : catalogs;
  const genericHits = scoped.filter((c) => catalogMatchesQuery(c, pair.generic)).length;
  const brandHits = scoped.filter((c) => catalogMatchesQuery(c, pair.brand)).length;
  return { pass: genericHits > 0 && brandHits > 0, genericHits, brandHits };
}

export function validateWave2EntrySearchReady(
  entry: EnterpriseWave2FormularyEntry,
  catalog: Wave2SearchCatalogHit | null
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
    if (!catalog.aliases.some((a) => normalize(a) === normalize(alias))) {
      failures.push(`alias not persisted: ${alias}`);
    }
  }
  return { pass: failures.length === 0, failures };
}

export function computeWave2SearchReadinessScore(
  catalogs: Wave2SearchCatalogHit[],
  wave2CatalogCodes: Set<string>
): number {
  const wave2Catalogs = catalogs.filter((c) => wave2CatalogCodes.has(c.catalogCode));
  const pairResults = ENTERPRISE_WAVE2_REQUIRED_SEARCH_PAIRS.map((p) =>
    validateWave2SearchPair(wave2Catalogs, p)
  );
  const pairPass = pairResults.filter((r) => r.pass).length;
  const pairScore = Math.round((pairPass / ENTERPRISE_WAVE2_REQUIRED_SEARCH_PAIRS.length) * 100);
  const aliasScore =
    wave2Catalogs.length === 0
      ? 0
      : Math.round(
          (wave2Catalogs.filter((c) => c.aliases.length > 0).length / wave2Catalogs.length) * 100
        );
  return Math.round(pairScore * 0.6 + aliasScore * 0.4);
}
