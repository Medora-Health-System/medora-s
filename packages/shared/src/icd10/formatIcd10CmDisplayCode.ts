import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";

/** Canonical dotted ICD-10-CM display form (e.g. R1085 → R10.85). */
export function formatIcd10CmDisplayCode(raw: string): string {
  const normalized = normalizeIcd10CodeForLookup(raw);
  if (!normalized) return "";
  if (normalized.length <= 3) return normalized;
  return `${normalized.slice(0, 3)}.${normalized.slice(3)}`;
}
