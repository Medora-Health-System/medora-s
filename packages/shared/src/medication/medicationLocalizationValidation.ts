/**
 * M1.7A.2 — Medication localization seed contract validation.
 */

import {
  buildMedicationSearchTokens,
  medicationSearchTermsMatchBuilder,
} from "./medicationSearchTokens.js";
import type {
  MedicationLocalizationAlias,
  MedicationLocalizationContract,
  MedicationLocalizationLocale,
  MedicationLocalizationBatchResult,
  MedicationLocalizationValidationIssue,
  MedicationLocalizationValidationResult,
} from "./medicationLocalizationTypes.js";
import { MEDICATION_LOCALIZATION_LOCALES } from "./medicationLocalizationTypes.js";

export type ValidateMedicationLocalizationOptions = {
  /** Require at least one alias per locale (default true for Wave 3+). */
  requireAliasesPerLocale?: boolean;
  /** Fail when legacy searchTerms diverge from token builders (Wave 3+). */
  strictSearchTerms?: boolean;
  /** Allow displayNameEn === displayNameFr when both are INN-only (no French markers). */
  allowInnDisplayMirror?: boolean;
};

const DEFAULT_OPTIONS: Required<ValidateMedicationLocalizationOptions> = {
  requireAliasesPerLocale: true,
  strictSearchTerms: false,
  allowInnDisplayMirror: true,
};

const FRENCH_DIACRITICS_RE = /[àâäéèêëïîôùûüçœæ]/i;
const FRENCH_FORM_WORDS_RE =
  /\b(comprimé|comprime|gélule|gelule|suspension|buvable|intraveineuse|intramusculaire|orale|injectable|antibiotique|antipyrétique|antipyrétique)\b/i;
const ENGLISH_FORM_WORDS_RE = /\b(tablet|tablets|capsule|capsules|oral|injection|injectable|solution|suspension)\b/i;

function isSupportedLocale(value: string): value is MedicationLocalizationLocale {
  return (MEDICATION_LOCALIZATION_LOCALES as readonly string[]).includes(value);
}

function normalizeAliasKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function looksFrenchLocalizedText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return FRENCH_DIACRITICS_RE.test(t) || FRENCH_FORM_WORDS_RE.test(t);
}

export function looksEnglishFormText(text: string): boolean {
  return ENGLISH_FORM_WORDS_RE.test(text.trim());
}

function issue(
  catalogCode: string,
  kind: MedicationLocalizationValidationIssue["kind"],
  message: string,
  field?: string,
  severity: MedicationLocalizationValidationIssue["severity"] = "blocking"
): MedicationLocalizationValidationIssue {
  return { catalogCode, kind, message, field, severity };
}

/**
 * Validate one medication localization contract (fail-closed for blocking issues).
 */
export function validateMedicationLocalization(
  contract: MedicationLocalizationContract,
  options: ValidateMedicationLocalizationOptions = {}
): MedicationLocalizationValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: MedicationLocalizationValidationIssue[] = [];
  const code = contract.catalogCode.trim() || "*";

  if (!contract.catalogCode.trim()) {
    issues.push(issue("*", "MISSING_DISPLAY_EN", "catalogCode is required"));
  }
  if (!contract.genericName.trim()) {
    issues.push(issue(code, "MISSING_DISPLAY_EN", "genericName is required", "genericName"));
  }

  const displayEn = contract.displayNameEn?.trim() ?? "";
  const displayFr = contract.displayNameFr?.trim() ?? "";

  if (!displayEn) {
    issues.push(issue(code, "MISSING_DISPLAY_EN", "displayNameEn is required", "displayNameEn"));
  }
  if (!displayFr) {
    issues.push(issue(code, "MISSING_DISPLAY_FR", "displayNameFr is required", "displayNameFr"));
  }
  if (displayEn && displayFr && displayEn === displayFr && looksFrenchLocalizedText(displayEn)) {
    issues.push(
      issue(
        code,
        "DISPLAY_MIRROR_WITHOUT_OVERRIDE",
        "displayNameEn equals displayNameFr but contains French markers — provide distinct English displayNameEn",
        "displayNameEn"
      )
    );
  }
  if (displayEn && looksFrenchLocalizedText(displayEn) && displayEn !== displayFr) {
    issues.push(
      issue(
        code,
        "DISPLAY_MIRROR_WITHOUT_OVERRIDE",
        "displayNameEn must not contain French-only forms or diacritics",
        "displayNameEn"
      )
    );
  }

  if (!contract.aliases?.length) {
    issues.push(issue(code, "MISSING_TAGGED_ALIAS", "at least one language-tagged alias is required", "aliases"));
  }

  const seenByLocale: Record<MedicationLocalizationLocale, Set<string>> = {
    en: new Set(),
    fr: new Set(),
  };
  let enCount = 0;
  let frCount = 0;

  for (const raw of contract.aliases ?? []) {
    const alias = raw as MedicationLocalizationAlias;
    const text = alias.text?.trim() ?? "";
    const language = alias.language;

    if (!text) {
      issues.push(issue(code, "BLANK_DISPLAY", "alias text is blank", "aliases"));
      continue;
    }
    if (!language || !isSupportedLocale(language)) {
      issues.push(
        issue(code, "INVALID_LOCALE", `alias language must be fr or en (got ${String(language)})`, "aliases")
      );
      continue;
    }

    const key = normalizeAliasKey(text);
    if (seenByLocale[language].has(key)) {
      issues.push(
        issue(
          code,
          "DUPLICATE_ALIAS",
          `duplicate ${language} alias: ${text}`,
          "aliases"
        )
      );
    } else {
      seenByLocale[language].add(key);
    }

    if (language === "en") {
      enCount += 1;
      if (looksFrenchLocalizedText(text)) {
        issues.push(
          issue(
            code,
            "ALIAS_LANGUAGE_MISMATCH",
            `English-tagged alias contains French text: ${text}`,
            "aliases"
          )
        );
      }
    } else {
      frCount += 1;
      if (looksEnglishFormText(text) && !looksFrenchLocalizedText(text)) {
        issues.push(
          issue(
            code,
            "ALIAS_LANGUAGE_MISMATCH",
            `French-tagged alias appears English-only form/brand: ${text}`,
            "aliases"
          )
        );
      }
    }
  }

  if (opts.requireAliasesPerLocale) {
    if (enCount === 0) {
      issues.push(
        issue(code, "MISSING_TAGGED_ALIAS", "at least one English-tagged alias is required", "aliases")
      );
    }
    if (frCount === 0) {
      issues.push(
        issue(code, "MISSING_TAGGED_ALIAS", "at least one French-tagged alias is required", "aliases")
      );
    }
  }

  if (opts.strictSearchTerms && contract.searchTerms?.length) {
    if (!medicationSearchTermsMatchBuilder(contract, contract.searchTerms)) {
      issues.push(
        issue(
          code,
          "SEARCH_TERMS_DRIFT",
          "searchTerms must match buildMedicationSearchTokens() output — do not hand-concatenate",
          "searchTerms"
        )
      );
    }
  }

  const blocking = issues.filter((i) => i.severity === "blocking");
  return {
    pass: blocking.length === 0,
    catalogCode: code,
    issues,
  };
}

export function assertMedicationLocalization(
  contract: MedicationLocalizationContract,
  options?: ValidateMedicationLocalizationOptions
): void {
  const result = validateMedicationLocalization(contract, options);
  const blocking = result.issues.filter((i) => i.severity === "blocking");
  if (blocking.length > 0) {
    throw new Error(
      `[medication-localization] ${result.catalogCode}: ${blocking.map((i) => i.message).join("; ")}`
    );
  }
}

/**
 * Infer language tags for legacy string[] alias lists (Wave 1/2 manifests).
 */
export function inferLocalizationAliasesFromStrings(
  aliases: readonly string[],
  options?: { dedupeNormalized?: boolean }
): MedicationLocalizationAlias[] {
  const seen = new Set<string>();
  const out: MedicationLocalizationAlias[] = [];
  for (const raw of aliases) {
    const text = raw.trim();
    if (!text) continue;
    const language: MedicationLocalizationLocale = looksFrenchLocalizedText(text) ? "fr" : "en";
    const key = `${language}:${normalizeAliasKey(text)}`;
    if (options?.dedupeNormalized && seen.has(key)) continue;
    seen.add(key);
    out.push({ text, language: language, aliasType: "OTHER" });
  }
  return out;
}

/** Map enterprise formulary manifest row → localization contract. */
export function enterpriseFormularyEntryToLocalizationContract(entry: {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  aliases: readonly string[];
  searchTerms?: readonly string[];
  strength?: string;
  dosageForm?: string;
  route?: string;
  therapeuticClass?: string;
}): MedicationLocalizationContract {
  return {
    catalogCode: entry.catalogCode,
    genericName: entry.genericName,
    displayNameFr: entry.displayNameFr,
    displayNameEn: entry.displayNameEn,
    aliases: inferLocalizationAliasesFromStrings(entry.aliases, { dedupeNormalized: true }),
    searchTerms: entry.searchTerms,
    strength: entry.strength,
    dosageForm: entry.dosageForm,
    route: entry.route,
    therapeuticClass: entry.therapeuticClass,
  };
}

/**
 * Validate a batch of formulary entries (Wave 1–5 manifests).
 */
export function validateEnterpriseFormularyLocalizationBatch(
  entries: Array<{
    catalogCode: string;
    genericName: string;
    displayNameFr: string;
    displayNameEn: string;
    aliases: readonly string[];
    searchTerms?: readonly string[];
    strength?: string;
    dosageForm?: string;
    route?: string;
    therapeuticClass?: string;
  }>,
  options?: ValidateMedicationLocalizationOptions
): MedicationLocalizationBatchResult {
  const legacyOpts: ValidateMedicationLocalizationOptions = {
    requireAliasesPerLocale: false,
    strictSearchTerms: false,
    allowInnDisplayMirror: true,
    ...options,
  };

  const issues: MedicationLocalizationValidationIssue[] = [];
  const codes = new Set<string>();

  for (const entry of entries) {
    if (codes.has(entry.catalogCode)) {
      issues.push(
        issue(entry.catalogCode, "DUPLICATE_ALIAS", `duplicate catalogCode ${entry.catalogCode}`)
      );
    }
    codes.add(entry.catalogCode);

    const contract = enterpriseFormularyEntryToLocalizationContract(entry);
    const result = validateMedicationLocalization(contract, legacyOpts);
    issues.push(...result.issues);
  }

  const blocking = issues.filter((i) => i.severity === "blocking");
  return {
    pass: blocking.length === 0,
    issues,
    validatedCount: entries.length,
  };
}

/**
 * Wave 3+ readiness — strict bilingual + tagged aliases + builder-aligned searchTerms.
 */
export function validateEnterpriseWaveFormularyLocalizationReady(
  contracts: readonly MedicationLocalizationContract[]
): MedicationLocalizationBatchResult {
  const issues: MedicationLocalizationValidationIssue[] = [];

  for (const contract of contracts) {
    const result = validateMedicationLocalization(contract, {
      requireAliasesPerLocale: true,
      strictSearchTerms: true,
      allowInnDisplayMirror: true,
    });
    issues.push(...result.issues);

    const built = buildMedicationSearchTokens(contract);
    if (!contract.searchTerms?.length) {
      issues.push(
        issue(
          contract.catalogCode,
          "SEARCH_TERMS_DRIFT",
          "searchTerms required for Wave 3+ — populate via buildMedicationSearchTokens().combined split or explicit array",
          "searchTerms",
          "blocking"
        )
      );
    } else if (!medicationSearchTermsMatchBuilder(contract, contract.searchTerms)) {
      issues.push(
        issue(
          contract.catalogCode,
          "SEARCH_TERMS_DRIFT",
          "searchTerms must equal buildMedicationSearchTokens() tokens",
          "searchTerms"
        )
      );
    }

    if (built.combined.length < 4) {
      issues.push(
        issue(
          contract.catalogCode,
          "SEARCH_TERMS_DRIFT",
          "combined search tokens too short",
          "searchTerms",
          "warning"
        )
      );
    }
  }

  const blocking = issues.filter((i) => i.severity === "blocking");
  return {
    pass: blocking.length === 0,
    issues,
    validatedCount: contracts.length,
  };
}

export function assertEnterpriseWaveFormularyLocalizationReady(
  contracts: readonly MedicationLocalizationContract[]
): void {
  const result = validateEnterpriseWaveFormularyLocalizationReady(contracts);
  if (!result.pass) {
    const msgs = result.issues
      .filter((i) => i.severity === "blocking")
      .map((i) => `${i.catalogCode}: ${i.message}`);
    throw new Error(`[medication-localization] wave not ready: ${msgs.join("; ")}`);
  }
}

/** Export searchTerms array from builder for manifest authors. */
export function buildMedicationSearchTermsArray(
  input: Parameters<typeof buildMedicationSearchTokens>[0]
): string[] {
  return buildMedicationSearchTokens(input).terms;
}
