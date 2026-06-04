/**
 * M1.7C — Enterprise Wave 4 ED/Hospital search / alias validation.
 */

import type { EnterpriseWave4EdHospitalFormularyEntry } from "./enterpriseWave4EdHospitalTypes.js";
import type { MedicationLocalizationAlias } from "./medicationLocalizationTypes.js";

export type Wave4SearchCatalogHit = {
  catalogCode: string;
  genericName: string | null;
  aliases: MedicationLocalizationAlias[] | string[];
  searchText?: string | null;
  searchTerms?: string[];
};

/** M1.7C.2 — aliases that must never appear on Wave 4 entries (LASA / ambiguity risk). */
export const WAVE4_DANGEROUS_ALIAS_EXACT = new Set(["ms", "u", "ntg"]);

/** M1.7C.2 — abbreviations allowed only on specific generic families. */
export const WAVE4_SCOPED_ABBREV_RULES: ReadonlyArray<{
  abbrev: string;
  allowedGenericSubstrings: string[];
}> = [
  { abbrev: "tpa", allowedGenericSubstrings: ["alteplase", "tenecteplase"] },
  { abbrev: "mgso4", allowedGenericSubstrings: ["magnesium"] },
  { abbrev: "kcl", allowedGenericSubstrings: ["potassium"] },
];

/** M1.7C.2 — safe ED shorthand aliases that must remain indexed. */
export const WAVE4_PRESERVED_SAFE_ALIASES = [
  "dilaudid",
  "versed",
  "roc",
  "zosyn",
  "vanc",
  "levophed",
] as const;

export type Wave4SearchPair = {
  generic: string;
  brand: string;
  catalogCode?: string;
};

export const ENTERPRISE_WAVE4_ED_HOSPITAL_REQUIRED_SEARCH_PAIRS: Wave4SearchPair[] = [
  { generic: "hydromorphone", brand: "dilaudid" },
  { generic: "midazolam", brand: "versed" },
  { generic: "norepinephrine", brand: "levophed" },
  { generic: "rocuronium", brand: "roc" },
  { generic: "succinylcholine", brand: "succs" },
  { generic: "piperacillin tazobactam", brand: "zosyn" },
  { generic: "vancomycin", brand: "vanc" },
  { generic: "alteplase", brand: "tpa" },
  { generic: "fentanyl", brand: "sublimaze" },
  { generic: "ketamine", brand: "ketalar" },
  { generic: "propofol", brand: "diprivan" },
  { generic: "epinephrine", brand: "adrenaline" },
  { generic: "naloxone", brand: "narcan" },
  { generic: "amiodarone", brand: "cordarone" },
  { generic: "heparin", brand: "heparin drip" },
  { generic: "lorazépam", brand: "ativan" },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function aliasTexts(catalog: Wave4SearchCatalogHit): string[] {
  const raw = catalog.aliases ?? [];
  if (raw.length === 0) return [];
  if (typeof raw[0] === "string") return raw as string[];
  return (raw as MedicationLocalizationAlias[]).map((a) => a.text);
}

function catalogMatchesQuery(catalog: Wave4SearchCatalogHit, query: string): boolean {
  const q = normalize(query);
  if ((catalog.genericName ?? "").toLowerCase().includes(q)) return true;
  if ((catalog.searchText ?? "").toLowerCase().includes(q)) return true;
  if (catalog.searchTerms?.some((t) => normalize(t).includes(q) || q.includes(normalize(t)))) {
    return true;
  }
  return aliasTexts(catalog).some((a) => normalize(a).includes(q) || q.includes(normalize(a)));
}

export function validateWave4SearchPair(
  catalogs: Wave4SearchCatalogHit[],
  pair: Wave4SearchPair
): { pass: boolean; genericHits: number; brandHits: number } {
  const scoped = pair.catalogCode
    ? catalogs.filter((c) => c.catalogCode === pair.catalogCode)
    : catalogs;
  const genericHits = scoped.filter((c) => catalogMatchesQuery(c, pair.generic)).length;
  const brandHits = scoped.filter((c) => catalogMatchesQuery(c, pair.brand)).length;
  return { pass: genericHits > 0 && brandHits > 0, genericHits, brandHits };
}

export function validateWave4EntrySearchReady(
  entry: EnterpriseWave4EdHospitalFormularyEntry,
  catalog: Wave4SearchCatalogHit | null
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

export function computeWave4SearchReadinessScore(
  catalogs: Wave4SearchCatalogHit[],
  wave4CatalogCodes: Set<string>
): number {
  const wave4Catalogs = catalogs.filter((c) => wave4CatalogCodes.has(c.catalogCode));
  const pairResults = ENTERPRISE_WAVE4_ED_HOSPITAL_REQUIRED_SEARCH_PAIRS.map((p) =>
    validateWave4SearchPair(wave4Catalogs, p)
  );
  const pairPass = pairResults.filter((r) => r.pass).length;
  return Math.round((pairPass / ENTERPRISE_WAVE4_ED_HOSPITAL_REQUIRED_SEARCH_PAIRS.length) * 100);
}

export function isWave4DangerousAlias(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return WAVE4_DANGEROUS_ALIAS_EXACT.has(normalized);
}

/** Reject dangerous bare aliases (MS, U, NTG). */
export function validateWave4DangerousAliases(
  entries: EnterpriseWave4EdHospitalFormularyEntry[]
): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      if (isWave4DangerousAlias(alias.text)) {
        errors.push(`${entry.catalogCode}: dangerous alias "${alias.text}"`);
      }
    }
    for (const term of entry.searchTerms) {
      if (isWave4DangerousAlias(term)) {
        errors.push(`${entry.catalogCode}: dangerous search term "${term}"`);
      }
    }
  }
  return errors;
}

/** Scoped abbreviations (tPA, MgSO4, KCl) must not appear on unrelated generics. */
export function validateWave4ScopedAbbrevAliases(
  entries: EnterpriseWave4EdHospitalFormularyEntry[]
): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    const generic = entry.genericName.trim().toLowerCase();
    const texts = [
      ...entry.aliases.map((a) => a.text.trim().toLowerCase()),
      ...entry.searchTerms.map((t) => t.trim().toLowerCase()),
    ];
    for (const rule of WAVE4_SCOPED_ABBREV_RULES) {
      for (const text of texts) {
        if (text !== rule.abbrev && !text.replace(/\s/g, "").includes(rule.abbrev)) continue;
        if (!rule.allowedGenericSubstrings.some((hint) => generic.includes(hint))) {
          errors.push(
            `${entry.catalogCode}: scoped alias "${text}" requires generic ${rule.allowedGenericSubstrings.join(" or ")}`
          );
        }
      }
    }
  }
  return errors;
}

/** Levofloxacin must not match Levophed-style queries or carry bare "levo" alias. */
export function validateWave4LevophedLevofloxacinCollision(
  catalogs: Wave4SearchCatalogHit[]
): string[] {
  const errors: string[] = [];
  for (const catalog of catalogs) {
    const generic = (catalog.genericName ?? "").toLowerCase();
    if (!generic.includes("levofloxacin")) continue;
    if (catalogMatchesQuery(catalog, "levophed")) {
      errors.push(`${catalog.catalogCode}: levofloxacin collides with levophed query`);
    }
    const texts = aliasTexts(catalog);
    if (texts.some((a) => a.trim().toLowerCase() === "levo")) {
      errors.push(`${catalog.catalogCode}: levofloxacin must not use bare "levo" alias`);
    }
  }
  const norepiHits = catalogs.filter(
    (c) =>
      (c.genericName ?? "").toLowerCase().includes("norepinephrine") &&
      catalogMatchesQuery(c, "levophed")
  );
  if (norepiHits.length === 0) {
    errors.push("norepinephrine: missing Levophed search index");
  }
  return errors;
}

/** Ensure preserved safe aliases remain indexed on Wave 4 entries. */
export function validateWave4PreservedSafeAliases(
  catalogs: Wave4SearchCatalogHit[]
): string[] {
  const errors: string[] = [];
  for (const alias of WAVE4_PRESERVED_SAFE_ALIASES) {
    const hits = catalogs.filter((c) => catalogMatchesQuery(c, alias));
    if (hits.length === 0) {
      errors.push(`safe alias not indexed: ${alias}`);
    }
  }
  return errors;
}

export function validateWave4SearchHardening(
  entries: EnterpriseWave4EdHospitalFormularyEntry[]
): string[] {
  const catalogs: Wave4SearchCatalogHit[] = entries.map((e) => ({
    catalogCode: e.catalogCode,
    genericName: e.genericName,
    aliases: e.aliases,
    searchTerms: e.searchTerms,
    searchText: e.searchTerms.join(" "),
  }));
  return [
    ...validateWave4DangerousAliases(entries),
    ...validateWave4ScopedAbbrevAliases(entries),
    ...validateWave4LevophedLevofloxacinCollision(catalogs),
    ...validateWave4PreservedSafeAliases(catalogs),
  ];
}
