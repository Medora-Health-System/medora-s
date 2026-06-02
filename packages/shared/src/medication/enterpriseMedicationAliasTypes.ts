/**
 * M1.6C — Enterprise medication search / alias manifest types.
 */

export type EnterpriseMedicationAliasCategory =
  | "ANTICOAG"
  | "CARDIOVASCULAR"
  | "DIABETES"
  | "GI"
  | "ER"
  | "CONTROLLED"
  | "VACCINE"
  | "CHRONIC"
  | "PSYCH"
  | "OTHER";

export type EnterpriseMedicationAliasKind =
  | "BRAND"
  | "GENERIC"
  | "ABBREV"
  | "SHORTHAND"
  | "PATIENT_TERM"
  | "FR"
  | "MISSPELLING";

export type EnterpriseMedicationAliasLine = {
  text: string;
  kind: EnterpriseMedicationAliasKind;
};

export type EnterpriseMedicationAliasManifestEntry = {
  catalogCode: string;
  genericName: string;
  category: EnterpriseMedicationAliasCategory;
  aliases: readonly EnterpriseMedicationAliasLine[];
};

/** Typo resolves only to a canonical token on the same catalog row (no cross-drug fuzzy match). */
export type EnterpriseMedicationSearchTypo = {
  catalogCode: string;
  typo: string;
  canonical: string;
};

export type EnterpriseMedicationSearchPair = {
  generic: string;
  brand: string;
  /** Optional catalog code when multiple strengths exist — pair validated on this row only. */
  catalogCode?: string;
};

export type EnterpriseMedicationSearchCatalogHit = {
  catalogCode: string;
  genericName: string | null;
  aliases: string[];
  searchText?: string | null;
};
