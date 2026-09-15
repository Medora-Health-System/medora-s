import type { SupportedLanguage } from "@/i18n/config";

export type ClinicalGrammarSuggestion = {
  original: string;
  replacement: string;
  start: number;
  end: number;
};

type Rule = { pattern: RegExp; replacement: string };

// Intentionally narrow: these rules repair grammar only. They never infer or rewrite
// negation, diagnoses, medications, doses, allergies, laterality, numbers, or results.
const RULES: Record<SupportedLanguage, readonly Rule[]> = {
  en: [
    { pattern: /\bpatient complain of\b/i, replacement: "patient complains of" },
    { pattern: /\bpatient report\b/i, replacement: "patient reports" },
    { pattern: /\bfor (one|two|three|four|five|six|seven|eight|nine|ten) day\b/i, replacement: "for $1 days" },
    { pattern: /\bsince (one|two|three|four|five|six|seven|eight|nine|ten) day\b/i, replacement: "for $1 days" },
  ],
  fr: [
    { pattern: /\ble patient rapporte des douleur\b/i, replacement: "le patient rapporte des douleurs" },
    { pattern: /\bla patiente rapporte des douleur\b/i, replacement: "la patiente rapporte des douleurs" },
    { pattern: /\bdepuis deux jour\b/i, replacement: "depuis deux jours" },
  ],
  es: [
    { pattern: /\bel paciente refiere dolor desde dos dia\b/i, replacement: "el paciente refiere dolor desde hace dos días" },
    { pattern: /\bla paciente refiere dolor desde dos dia\b/i, replacement: "la paciente refiere dolor desde hace dos días" },
    { pattern: /\bpor dos dia\b/i, replacement: "por dos días" },
  ],
};

const PROTECTED = /\b(denies?|denied|no|not|without|sin|niega|niegan|sans|nie|nient|allerg(?:y|ic|ies)|alerg(?:ia|ias)|allergie|mg|mcg|µg|g|ml|mmhg|left|right|gauche|droite|izquierd[oa]|derech[oa])\b/i;

function preserveInitialCase(source: string, replacement: string): string {
  if (!source || source[0] !== source[0].toUpperCase()) return replacement;
  return replacement[0].toUpperCase() + replacement.slice(1);
}

export function suggestClinicalGrammar(value: string, language: SupportedLanguage): ClinicalGrammarSuggestion | null {
  if (!value.trim()) return null;
  for (const rule of RULES[language]) {
    const match = rule.pattern.exec(value);
    if (!match || match.index == null) continue;
    const original = match[0];
    // Do not offer sentence-level transformations over clinically meaning-sensitive tokens.
    if (PROTECTED.test(original) || /\d/.test(original)) continue;
    const rawReplacement = original.replace(rule.pattern, rule.replacement);
    const replacement = preserveInitialCase(original, rawReplacement);
    if (replacement === original) continue;
    return { original, replacement, start: match.index, end: match.index + original.length };
  }
  return null;
}

export function replaceClinicalGrammarSuggestion(value: string, suggestion: ClinicalGrammarSuggestion): string {
  return `${value.slice(0, suggestion.start)}${suggestion.replacement}${value.slice(suggestion.end)}`;
}

export function clinicalGrammarSuggestionLabel(language: SupportedLanguage, replacement: string): string {
  if (language === "fr") return `Suggestion grammaticale : « ${replacement} »`;
  if (language === "es") return `Sugerencia gramatical: «${replacement}»`;
  return `Grammar suggestion: “${replacement}”`;
}
