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
    frenchPhrases: ["morsure", "morsure animale"],
    englishSearchTerms: ["animal bite", "bite"],
  },
  {
    frenchPhrases: ["morsure de chien"],
    englishSearchTerms: ["dog bite", "bitten by dog"],
  },
  {
    frenchPhrases: ["morsure de chat"],
    englishSearchTerms: ["cat bite", "bitten by cat"],
  },
  {
    frenchPhrases: ["morsure humaine"],
    englishSearchTerms: ["human bite"],
  },
  {
    frenchPhrases: ["plaie par morsure", "plaie perforante"],
    englishSearchTerms: ["bite wound", "puncture wound", "open bite"],
  },
  {
    frenchPhrases: ["fracture", "os cassé", "os casse"],
    englishSearchTerms: ["fracture", "broken bone"],
  },
  {
    frenchPhrases: ["bras cassé", "bras casse", "fracture du bras"],
    englishSearchTerms: ["broken arm", "arm fracture", "fracture"],
  },
  {
    frenchPhrases: ["poignet cassé", "poignet casse", "fracture du poignet"],
    englishSearchTerms: ["broken wrist", "wrist fracture", "distal radius fracture", "colles fracture"],
  },
  {
    frenchPhrases: ["hanche cassée", "hanche cassee", "fracture de la hanche", "fracture du col du fémur", "fracture du col du femur"],
    englishSearchTerms: ["broken hip", "hip fracture", "femoral neck fracture"],
  },
  {
    frenchPhrases: ["jambe cassée", "jambe cassee", "fracture de la jambe"],
    englishSearchTerms: ["broken leg", "tibia fracture", "leg fracture"],
  },
  {
    frenchPhrases: ["cheville cassée", "cheville cassee", "fracture de la cheville"],
    englishSearchTerms: ["broken ankle", "ankle fracture"],
  },
  {
    frenchPhrases: ["doigt cassé", "doigt casse", "fracture du doigt"],
    englishSearchTerms: ["broken finger", "finger fracture", "phalanx fracture"],
  },
  {
    frenchPhrases: ["orteil cassé", "orteil casse", "fracture de l'orteil"],
    englishSearchTerms: ["broken toe", "toe fracture"],
  },
  {
    frenchPhrases: ["fracture ouverte", "fracture composée", "fracture composee"],
    englishSearchTerms: ["open fracture", "compound fracture"],
  },
  {
    frenchPhrases: ["fracture de stress", "fracture pathologique"],
    englishSearchTerms: ["stress fracture", "pathologic fracture", "pathological fracture"],
  },
  {
    frenchPhrases: ["fracture en bois vert", "fracture en torus", "fracture pédiatrique", "fracture pediatrique"],
    englishSearchTerms: ["greenstick fracture", "buckle fracture", "torus fracture", "pediatric fracture"],
  },
  {
    frenchPhrases: ["côte cassée", "cote cassee", "fracture de côte", "fracture de cote"],
    englishSearchTerms: ["broken rib", "rib fracture"],
  },
  {
    frenchPhrases: ["mâchoire cassée", "machoire cassee", "nez cassé", "nez casse"],
    englishSearchTerms: ["broken jaw", "mandible fracture", "broken nose", "nasal fracture"],
  },
  {
    frenchPhrases: ["entorse"],
    englishSearchTerms: ["sprain"],
  },
  {
    frenchPhrases: ["élongation", "elongation", "claquage"],
    englishSearchTerms: ["strain", "pulled muscle", "muscle strain"],
  },
  {
    frenchPhrases: ["luxation", "subluxation"],
    englishSearchTerms: ["dislocation", "subluxation"],
  },
  {
    frenchPhrases: ["épaule luxée", "epaule luxee", "luxation de l'épaule", "luxation de l'epaule"],
    englishSearchTerms: ["shoulder dislocation", "dislocated shoulder"],
  },
  {
    frenchPhrases: ["hanche luxée", "hanche luxee", "luxation de la hanche"],
    englishSearchTerms: ["hip dislocation", "dislocated hip"],
  },
  {
    frenchPhrases: ["rotule luxée", "rotule luxee", "luxation de la rotule"],
    englishSearchTerms: ["patella dislocation", "dislocated kneecap", "patellar dislocation"],
  },
  {
    frenchPhrases: ["doigt luxé", "doigt luxe", "luxation du doigt"],
    englishSearchTerms: ["finger dislocation", "dislocated finger"],
  },
  {
    frenchPhrases: ["mâchoire luxée", "machoire luxee", "luxation de la mâchoire", "luxation de la machoire", "luxation atm"],
    englishSearchTerms: ["jaw dislocation", "tmj dislocation", "dislocated jaw"],
  },
  {
    frenchPhrases: ["poignet de bonne", "coude de nounou"],
    englishSearchTerms: ["nursemaid elbow", "pulled elbow", "radial head subluxation"],
  },
  {
    frenchPhrases: ["entorse de la cheville", "entorse cheville", "cheville tordue"],
    englishSearchTerms: ["ankle sprain", "twisted ankle"],
  },
  {
    frenchPhrases: ["entorse du poignet", "entorse poignet"],
    englishSearchTerms: ["wrist sprain"],
  },
  {
    frenchPhrases: ["entorse du genou", "entorse genou"],
    englishSearchTerms: ["knee sprain", "ligament injury"],
  },
  {
    frenchPhrases: ["entorse cervicale", "entorse du cou"],
    englishSearchTerms: ["neck strain", "cervical strain"],
  },
  {
    frenchPhrases: ["entorse lombaire", "entorse du dos"],
    englishSearchTerms: ["back strain", "lumbar strain"],
  },
  {
    frenchPhrases: ["entorse de l'épaule", "entorse de l'epaule", "entorse épaule"],
    englishSearchTerms: ["shoulder sprain"],
  },
  {
    frenchPhrases: ["claquage des ischio-jambiers", "claquage ischio", "élongation des ischio-jambiers"],
    englishSearchTerms: ["hamstring strain", "pulled hamstring"],
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
