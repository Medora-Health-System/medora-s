/**
 * Deterministic ICD-10-CM code normalization for lookup / dedupe (ER-1).
 * Does not validate code structure against the official code set.
 */

export function normalizeIcd10CodeForLookup(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/\./g, "");
}
