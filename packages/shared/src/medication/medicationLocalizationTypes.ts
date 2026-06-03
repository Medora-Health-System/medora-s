/**
 * M1.7A.2 — Medication localization seed contract types (clinical identity stays language-neutral).
 */

export const MEDICATION_LOCALIZATION_LOCALES = ["fr", "en"] as const;

export type MedicationLocalizationLocale = (typeof MEDICATION_LOCALIZATION_LOCALES)[number];

export type MedicationLocalizationAliasType =
  | "BRAND"
  | "GENERIC"
  | "ABBREV"
  | "SHORTHAND"
  | "PATIENT_TERM"
  | "MISSPELLING"
  | "OTHER";

/** Language-tagged alias required on all future enterprise formulary seeds. */
export type MedicationLocalizationAlias = {
  text: string;
  language: MedicationLocalizationLocale;
  aliasType?: MedicationLocalizationAliasType;
};

/**
 * Bilingual localization contract for one catalog medication row (seed / manifest).
 * `catalogCode` + `genericName` are language-neutral clinical identity.
 */
export type MedicationLocalizationContract = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  aliases: readonly MedicationLocalizationAlias[];
  strength?: string;
  dosageForm?: string;
  route?: string;
  therapeuticClass?: string;
  /** Legacy manifest field — validated against token builders when strictSearchTerms is enabled. */
  searchTerms?: readonly string[];
};

export type MedicationLocalizationValidationIssue = {
  catalogCode: string;
  field?: string;
  kind:
    | "MISSING_DISPLAY_EN"
    | "MISSING_DISPLAY_FR"
    | "BLANK_DISPLAY"
    | "INVALID_LOCALE"
    | "DUPLICATE_ALIAS"
    | "ALIAS_LANGUAGE_MISMATCH"
    | "DISPLAY_MIRROR_WITHOUT_OVERRIDE"
    | "SEARCH_TERMS_DRIFT"
    | "MISSING_TAGGED_ALIAS";
  message: string;
  severity: "blocking" | "warning";
};

export type MedicationLocalizationValidationResult = {
  pass: boolean;
  catalogCode: string;
  issues: MedicationLocalizationValidationIssue[];
};

export type MedicationLocalizationBatchResult = {
  pass: boolean;
  issues: MedicationLocalizationValidationIssue[];
  validatedCount: number;
};
