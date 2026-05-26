/**
 * Phase 19Y.16A — French ICD-10 diagnosis search aliases (search-only; catalog labels stay English).
 */

import type { SupportedLanguage } from "@/i18n/config";
import type { Icd10SearchHit } from "@/lib/chartApi";

export type FrenchDiagnosisSearchAlias = {
  frenchPhrases: readonly string[];
  englishSearchTerms: readonly string[];
};

const FRENCH_DIAGNOSIS_SEARCH_ALIASES: readonly FrenchDiagnosisSearchAlias[] = [
  {
    frenchPhrases: ["douleur abdominale", "douleur au ventre", "mal au ventre", "douleur abdominal"],
    englishSearchTerms: ["abdominal pain"],
  },
  {
    frenchPhrases: ["douleur thoracique", "douleur poitrine"],
    englishSearchTerms: ["chest pain"],
  },
  {
    frenchPhrases: ["mal de tete", "cephalee", "céphalée"],
    englishSearchTerms: ["headache"],
  },
  {
    frenchPhrases: ["etourdissement", "vertige"],
    englishSearchTerms: ["dizziness"],
  },
  {
    frenchPhrases: ["essoufflement"],
    englishSearchTerms: ["shortness of breath"],
  },
  {
    frenchPhrases: ["toux"],
    englishSearchTerms: ["cough"],
  },
  {
    frenchPhrases: ["fievre", "fièvre"],
    englishSearchTerms: ["fever"],
  },
  {
    frenchPhrases: ["vomissement"],
    englishSearchTerms: ["vomiting"],
  },
  {
    frenchPhrases: ["diarrhee", "diarrhée"],
    englishSearchTerms: ["diarrhea"],
  },
  {
    frenchPhrases: ["infection urinaire"],
    englishSearchTerms: ["urinary tract infection", "UTI"],
  },
  {
    frenchPhrases: ["brulure urinaire", "brûlure urinaire"],
    englishSearchTerms: ["dysuria"],
  },
  {
    frenchPhrases: ["douleur dos"],
    englishSearchTerms: ["back pain"],
  },
  {
    frenchPhrases: ["douleur lombaire"],
    englishSearchTerms: ["low back pain"],
  },
  {
    frenchPhrases: ["palpitations"],
    englishSearchTerms: ["palpitations"],
  },
  {
    frenchPhrases: ["syncope"],
    englishSearchTerms: ["syncope"],
  },
  {
    frenchPhrases: ["faiblesse"],
    englishSearchTerms: ["weakness"],
  },
  {
    frenchPhrases: ["fatigue"],
    englishSearchTerms: ["fatigue"],
  },
  {
    frenchPhrases: ["hypertension"],
    englishSearchTerms: ["hypertension"],
  },
  {
    frenchPhrases: ["plaie"],
    englishSearchTerms: ["wound"],
  },
  {
    frenchPhrases: ["coupure"],
    englishSearchTerms: ["laceration"],
  },
  {
    frenchPhrases: ["entorse"],
    englishSearchTerms: ["sprain"],
  },
  {
    frenchPhrases: ["douleur cheville"],
    englishSearchTerms: ["ankle pain"],
  },
  {
    frenchPhrases: ["douleur genou"],
    englishSearchTerms: ["knee pain"],
  },
  {
    frenchPhrases: ["douleur epaule", "douleur épaule"],
    englishSearchTerms: ["shoulder pain"],
  },
];

/** Accent-insensitive, lowercase normalization for diagnosis search. */
export function normalizeDiagnosisSearchText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    return trimmed
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function getFrenchDiagnosisSearchAliases(): readonly FrenchDiagnosisSearchAlias[] {
  return FRENCH_DIAGNOSIS_SEARCH_ALIASES;
}

type AliasMatch = {
  alias: FrenchDiagnosisSearchAlias;
  phrase: string;
  score: number;
};

function scoreFrenchPhraseMatch(normalizedQuery: string, normalizedPhrase: string): number {
  if (!normalizedQuery || !normalizedPhrase) return 0;
  if (normalizedPhrase === normalizedQuery) return 1000 + normalizedPhrase.length;
  if (normalizedPhrase.startsWith(normalizedQuery)) return 800 + normalizedQuery.length;
  if (normalizedQuery.startsWith(normalizedPhrase)) return 700 + normalizedPhrase.length;
  if (normalizedPhrase.includes(normalizedQuery)) return 500 + normalizedQuery.length;
  if (normalizedQuery.includes(normalizedPhrase)) return 400 + normalizedPhrase.length;
  return 0;
}

function findFrenchAliasMatches(normalizedQuery: string): AliasMatch[] {
  if (normalizedQuery.length < 2) return [];
  const matches: AliasMatch[] = [];
  for (const alias of FRENCH_DIAGNOSIS_SEARCH_ALIASES) {
    for (const phrase of alias.frenchPhrases) {
      const normalizedPhrase = normalizeDiagnosisSearchText(phrase);
      const score = scoreFrenchPhraseMatch(normalizedQuery, normalizedPhrase);
      if (score > 0) {
        matches.push({ alias, phrase, score });
      }
    }
  }
  matches.sort((a, b) => b.score - a.score || b.phrase.length - a.phrase.length);
  return matches;
}

/** Resolve French UI query to English ICD catalog search term(s). Returns empty when locale is not fr. */
export function resolveLocalizedDiagnosisSearchQueries(
  query: string,
  locale: SupportedLanguage
): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (locale !== "fr") return [trimmed];

  const normalizedQuery = normalizeDiagnosisSearchText(trimmed);
  const matches = findFrenchAliasMatches(normalizedQuery);
  if (!matches.length) return [trimmed];

  const terms: string[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    for (const term of match.alias.englishSearchTerms) {
      const key = normalizeDiagnosisSearchText(term);
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push(term);
    }
  }
  return terms.length ? terms : [trimmed];
}

/** Primary English catalog query for a localized diagnosis search (first alias hit). */
export function resolveLocalizedDiagnosisSearchQuery(query: string, locale: SupportedLanguage): string {
  return resolveLocalizedDiagnosisSearchQueries(query, locale)[0] ?? query.trim();
}

function diagnosisEnglishHaystack(diagnosis: Pick<Icd10SearchHit, "code" | "shortDescription" | "longDescription">): string {
  return normalizeDiagnosisSearchText(
    [diagnosis.code, diagnosis.shortDescription, diagnosis.longDescription ?? ""].join(" ")
  );
}

function diagnosisMatchesEnglishTerms(
  diagnosis: Pick<Icd10SearchHit, "code" | "shortDescription" | "longDescription">,
  englishTerms: readonly string[]
): boolean {
  const haystack = diagnosisEnglishHaystack(diagnosis);
  return englishTerms.some((term) => {
    const needle = normalizeDiagnosisSearchText(term);
    return needle.length >= 2 && haystack.includes(needle);
  });
}

/** Client-side match for catalog hits against a localized query (French aliases → English labels). */
export function diagnosisMatchesLocalizedSearch(
  diagnosis: Pick<Icd10SearchHit, "code" | "shortDescription" | "longDescription">,
  query: string,
  locale: SupportedLanguage
): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 2) return false;

  const normalizedQuery = normalizeDiagnosisSearchText(trimmed);
  const haystack = diagnosisEnglishHaystack(diagnosis);

  if (haystack.includes(normalizedQuery)) return true;

  if (locale !== "fr") return false;

  const matches = findFrenchAliasMatches(normalizedQuery);
  if (!matches.length) return false;

  const englishTerms = matches.flatMap((m) => m.alias.englishSearchTerms);
  return diagnosisMatchesEnglishTerms(diagnosis, englishTerms);
}
