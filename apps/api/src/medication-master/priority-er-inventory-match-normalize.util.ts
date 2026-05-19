/**
 * Normalization for duplicate matching only — never applied to stored source fields.
 * Phase 19E.1
 */

export function normalizeMedicationNameForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s/'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDoseForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeFormForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
