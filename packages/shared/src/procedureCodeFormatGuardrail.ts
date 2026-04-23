/**
 * ER-2 — Light *format* guardrails for manual CPT/HCPCS-style entry (not AMA/CMS validity).
 */

export function normalizeProcedureCodeForValidation(raw: string, system: "CPT" | "HCPCS"): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
  if (system === "CPT") return s.replace(/[^0-9]/g, "");
  return s;
}

function normalizeCptDisplay(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/\./g, "");
}

/** Typical 5-digit CPT numeric code (modifiers belong in separate fields). */
export function isCptNumericLikeFormat(raw: string): boolean {
  const s = normalizeCptDisplay(raw);
  return /^\d{5}$/.test(s);
}

/**
 * Typical HCPCS Level II pattern: 5 characters, leading letter (common CMS-style form).
 * Does not prove CMS coverage or pricing.
 */
export function isHcpcsLevelIiLikeFormat(raw: string): boolean {
  const s = normalizeProcedureCodeForValidation(raw, "HCPCS");
  return /^[A-Z][A-Z0-9]{4}$/.test(s);
}

export function isProcedureCodeLikeForSystem(raw: string, system: "CPT" | "HCPCS"): boolean {
  return system === "CPT" ? isCptNumericLikeFormat(raw) : isHcpcsLevelIiLikeFormat(raw);
}

export const PROCEDURE_INVALID_CODE_FORMAT = "PROCEDURE_INVALID_CODE_FORMAT";

/** API / UI token when a second identical procedure capture is blocked (ER-2.1). */
export const PROCEDURE_DUPLICATE_BLOCKED = "PROCEDURE_DUPLICATE_BLOCKED" as const;
