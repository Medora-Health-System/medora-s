/**
 * M1.7A.2 — Explicit medication search token builders (no manual searchText concatenation in new waves).
 */

import type {
  MedicationLocalizationAlias,
  MedicationLocalizationContract,
  MedicationLocalizationLocale,
} from "./medicationLocalizationTypes.js";

export type MedicationSearchTokenBuildInput = Pick<
  MedicationLocalizationContract,
  | "catalogCode"
  | "genericName"
  | "displayNameFr"
  | "displayNameEn"
  | "aliases"
  | "strength"
  | "dosageForm"
  | "route"
  | "therapeuticClass"
>;

function normalizeSearchToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.+/\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pushToken(seen: Set<string>, out: string[], raw: string | undefined): void {
  const token = normalizeSearchToken(raw ?? "");
  if (token.length < 2 || seen.has(token)) return;
  seen.add(token);
  out.push(token);
}

function aliasesForLocale(
  aliases: readonly MedicationLocalizationAlias[],
  locale: MedicationLocalizationLocale
): string[] {
  return aliases.filter((a) => a.language === locale).map((a) => a.text);
}

/**
 * English search tokens — INN, EN display, EN-tagged aliases, neutral strength/code.
 */
export function buildMedicationSearchTokensEn(input: MedicationSearchTokenBuildInput): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  pushToken(seen, out, input.catalogCode.replace(/_/g, " "));
  pushToken(seen, out, input.genericName);
  pushToken(seen, out, input.displayNameEn);
  pushToken(seen, out, input.strength);
  pushToken(seen, out, input.dosageForm);
  pushToken(seen, out, input.route);
  pushToken(seen, out, input.therapeuticClass);

  for (const alias of aliasesForLocale(input.aliases, "en")) {
    pushToken(seen, out, alias);
  }

  return out;
}

/**
 * French search tokens — FR display, FR-tagged aliases, shared neutral fields.
 */
export function buildMedicationSearchTokensFr(input: MedicationSearchTokenBuildInput): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  pushToken(seen, out, input.catalogCode.replace(/_/g, " "));
  pushToken(seen, out, input.genericName);
  pushToken(seen, out, input.displayNameFr);
  pushToken(seen, out, input.strength);
  pushToken(seen, out, input.dosageForm);
  pushToken(seen, out, input.route);
  pushToken(seen, out, input.therapeuticClass);

  for (const alias of aliasesForLocale(input.aliases, "fr")) {
    pushToken(seen, out, alias);
  }

  return out;
}

export type MedicationSearchTokensBuilt = {
  en: string[];
  fr: string[];
  /** Deduplicated merged tokens (canonical manifest searchTerms source). */
  terms: string[];
  /** Legacy combined blob for CatalogMedication.searchText until per-locale columns exist. */
  combined: string;
};

/**
 * Build EN + FR token sets and a deduplicated combined searchText string.
 */
export function buildMedicationSearchTokens(
  input: MedicationSearchTokenBuildInput
): MedicationSearchTokensBuilt {
  const en = buildMedicationSearchTokensEn(input);
  const fr = buildMedicationSearchTokensFr(input);
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const token of [...en, ...fr]) {
    if (seen.has(token)) continue;
    seen.add(token);
    merged.push(token);
  }
  return {
    en,
    fr,
    terms: merged,
    combined: merged.join(" "),
  };
}

/** Compare manifest searchTerms to builder output (strict mode for Wave 3+). */
export function medicationSearchTermsMatchBuilder(
  input: MedicationSearchTokenBuildInput,
  searchTerms: readonly string[] | undefined
): boolean {
  if (!searchTerms?.length) return false;
  const built = new Set(buildMedicationSearchTokens(input).terms);
  const manifest = new Set(
    searchTerms.map((t) => normalizeSearchToken(t)).filter((t) => t.length >= 2)
  );
  if (built.size !== manifest.size) return false;
  for (const token of built) {
    if (!manifest.has(token)) return false;
  }
  return true;
}
