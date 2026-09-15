import type { SupportedLanguage } from "@/i18n/config";

export type ClinicalWritingSuggestion = {
  original: string;
  replacement: string;
  start: number;
  end: number;
};

const CLINICAL_LEXICON: Record<SupportedLanguage, readonly string[]> = {
  en: [
    "abdominal", "auscultation", "bradycardia", "cardiovascular", "diagnosis", "diarrhea",
    "discharge", "dizziness", "dyspnea", "edema", "gastrointestinal", "hypertension",
    "hypotension", "medication", "musculoskeletal", "nausea", "neurological", "oxygenation",
    "palpitations", "respiratory", "saturation", "syncope", "tachycardia", "tenderness", "vomiting",
  ],
  fr: [
    "abdominal", "allergie", "auscultation", "bradycardie", "cardiovasculaire", "diagnostic",
    "diarrhée", "dyspnée", "évaluation", "gastro-intestinal", "hypertension", "hypotension",
    "médicament", "musculosquelettique", "nausée", "neurologique", "oxygénation", "palpitations",
    "respiratoire", "saturation", "sortie", "suivi", "syncope", "tachycardie", "vomissements", "œdème",
  ],
  es: [
    "abdominal", "alergia", "auscultación", "bradicardia", "cardiovascular", "diagnóstico", "diarrea",
    "disnea", "edema", "evaluación", "gastrointestinal", "hipertensión", "hipotensión", "mareo",
    "medicación", "musculoesquelético", "náusea", "neurológico", "oxigenación", "palpitaciones",
    "respiratorio", "saturación", "seguimiento", "síncope", "taquicardia", "vómitos",
  ],
};

// Correct grammatical forms must never be offered as a nearby base clinical term.
const VALID_INFLECTIONS: Record<SupportedLanguage, ReadonlySet<string>> = {
  en: new Set([
    "diagnoses", "diagnosed", "diagnosing", "discharged", "discharges", "discharging",
    "medications", "palpitation",
  ]),
  fr: new Set(["allergies", "diagnostics", "médicaments", "nausées", "sorties"]),
  es: new Set(["alergias", "diagnósticos", "medicaciones", "náuseas"]),
};

const WORD_CHARACTER = /[\p{L}\p{M}]/u;

function normalizeForComparison(value: string): string {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe");
}

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function tokenAtOrBeforeCaret(value: string, caret: number): { token: string; start: number; end: number } | null {
  if (!value || caret <= 0) return null;
  let anchor = Math.min(caret, value.length);
  while (anchor > 0 && !WORD_CHARACTER.test(value[anchor - 1] ?? "")) anchor -= 1;
  if (anchor <= 0) return null;

  let start = anchor;
  while (start > 0 && WORD_CHARACTER.test(value[start - 1] ?? "")) start -= 1;

  // The caret can be moved into the middle of a word. Always extend the replacement
  // span to the actual word boundary so accepting a suggestion cannot leave a suffix.
  let end = anchor;
  while (end < value.length && WORD_CHARACTER.test(value[end] ?? "")) end += 1;

  const token = value.slice(start, end);
  return token ? { token, start, end } : null;
}

function preserveCapitalization(source: string, replacement: string): string {
  if (source === source.toLocaleUpperCase()) return replacement.toLocaleUpperCase();
  const first = source[0] ?? "";
  if (first && first === first.toLocaleUpperCase() && first !== first.toLocaleLowerCase()) {
    return `${replacement.charAt(0).toLocaleUpperCase()}${replacement.slice(1)}`;
  }
  return replacement;
}

export function suggestClinicalWritingTerm(value: string, caret: number, language: SupportedLanguage): ClinicalWritingSuggestion | null {
  const located = tokenAtOrBeforeCaret(value, caret);
  if (!located) return null;
  const { token, start, end } = located;
  if (token.length < 4 || /\d/.test(token) || (token.length <= 5 && token === token.toUpperCase())) return null;

  const normalizedToken = normalizeForComparison(token);
  if (VALID_INFLECTIONS[language].has(token.toLocaleLowerCase())) return null;
  const maxDistance = normalizedToken.length >= 9 ? 2 : 1;
  let best: { term: string; distance: number } | null = null;

  for (const term of CLINICAL_LEXICON[language]) {
    if (term.toLocaleLowerCase() === token.toLocaleLowerCase()) return null;
    const normalizedTerm = normalizeForComparison(term);
    if (Math.abs(normalizedTerm.length - normalizedToken.length) > maxDistance) continue;
    if (normalizedTerm[0] !== normalizedToken[0]) continue;
    const distance = levenshteinDistance(normalizedToken, normalizedTerm);
    const accentOnlyDifference = distance === 0 && term.toLocaleLowerCase() !== token.toLocaleLowerCase();
    if (!accentOnlyDifference && (distance === 0 || distance > maxDistance)) continue;
    if (!best || distance < best.distance) best = { term, distance };
    else if (distance === best.distance && best.term !== term) best = null;
  }

  if (!best) return null;
  return { original: token, replacement: preserveCapitalization(token, best.term), start, end };
}

export function replaceClinicalWritingSuggestion(value: string, suggestion: ClinicalWritingSuggestion): string {
  return `${value.slice(0, suggestion.start)}${suggestion.replacement}${value.slice(suggestion.end)}`;
}

export function clinicalWritingSuggestionLabel(language: SupportedLanguage, replacement: string): string {
  if (language === "fr") return `Vouliez-vous dire « ${replacement} » ?`;
  if (language === "es") return `¿Quiso decir «${replacement}»?`;
  return `Did you mean “${replacement}”?`;
}
