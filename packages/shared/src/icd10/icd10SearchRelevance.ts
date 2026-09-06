/**
 * MEDUI.TRILANG.DX.SEARCH.1 — multilingual ICD-10-CM retrieval ranking.
 *
 * Search may inspect aliases and other-locale labels.
 * Display stays active-locale-only (enforced by the terminology resolver, not this module).
 * Canonical identity is (codeSystem, releaseVersion, code).
 */

export const ICD10_SEARCH_RANK = {
  CODE_EXACT: 1,
  LOCALE_LABEL_EXACT: 2,
  ALIAS_EXACT: 3,
  LOCALE_LABEL_PREFIX: 4,
  LOCALE_PHRASE: 5,
  ENGLISH_PHRASE: 6,
  SYNONYM_PHRASE: 7,
  EXPANSION_PHRASE: 8,
  ALL_SIGNIFICANT_TOKENS_LOCALE: 9,
  ALL_SIGNIFICANT_TOKENS_ENGLISH: 10,
  ALIAS_PHRASE: 11,
  GENERIC_TOKEN: 12,
  NO_MATCH: 13,
} as const;

const ACCENTED = "áàäâãéèëêíìïîóòöôõúùüûñçýÿÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇÝŸ";
const UNACCENTED = "aaaaaeeeeiiiiooooouuuuncyyAAAAAEEEEIIIIOOOOOUUUUNCYY";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "de",
  "del",
  "due",
  "el",
  "en",
  "for",
  "from",
  "in",
  "la",
  "las",
  "le",
  "les",
  "los",
  "of",
  "on",
  "or",
  "o",
  "other",
  "para",
  "por",
  "sin",
  "the",
  "to",
  "un",
  "una",
  "unspecified",
  "with",
  "without",
  "y",
]);

const TRAUMA_TOKENS = [
  "abrasion",
  "abrasión",
  "amputation",
  "amputación",
  "blessure",
  "bullet",
  "burn",
  "contusion",
  "contusión",
  "crush",
  "entorse",
  "firearm",
  "fracture",
  "fractura",
  "golpe",
  "herida",
  "injury",
  "laceration",
  "laceración",
  "plaie",
  "projectile",
  "proyectil",
  "puncture",
  "quemadura",
  "sprain",
  "strain",
  "trauma",
  "traumatismo",
  "wound",
] as const;

const SYMPTOM_TOKENS = [
  "asma",
  "asthma",
  "bleed",
  "bleeding",
  "cefalea",
  "céphalée",
  "chest",
  "cough",
  "diabetes",
  "disnea",
  "dizziness",
  "dolor",
  "douleur",
  "dyspnea",
  "dyspnée",
  "ear",
  "fever",
  "fiebre",
  "fièvre",
  "garganta",
  "gi",
  "headache",
  "hemorrhage",
  "hemorragia",
  "hipertension",
  "hypertension",
  "infeccion",
  "infección",
  "infection",
  "lumbar",
  "mareo",
  "nausea",
  "nauseas",
  "náuseas",
  "nausée",
  "neumonia",
  "neumonía",
  "oido",
  "oído",
  "pain",
  "pneumonia",
  "sangrado",
  "throat",
  "tos",
  "toux",
  "uti",
  "vertigo",
  "vómito",
  "vomito",
  "vomiting",
] as const;

const BLEED_TOKENS = [
  "bleed",
  "bleeding",
  "gi bleed",
  "hematemesis",
  "hemorrhage",
  "haemorrhage",
  "hemorragia",
  "melena",
  "rectorragia",
  "sangrado",
  "sangrante",
] as const;

export const ICD10_SEARCH_SYNONYM_PHRASE_GROUPS: readonly (readonly string[])[] = [
  ["dolor abdominal", "abdominal pain", "douleur abdominale"],
  ["dolor toracico", "dolor torácico", "dolor de pecho", "presion en el pecho", "presión en el pecho", "chest pain", "chest pressure", "douleur thoracique", "dolor precordial"],
  [
    "sangrado gastrointestinal",
    "hemorragia gastrointestinal",
    "gastrointestinal hemorrhage",
    "gastrointestinal bleeding",
    "gi bleed",
  ],
  ["nauseas", "náuseas", "nausea", "nausée"],
  ["vomitos", "vómitos", "vomiting", "vomissement"],
  ["mareo", "dizziness", "vertigo", "vertige"],
  ["disnea", "shortness of breath", "dyspnea", "dyspnée", "dificultad para respirar", "respiracion corta", "respiración corta"],
  ["cefalea", "headache", "céphalée"],
  ["fiebre", "fever", "fièvre"],
  ["tos", "cough", "toux"],
  ["dolor lumbar", "low back pain", "lombalgie", "back pain"],
  ["dolor de garganta", "sore throat", "mal de gorge"],
  ["infeccion urinaria", "infección urinaria", "uti", "urinary tract infection"],
  ["dolor de rodilla", "knee pain", "douleur du genou"],
  ["dolor de hombro", "shoulder pain", "douleur d'épaule"],
  ["dolor de oido", "dolor de oído", "ear pain", "otalgia", "douleur d'oreille"],
  ["hipertension", "hypertension", "high blood pressure"],
  ["diabetes tipo 2", "type 2 diabetes", "diabète de type 2"],
  ["neumonia", "neumonía", "pneumonia", "pneumonie"],
  ["asma", "asthma", "asthme"],
  ["dolor epigastrico", "dolor epigástrico", "epigastric pain"],
  ["dolor pelvico", "dolor pélvico", "pelvic pain"],
  ["dolor en flanco", "flank pain"],
  ["sangre en heces", "blood in stool", "rectal bleeding"],
  ["heces negras", "black stool", "melena"],
  ["hematemesis"],
  ["hematuria", "blood in urine", "sangre en orina"],
  ["tos con sangre", "coughing blood", "hemoptysis", "hemoptisis"],
  ["dolor al orinar", "ardor al orinar", "painful urination", "dysuria", "disuria"],
  ["hinchazon de pierna", "hinchazón de pierna", "leg swelling"],
  ["dolor de pantorrilla", "calf pain"],
  ["fractura de muneca", "fractura de muñeca", "wrist fracture"],
  ["laceracion de mano", "laceración de mano", "laceration of hand"],
  ["golpe en la cabeza", "head injury", "head trauma"],
  ["reaccion alergica", "reacción alérgica", "allergic reaction"],
  ["anafilaxia", "anaphylaxis"],
  ["sibilancias", "wheezing"],
  ["palpitaciones", "palpitations"],
  ["desmayo", "syncope", "fainting"],
  ["convulsion", "convulsión", "seizure"],
  ["debilidad", "weakness"],
  ["entumecimiento", "numbness"],
  ["dolor de cuello", "neck pain", "cervicalgia"],
  ["dolor de cadera", "hip pain"],
];

export type Icd10SearchIntent = "CODE" | "SYMPTOM" | "TRAUMA" | "OTHER";

export type Icd10SearchCandidate = {
  code: string;
  normalizedCode: string;
  shortDescription: string;
  longDescription?: string | null;
  localeLabel?: string | null;
  aliases?: readonly string[];
  isBillable?: boolean;
};

export type Icd10SearchRankBreakdown = {
  quality: number;
  injuryChapterPenalty: number;
  signChapterPenalty: number;
  traumaChapterBoost: number;
  familyPrefixPenalty: number;
  discriminatingPenalty: number;
  billableRank: number;
  seventhCharRank: number;
  lengthRank: number;
  code: string;
};

export function foldIcd10SearchText(raw: string): string {
  const mapped = raw
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .split("")
    .map((ch) => {
      const idx = ACCENTED.indexOf(ch);
      return idx >= 0 ? UNACCENTED[idx] : ch;
    })
    .join("");
  return mapped
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function icd10SearchLooksLikeCode(raw: string): boolean {
  const folded = foldIcd10SearchText(raw).replace(/\s+/g, "");
  return /^[a-z][0-9][0-9a-z.]*$/i.test(folded) && /\d/.test(folded);
}

export function tokenizeIcd10SearchQuery(raw: string): string[] {
  return foldIcd10SearchText(raw)
    .split(" ")
    .filter((tok) => tok.length >= 2 && !STOPWORDS.has(tok));
}

function haystack(...parts: Array<string | null | undefined>): string {
  return foldIcd10SearchText(parts.filter(Boolean).join(" "));
}

function containsFolded(hay: string, needle: string): boolean {
  return needle.length >= 2 && hay.includes(needle);
}

function synonymGroupMatchesQuery(foldedQuery: string, foldedGroup: readonly string[]): boolean {
  const queryTokenCount = foldedQuery.split(" ").filter(Boolean).length;
  return foldedGroup.some((phrase) => {
    if (!phrase) return false;
    if (phrase === foldedQuery) return true;
    if (foldedQuery.includes(phrase) && phrase.split(" ").filter(Boolean).length >= 2) return true;
    return queryTokenCount >= 2 && phrase.includes(foldedQuery);
  });
}

export function resolveIcd10SearchSynonymPhrases(raw: string): string[] {
  const folded = foldIcd10SearchText(raw);
  if (!folded) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (phrase: string) => {
    const trimmed = phrase.trim();
    if (trimmed.length < 2) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  for (const group of ICD10_SEARCH_SYNONYM_PHRASE_GROUPS) {
    const foldedGroup = group.map((phrase) => foldIcd10SearchText(phrase));
    if (!synonymGroupMatchesQuery(folded, foldedGroup)) continue;
    for (const phrase of group) push(phrase);
    for (const phrase of foldedGroup) push(phrase);
  }
  return out;
}

export function isIcd10SignSymptomQuery(raw: string): boolean {
  const tokens = tokenizeIcd10SearchQuery(raw);
  if (tokens.length === 0) return false;
  const signOnly = new Set(
    [
      "cefalea",
      "cough",
      "disnea",
      "dizziness",
      "dyspnea",
      "fever",
      "fiebre",
      "headache",
      "mareo",
      "nausea",
      "nauseas",
      "tos",
      "vertigo",
      "vomiting",
      "vomitos",
    ].map((tok) => foldIcd10SearchText(tok)),
  );
  return tokens.every((token) => signOnly.has(token));
}

export function resolveIcd10SearchPreferredCodePrefixes(raw: string): string[] {
  const folded = foldIcd10SearchText(raw);
  const families: Array<{ needles: readonly string[]; prefixes: readonly string[] }> = [
    { needles: ["neumonia", "pneumonia", "pneumonie", "asma", "asthma", "asthme"], prefixes: ["J"] },
    { needles: ["uti", "infeccion urinaria", "urinary tract infection", "disuria", "dysuria"], prefixes: ["N3"] },
    { needles: ["diabetes tipo 2", "type 2 diabetes", "diabetes"], prefixes: ["E1"] },
    { needles: ["hipertension", "hypertension", "high blood pressure"], prefixes: ["I1"] },
    {
      needles: [
        "sangrado gastrointestinal",
        "gi bleed",
        "sangre en heces",
        "blood in stool",
        "heces negras",
        "black stool",
        "hematemesis",
        "hematuria",
        "blood in urine",
        "tos con sangre",
        "coughing blood",
        "hemoptysis",
      ],
      prefixes: ["K92", "R04", "R31", "K62"],
    },
  ];
  const out: string[] = [];
  for (const family of families) {
    const hit = family.needles.some((needle) => {
      const n = foldIcd10SearchText(needle);
      if (!n) return false;
      if (folded === n) return true;
      return n.includes(" ") && (folded.includes(n) || n.includes(folded));
    });
    if (!hit) continue;
    out.push(...family.prefixes);
  }
  return [...new Set(out)];
}

export function classifyIcd10SearchIntent(raw: string): Icd10SearchIntent {
  if (icd10SearchLooksLikeCode(raw)) return "CODE";
  const tokens = tokenizeIcd10SearchQuery(raw);
  const tokenSet = new Set(tokens);
  const folded = foldIcd10SearchText(raw);
  const has = (needles: readonly string[]) =>
    needles.some((needle) => {
      const n = foldIcd10SearchText(needle);
      return tokenSet.has(n) || containsFolded(folded, n);
    });
  const trauma = has(TRAUMA_TOKENS);
  const symptom = has(SYMPTOM_TOKENS);
  if (symptom && !trauma) return "SYMPTOM";
  if (trauma) return "TRAUMA";
  return "OTHER";
}

function seventhCharRank(code: string): number {
  const compact = code.replace(/\./g, "");
  const last = compact.slice(-1);
  if (last === "A") return 0;
  if (last === "D") return 1;
  if (last === "S") return 2;
  return 0;
}

function isInjuryChapter(code: string): boolean {
  const ch = code.trim().charAt(0).toUpperCase();
  return ch === "S" || ch === "T";
}

function isTraumaMusculoskeletalFamily(code: string): boolean {
  const upper = code.toUpperCase();
  return upper.startsWith("S") || upper.startsWith("M66") || upper.startsWith("M75");
}

function hasBleedSignal(text: string): boolean {
  const folded = foldIcd10SearchText(text);
  return BLEED_TOKENS.some((tok) => containsFolded(folded, foldIcd10SearchText(tok)));
}

function qualityForCandidate(
  raw: string,
  candidate: Icd10SearchCandidate,
  synonymPhrases: readonly string[],
): number {
  const foldedQuery = foldIcd10SearchText(raw);
  const tokens = tokenizeIcd10SearchQuery(raw);
  const locale = haystack(candidate.localeLabel);
  const english = haystack(candidate.shortDescription, candidate.longDescription ?? "");
  const aliases = haystack(...(candidate.aliases ?? []));
  const codeFolded = foldIcd10SearchText(candidate.code).replace(/\s+/g, "");
  const normFolded = foldIcd10SearchText(candidate.normalizedCode).replace(/\s+/g, "");
  const qCode = foldedQuery.replace(/\s+/g, "");

  if (icd10SearchLooksLikeCode(raw) && (codeFolded === qCode || normFolded === qCode)) {
    return ICD10_SEARCH_RANK.CODE_EXACT;
  }
  if (locale && locale === foldedQuery) return ICD10_SEARCH_RANK.LOCALE_LABEL_EXACT;
  if (aliases && aliases.split(" ").length > 0 && (candidate.aliases ?? []).some((alias) => foldIcd10SearchText(alias) === foldedQuery)) {
    return ICD10_SEARCH_RANK.ALIAS_EXACT;
  }
  if (locale.startsWith(foldedQuery) && foldedQuery.length >= 2) return ICD10_SEARCH_RANK.LOCALE_LABEL_PREFIX;
  if (containsFolded(locale, foldedQuery)) return ICD10_SEARCH_RANK.LOCALE_PHRASE;
  if (foldedQuery.length > 3 && containsFolded(english, foldedQuery)) return ICD10_SEARCH_RANK.ENGLISH_PHRASE;
  if (synonymPhrases.some((phrase) => containsFolded(locale, phrase) || containsFolded(english, phrase) || containsFolded(aliases, phrase))) {
    return ICD10_SEARCH_RANK.SYNONYM_PHRASE;
  }
  if (tokens.length > 0 && tokens.every((tok) => containsFolded(locale, tok))) {
    return ICD10_SEARCH_RANK.ALL_SIGNIFICANT_TOKENS_LOCALE;
  }
  if (tokens.length > 0 && tokens.every((tok) => containsFolded(english, tok))) {
    return ICD10_SEARCH_RANK.ALL_SIGNIFICANT_TOKENS_ENGLISH;
  }
  if (containsFolded(aliases, foldedQuery)) return ICD10_SEARCH_RANK.ALIAS_PHRASE;
  if (tokens.some((tok) => containsFolded(locale, tok) || containsFolded(english, tok) || containsFolded(aliases, tok))) {
    return ICD10_SEARCH_RANK.GENERIC_TOKEN;
  }
  return ICD10_SEARCH_RANK.NO_MATCH;
}

export function scoreIcd10SearchCandidate(raw: string, candidate: Icd10SearchCandidate): Icd10SearchRankBreakdown {
  const intent = classifyIcd10SearchIntent(raw);
  const synonyms = resolveIcd10SearchSynonymPhrases(raw);
  const localeOrEnglish = candidate.localeLabel?.trim() || candidate.shortDescription;
  const discriminatingPenalty =
    intent === "SYMPTOM" && tokenizeIcd10SearchQuery(raw).some((tok) => BLEED_TOKENS.includes(tok as (typeof BLEED_TOKENS)[number]) || tok === "sangrado")
      ? hasBleedSignal(`${candidate.localeLabel ?? ""} ${candidate.shortDescription} ${candidate.aliases?.join(" ") ?? ""}`)
        ? 0
        : 1
      : 0;

  const preferredPrefixes = resolveIcd10SearchPreferredCodePrefixes(raw);
  const familyPrefixPenalty =
    preferredPrefixes.length === 0
      ? 0
      : preferredPrefixes.some((prefix) => candidate.code.toUpperCase().startsWith(prefix))
        ? 0
        : 1;

  return {
    quality: qualityForCandidate(raw, candidate, synonyms),
    injuryChapterPenalty: intent === "SYMPTOM" && isInjuryChapter(candidate.code) ? 1 : 0,
    signChapterPenalty: isIcd10SignSymptomQuery(raw) && !candidate.code.toUpperCase().startsWith("R") ? 1 : 0,
    traumaChapterBoost: intent === "TRAUMA" && isTraumaMusculoskeletalFamily(candidate.code) ? 0 : 1,
    familyPrefixPenalty,
    discriminatingPenalty,
    billableRank: candidate.isBillable === false ? 1 : 0,
    seventhCharRank: seventhCharRank(candidate.code),
    lengthRank: localeOrEnglish.length,
    code: candidate.code,
  };
}

export function compareIcd10SearchRank(a: Icd10SearchRankBreakdown, b: Icd10SearchRankBreakdown): number {
  return (
    a.quality - b.quality ||
    a.injuryChapterPenalty - b.injuryChapterPenalty ||
    a.signChapterPenalty - b.signChapterPenalty ||
    a.familyPrefixPenalty - b.familyPrefixPenalty ||
    a.traumaChapterBoost - b.traumaChapterBoost ||
    a.discriminatingPenalty - b.discriminatingPenalty ||
    a.billableRank - b.billableRank ||
    a.seventhCharRank - b.seventhCharRank ||
    a.lengthRank - b.lengthRank ||
    a.code.localeCompare(b.code)
  );
}

export function rankIcd10SearchCandidates(raw: string, candidates: readonly Icd10SearchCandidate[]): Icd10SearchCandidate[] {
  return [...candidates].sort((left, right) =>
    compareIcd10SearchRank(scoreIcd10SearchCandidate(raw, left), scoreIcd10SearchCandidate(raw, right)),
  );
}

export type Icd10SearchBenchmarkCase = {
  id: string;
  query: string;
  locale: "en" | "es" | "fr";
  expectedCanonicalCodes: readonly string[];
  topN: 1 | 3 | 5;
};

export const ICD10_SEARCH_RELEVANCE_BENCHMARK: readonly Icd10SearchBenchmarkCase[] = [
  { id: "es-dolor-toracico", query: "dolor torácico", locale: "es", expectedCanonicalCodes: ["R07.9", "R07.89", "R07.2", "R07.1", "R07.0"], topN: 5 },
  { id: "es-dolor-abdominal", query: "dolor abdominal", locale: "es", expectedCanonicalCodes: ["R10.9", "R10.84", "R10.85", "R10.10", "R10.30"], topN: 5 },
  { id: "es-sangrado-gi", query: "sangrado gastrointestinal", locale: "es", expectedCanonicalCodes: ["K92.2", "K92.0", "K92.1"], topN: 5 },
  { id: "es-nauseas", query: "náuseas", locale: "es", expectedCanonicalCodes: ["R11.0"], topN: 3 },
  { id: "es-nauseas-unaccented", query: "nauseas", locale: "es", expectedCanonicalCodes: ["R11.0"], topN: 3 },
  { id: "es-vomitos", query: "vómitos", locale: "es", expectedCanonicalCodes: ["R11.10", "R11.11", "R11.2"], topN: 5 },
  { id: "es-mareo", query: "mareo", locale: "es", expectedCanonicalCodes: ["R42"], topN: 5 },
  { id: "es-disnea", query: "disnea", locale: "es", expectedCanonicalCodes: ["R06.00", "R06.02", "R06.09"], topN: 5 },
  { id: "es-cefalea", query: "cefalea", locale: "es", expectedCanonicalCodes: ["R51.9", "R51.0"], topN: 5 },
  { id: "es-fiebre", query: "fiebre", locale: "es", expectedCanonicalCodes: ["R50.9", "R50.81", "R50.83", "R50.2"], topN: 5 },
  { id: "es-tos", query: "tos", locale: "es", expectedCanonicalCodes: ["R05.9", "R05.1", "R05.3"], topN: 5 },
  { id: "es-dolor-lumbar", query: "dolor lumbar", locale: "es", expectedCanonicalCodes: ["M54.50", "M54.51", "M54.59"], topN: 5 },
  { id: "es-dolor-garganta", query: "dolor de garganta", locale: "es", expectedCanonicalCodes: ["J02.9", "R07.0"], topN: 5 },
  { id: "es-itu", query: "infección urinaria", locale: "es", expectedCanonicalCodes: ["N39.0"], topN: 5 },
  { id: "es-dolor-rodilla", query: "dolor de rodilla", locale: "es", expectedCanonicalCodes: ["M25.561", "M25.562", "M25.569"], topN: 5 },
  { id: "es-dolor-hombro", query: "dolor de hombro", locale: "es", expectedCanonicalCodes: ["M25.511", "M25.512", "M25.519"], topN: 5 },
  { id: "es-dolor-oido", query: "dolor de oído", locale: "es", expectedCanonicalCodes: ["H92.01", "H92.02", "H92.03", "H92.09"], topN: 5 },
  { id: "es-hipertension", query: "hipertensión", locale: "es", expectedCanonicalCodes: ["I10"], topN: 5 },
  { id: "es-dm2", query: "diabetes tipo 2", locale: "es", expectedCanonicalCodes: ["E11.9", "E11.65"], topN: 5 },
  { id: "es-neumonia", query: "neumonía", locale: "es", expectedCanonicalCodes: ["J18.9", "J18.1", "J18.0", "J18.8", "J18.2", "J12.9", "J15.9", "J16.0", "J12.0", "J13", "J14", "J15.1"], topN: 5 },
  { id: "es-asma", query: "asma", locale: "es", expectedCanonicalCodes: ["J45.909", "J45.20", "J45.998", "J45.991"], topN: 5 },
  { id: "es-code-r110", query: "R11.0", locale: "es", expectedCanonicalCodes: ["R11.0"], topN: 1 },
  { id: "es-en-abdominal-pain", query: "abdominal pain", locale: "es", expectedCanonicalCodes: ["R10.9", "R10.84", "R10.85", "R10.10"], topN: 5 },
  { id: "en-chest-pain", query: "chest pain", locale: "en", expectedCanonicalCodes: ["R07.9", "R07.89", "R07.2", "R07.1", "R07.0"], topN: 5 },
  { id: "en-abdominal-pain", query: "abdominal pain", locale: "en", expectedCanonicalCodes: ["R10.9", "R10.84", "R10.85"], topN: 5 },
  { id: "en-gi-bleed", query: "GI bleed", locale: "en", expectedCanonicalCodes: ["K92.2", "K92.0", "K92.1"], topN: 5 },
  { id: "en-nausea", query: "nausea", locale: "en", expectedCanonicalCodes: ["R11.0"], topN: 3 },
  { id: "en-vomiting", query: "vomiting", locale: "en", expectedCanonicalCodes: ["R11.10", "R11.2"], topN: 5 },
  { id: "en-dizziness", query: "dizziness", locale: "en", expectedCanonicalCodes: ["R42"], topN: 5 },
  { id: "en-sob", query: "shortness of breath", locale: "en", expectedCanonicalCodes: ["R06.02", "R06.00"], topN: 5 },
  { id: "en-headache", query: "headache", locale: "en", expectedCanonicalCodes: ["R51.9"], topN: 5 },
  { id: "en-fever", query: "fever", locale: "en", expectedCanonicalCodes: ["R50.9", "R50.81", "R50.83", "R50.2"], topN: 5 },
  { id: "en-cough", query: "cough", locale: "en", expectedCanonicalCodes: ["R05.9", "R05.1", "R05.3", "R05.8", "R05.2"], topN: 5 },
  { id: "en-uti", query: "UTI", locale: "en", expectedCanonicalCodes: ["N39.0"], topN: 5 },
  { id: "en-back-pain", query: "back pain", locale: "en", expectedCanonicalCodes: ["M54.50", "M54.9"], topN: 5 },
];

/** Held-out queries. Expected sets are clinically acceptable families, not single-code patches. */
export const ICD10_SEARCH_ADVERSARIAL_BENCHMARK: readonly Icd10SearchBenchmarkCase[] = [
  { id: "adv-es-dolor-pecho", query: "dolor de pecho", locale: "es", expectedCanonicalCodes: ["R07.9", "R07.89", "R07.2", "R07.1"], topN: 5 },
  { id: "adv-es-presion-pecho", query: "presión en el pecho", locale: "es", expectedCanonicalCodes: ["R07.9", "R07.89", "R07.2", "R07.1"], topN: 5 },
  { id: "adv-es-epigastrico", query: "dolor epigástrico", locale: "es", expectedCanonicalCodes: ["R10.13"], topN: 5 },
  { id: "adv-es-pelvico", query: "dolor pélvico", locale: "es", expectedCanonicalCodes: ["R10.2", "R10.20", "R10.21", "R10.22", "R10.23"], topN: 5 },
  { id: "adv-es-flanco", query: "dolor en flanco", locale: "es", expectedCanonicalCodes: ["R10.9", "R10.81", "R10.10", "N23", "R10.A0", "R10.A1", "R10.A2", "R10.A3"], topN: 5 },
  { id: "adv-es-sangre-heces", query: "sangre en heces", locale: "es", expectedCanonicalCodes: ["K92.1", "K62.5", "R19.5"], topN: 5 },
  { id: "adv-es-heces-negras", query: "heces negras", locale: "es", expectedCanonicalCodes: ["K92.1"], topN: 5 },
  { id: "adv-es-hematemesis", query: "hematemesis", locale: "es", expectedCanonicalCodes: ["K92.0"], topN: 5 },
  { id: "adv-es-hematuria", query: "hematuria", locale: "es", expectedCanonicalCodes: ["R31.9", "R31.0", "R31.29"], topN: 5 },
  { id: "adv-es-tos-sangre", query: "tos con sangre", locale: "es", expectedCanonicalCodes: ["R04.2"], topN: 5 },
  { id: "adv-es-dificultad-respirar", query: "dificultad para respirar", locale: "es", expectedCanonicalCodes: ["R06.00", "R06.02", "R06.09"], topN: 5 },
  { id: "adv-es-respiracion-corta", query: "respiración corta", locale: "es", expectedCanonicalCodes: ["R06.02", "R06.00", "R06.09"], topN: 5 },
  { id: "adv-es-dolor-orinar", query: "dolor al orinar", locale: "es", expectedCanonicalCodes: ["R30.0", "N39.0", "N34.2"], topN: 5 },
  { id: "adv-es-ardor-orinar", query: "ardor al orinar", locale: "es", expectedCanonicalCodes: ["R30.0", "N39.0"], topN: 5 },
  { id: "adv-es-hinchazon-pierna", query: "hinchazón de pierna", locale: "es", expectedCanonicalCodes: ["R60.0", "R60.9"], topN: 5 },
  { id: "adv-es-pantorrilla", query: "dolor de pantorrilla", locale: "es", expectedCanonicalCodes: ["M79.661", "M79.662", "M79.669"], topN: 5 },
  { id: "adv-es-fx-muneca", query: "fractura de muñeca", locale: "es", expectedCanonicalCodes: ["S62.90XA", "S62.90", "S62.009A"], topN: 5 },
  { id: "adv-es-laceracion-mano", query: "laceración de mano", locale: "es", expectedCanonicalCodes: ["S61.409A", "S61.401A", "S61.402A"], topN: 5 },
  { id: "adv-es-golpe-cabeza", query: "golpe en la cabeza", locale: "es", expectedCanonicalCodes: ["S09.90XA", "S00.93XA", "S09.90"], topN: 5 },
  { id: "adv-es-alergia", query: "reacción alérgica", locale: "es", expectedCanonicalCodes: ["T78.40XA", "T78.40", "T78.2XXA"], topN: 5 },
  { id: "adv-es-anafilaxia", query: "anafilaxia", locale: "es", expectedCanonicalCodes: ["T78.2XXA", "T78.2"], topN: 5 },
  { id: "adv-es-fiebre-tos", query: "fiebre y tos", locale: "es", expectedCanonicalCodes: ["R50.9", "R05.9", "R50.81"], topN: 5 },
  { id: "adv-es-sibilancias", query: "sibilancias", locale: "es", expectedCanonicalCodes: ["R06.2"], topN: 5 },
  { id: "adv-es-palpitaciones", query: "palpitaciones", locale: "es", expectedCanonicalCodes: ["R00.2"], topN: 5 },
  { id: "adv-es-desmayo", query: "desmayo", locale: "es", expectedCanonicalCodes: ["R55"], topN: 5 },
  { id: "adv-es-convulsion", query: "convulsión", locale: "es", expectedCanonicalCodes: ["R56.9", "G40.909"], topN: 5 },
  { id: "adv-es-debilidad", query: "debilidad", locale: "es", expectedCanonicalCodes: ["R53.1", "R53.83", "M62.81"], topN: 5 },
  { id: "adv-es-entumecimiento", query: "entumecimiento", locale: "es", expectedCanonicalCodes: ["R20.2", "R20.0", "R20.1"], topN: 5 },
  { id: "adv-es-cuello", query: "dolor de cuello", locale: "es", expectedCanonicalCodes: ["M54.2"], topN: 5 },
  { id: "adv-es-cadera", query: "dolor de cadera", locale: "es", expectedCanonicalCodes: ["M25.551", "M25.552", "M25.559"], topN: 5 },
  { id: "adv-en-chest-pressure", query: "chest pressure", locale: "en", expectedCanonicalCodes: ["R07.9", "R07.89", "R07.2", "R07.1"], topN: 5 },
  { id: "adv-en-epigastric", query: "epigastric pain", locale: "en", expectedCanonicalCodes: ["R10.13"], topN: 5 },
  { id: "adv-en-pelvic", query: "pelvic pain", locale: "en", expectedCanonicalCodes: ["R10.2", "R10.20", "R10.21", "R10.22", "R10.23"], topN: 5 },
  { id: "adv-en-flank", query: "flank pain", locale: "en", expectedCanonicalCodes: ["R10.9", "R10.81", "N23", "R10.A0", "R10.A1", "R10.A2", "R10.A3"], topN: 5 },
  { id: "adv-en-blood-stool", query: "blood in stool", locale: "en", expectedCanonicalCodes: ["K92.1", "K62.5", "R19.5"], topN: 5 },
  { id: "adv-en-black-stool", query: "black stool", locale: "en", expectedCanonicalCodes: ["K92.1"], topN: 5 },
  { id: "adv-en-hematemesis", query: "hematemesis", locale: "en", expectedCanonicalCodes: ["K92.0"], topN: 5 },
  { id: "adv-en-blood-urine", query: "blood in urine", locale: "en", expectedCanonicalCodes: ["R31.9", "R31.0"], topN: 5 },
  { id: "adv-en-coughing-blood", query: "coughing blood", locale: "en", expectedCanonicalCodes: ["R04.2"], topN: 5 },
  { id: "adv-en-painful-urination", query: "painful urination", locale: "en", expectedCanonicalCodes: ["R30.0", "N39.0"], topN: 5 },
  { id: "adv-en-leg-swelling", query: "leg swelling", locale: "en", expectedCanonicalCodes: ["R60.0", "R60.9"], topN: 5 },
  { id: "adv-en-calf-pain", query: "calf pain", locale: "en", expectedCanonicalCodes: ["M79.661", "M79.662", "M79.669"], topN: 5 },
  { id: "adv-en-wrist-fx", query: "wrist fracture", locale: "en", expectedCanonicalCodes: ["S62.90XA", "S62.009A"], topN: 5 },
  { id: "adv-en-head-injury", query: "head injury", locale: "en", expectedCanonicalCodes: ["S09.90XA", "S00.93XA"], topN: 5 },
  { id: "adv-en-allergic", query: "allergic reaction", locale: "en", expectedCanonicalCodes: ["T78.40XA", "T78.2XXA"], topN: 5 },
  { id: "adv-en-wheezing", query: "wheezing", locale: "en", expectedCanonicalCodes: ["R06.2"], topN: 5 },
  { id: "adv-en-palpitations", query: "palpitations", locale: "en", expectedCanonicalCodes: ["R00.2"], topN: 5 },
  { id: "adv-en-syncope", query: "syncope", locale: "en", expectedCanonicalCodes: ["R55"], topN: 5 },
  { id: "adv-en-seizure", query: "seizure", locale: "en", expectedCanonicalCodes: ["R56.9", "G40.909", "G40.89", "R56.1", "G40.901"], topN: 5 },
  { id: "adv-en-weakness", query: "weakness", locale: "en", expectedCanonicalCodes: ["R53.1", "R53.83", "M62.81"], topN: 5 },
  { id: "adv-en-numbness", query: "numbness", locale: "en", expectedCanonicalCodes: ["R20.2", "R20.0"], topN: 5 },
];

export type Icd10SearchBenchmarkHit = { code: string };

export function evaluateIcd10SearchBenchmarkCase(
  spec: Icd10SearchBenchmarkCase,
  rankedCodes: readonly string[],
): { top1: boolean; top3: boolean; top5: boolean; reciprocalRank: number } {
  const expected = new Set(spec.expectedCanonicalCodes);
  const idx = rankedCodes.findIndex((code) => expected.has(code));
  const rank = idx < 0 ? 0 : idx + 1;
  return {
    top1: rank === 1,
    top3: rank > 0 && rank <= 3,
    top5: rank > 0 && rank <= 5,
    reciprocalRank: rank === 0 ? 0 : 1 / rank,
  };
}
