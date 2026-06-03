/**
 * M1.7B — Enterprise Wave 3 search / alias validation.
 */

import type { EnterpriseWave3FormularyEntry } from "./enterpriseWave3Types.js";
import type { MedicationLocalizationAlias } from "./medicationLocalizationTypes.js";

export type Wave3SearchCatalogHit = {
  catalogCode: string;
  genericName: string | null;
  aliases: MedicationLocalizationAlias[] | string[];
  searchText?: string | null;
  searchTerms?: string[];
};

export type Wave3SearchPair = {
  generic: string;
  brand: string;
  catalogCode?: string;
};

export const ENTERPRISE_WAVE3_REQUIRED_SEARCH_PAIRS: Wave3SearchPair[] = [
  { generic: "sevelamer", brand: "renvela" },
  { generic: "methotrexate", brand: "trexall" },
  { generic: "hydroxychloroquine", brand: "plaquenil" },
  { generic: "lamotrigine", brand: "lamictal" },
  { generic: "sertraline", brand: "zoloft" },
  { generic: "fluoxetine", brand: "prozac" },
  { generic: "semaglutide", brand: "ozempic" },
  { generic: "empagliflozin", brand: "jardiance" },
  { generic: "budesonide formoterol", brand: "symbicort" },
  { generic: "tiotropium", brand: "spiriva" },
  { generic: "clobetasol", brand: "temovate" },
  { generic: "mupirocin", brand: "bactroban" },
  { generic: "insulin detemir", brand: "levemir" },
  { generic: "insulin aspart", brand: "novolog" },
  { generic: "sémaglutide", brand: "ozempic" },
  { generic: "sévélamer", brand: "renvela" },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function aliasTexts(catalog: Wave3SearchCatalogHit): string[] {
  const raw = catalog.aliases ?? [];
  if (raw.length === 0) return [];
  if (typeof raw[0] === "string") return raw as string[];
  return (raw as MedicationLocalizationAlias[]).map((a) => a.text);
}

function catalogMatchesQuery(catalog: Wave3SearchCatalogHit, query: string): boolean {
  const q = normalize(query);
  if ((catalog.genericName ?? "").toLowerCase().includes(q)) return true;
  if ((catalog.searchText ?? "").toLowerCase().includes(q)) return true;
  if (catalog.searchTerms?.some((t) => normalize(t).includes(q) || q.includes(normalize(t)))) {
    return true;
  }
  return aliasTexts(catalog).some((a) => normalize(a).includes(q) || q.includes(normalize(a)));
}

export function validateWave3SearchPair(
  catalogs: Wave3SearchCatalogHit[],
  pair: Wave3SearchPair
): { pass: boolean; genericHits: number; brandHits: number } {
  const scoped = pair.catalogCode
    ? catalogs.filter((c) => c.catalogCode === pair.catalogCode)
    : catalogs;
  const genericHits = scoped.filter((c) => catalogMatchesQuery(c, pair.generic)).length;
  const brandHits = scoped.filter((c) => catalogMatchesQuery(c, pair.brand)).length;
  return { pass: genericHits > 0 && brandHits > 0, genericHits, brandHits };
}

export function validateWave3EntrySearchReady(
  entry: EnterpriseWave3FormularyEntry,
  catalog: Wave3SearchCatalogHit | null
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
    const texts = aliasTexts(catalog);
    if (!texts.some((a) => normalize(a) === normalize(alias.text))) {
      failures.push(`alias not persisted: ${alias.text} (${alias.language})`);
    }
  }
  return { pass: failures.length === 0, failures };
}

export function computeWave3SearchReadinessScore(
  catalogs: Wave3SearchCatalogHit[],
  wave3CatalogCodes: Set<string>
): number {
  const wave3Catalogs = catalogs.filter((c) => wave3CatalogCodes.has(c.catalogCode));
  const pairResults = ENTERPRISE_WAVE3_REQUIRED_SEARCH_PAIRS.map((p) =>
    validateWave3SearchPair(wave3Catalogs, p)
  );
  const pairPass = pairResults.filter((r) => r.pass).length;
  return Math.round((pairPass / ENTERPRISE_WAVE3_REQUIRED_SEARCH_PAIRS.length) * 100);
}
