/**
 * ER-3 medication billing foundation: deterministic NDC normalization.
 * Accepts common dashed/spaced input and stores canonical 11-digit form.
 * This is format normalization only (not full payer-specific validation).
 */

export type NdcNormalizeResult =
  | { ok: true; ndc11: string; ndcDisplay: string }
  | { ok: false; reason: "EMPTY" | "INVALID_FORMAT" };

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Accept 10-digit (4-4-2 / 5-3-2 / 5-4-1 via dashes) or canonical 11-digit.
 * If 10-digit is not dashed, reject to avoid ambiguous zero-padding guesses.
 */
export function normalizeNdc(raw: string): NdcNormalizeResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "EMPTY" };
  const compact = trimmed.replace(/\s+/g, "");
  const parts = compact.split("-").filter(Boolean);

  if (parts.length === 3) {
    if (!parts.every((p) => /^\d+$/.test(p))) return { ok: false, reason: "INVALID_FORMAT" };
    const [a, b, c] = parts;
    if (!a || !b || !c) return { ok: false, reason: "INVALID_FORMAT" };
    let ndc11 = "";
    if (a.length === 4 && b.length === 4 && c.length === 2) ndc11 = `0${a}${b}${c}`;
    else if (a.length === 5 && b.length === 3 && c.length === 2) ndc11 = `${a}0${b}${c}`;
    else if (a.length === 5 && b.length === 4 && c.length === 1) ndc11 = `${a}${b}0${c}`;
    else return { ok: false, reason: "INVALID_FORMAT" };
    return { ok: true, ndc11, ndcDisplay: `${ndc11.slice(0, 5)}-${ndc11.slice(5, 9)}-${ndc11.slice(9)}` };
  }

  const d = digitsOnly(compact);
  if (d.length === 11) {
    return { ok: true, ndc11: d, ndcDisplay: `${d.slice(0, 5)}-${d.slice(5, 9)}-${d.slice(9)}` };
  }
  return { ok: false, reason: "INVALID_FORMAT" };
}
