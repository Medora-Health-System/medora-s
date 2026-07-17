export type RxNormRowChecksumFields = {
  rxcui: string;
  termType: string;
  displayTerm: string;
  language?: string | null;
  suppressFlag?: string | null;
  sourceCode?: string | null;
  ingredientIdentity?: string | null;
  strengthText?: string | null;
  doseFormText?: string | null;
  brandName?: string | null;
};

const CHECKSUM_FIELD_ORDER: (keyof RxNormRowChecksumFields)[] = [
  "rxcui",
  "termType",
  "displayTerm",
  "language",
  "suppressFlag",
  "sourceCode",
  "ingredientIdentity",
  "strengthText",
  "doseFormText",
  "brandName",
];

const UNIT_TOKEN_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bMG\b/gi, "mg"],
  [/\bML\b/gi, "ml"],
  [/\bMCG\b/gi, "mcg"],
  [/\bG\b/gi, "g"],
  [/\bUNIT\b/gi, "unit"],
  [/\bUNITS\b/gi, "units"],
];

/**
 * Normalizes RxNorm display text for search/matching only.
 * Original displayTerm must be preserved separately.
 */
export function normalizeRxNormDisplayTerm(displayTerm: string): string {
  const nfkc = displayTerm.normalize("NFKC");
  const collapsed = nfkc.replace(/\s+/g, " ").trim();
  return normalizeUnitTokens(collapsed).toLowerCase();
}

/** Light unit token normalization without rewriting clinical strength semantics. */
export function normalizeUnitTokens(text: string): string {
  let out = text;
  for (const [pattern, replacement] of UNIT_TOKEN_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s+/g, " ").trim();
}

function normalizeChecksumPart(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * Stable joined key for row checksum hashing.
 * Actual sha256 is computed in the API layer (`rxnorm-row-checksum.ts`).
 */
export function buildRxNormRowChecksumKey(fields: RxNormRowChecksumFields): string {
  return CHECKSUM_FIELD_ORDER.map((key) => normalizeChecksumPart(fields[key] ?? "")).join("\x1f");
}
