/**
 * ER-1.1 — Light ICD-10-CM *format* guardrails (not WHO/CMS clinical validity).
 *
 * Used to reject obviously invalid manual/legacy codes. Catalog-backed rows skip this
 * (the reference table is the source of truth for those codes).
 */

/** Uppercase, dotless, spaceless form for pattern checks. */
export function normalizeIcd10CodeForValidation(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, "");
}

/**
 * True if the string looks like a typical ICD-10-CM category + optional extension
 * (letter, two digits, then up to five alphanumeric extension chars; max 8 chars dotless).
 *
 * This does **not** prove the code exists in the official tabular list.
 */
export function isIcd10CmLikeCodeFormat(raw: string): boolean {
  const s = normalizeIcd10CodeForValidation(raw);
  if (s.length < 3 || s.length > 8) return false;
  return /^[A-TV-Z]\d{2}[\dA-TV-Z]{0,5}$/.test(s);
}

/** Stable machine token for API errors / client detection (translate in UI). */
export const DIAGNOSIS_INVALID_ICD_FORMAT = "DIAGNOSIS_INVALID_ICD_FORMAT";
