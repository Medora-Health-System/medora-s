/**
 * Lab result L/H flags from numeric values and reference ranges (display only).
 * Does not alter stored results or critical-value workflow.
 */

export type LabResultReferenceFlag = "H" | "L" | null;

/** Strip units and normalize numeric token for comparison. */
export function parseLabNumericValue(raw: string | null | undefined): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const match = text.match(/-?\d[\d\s.,]*/);
  if (!match) return null;

  let token = match[0].replace(/\s+/g, "");
  const hasDot = token.includes(".");
  const hasComma = token.includes(",");

  if (hasDot && hasComma) {
    const lastDot = token.lastIndexOf(".");
    const lastComma = token.lastIndexOf(",");
    if (lastComma > lastDot) {
      token = token.replace(/\./g, "").replace(",", ".");
    } else {
      token = token.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = token.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      token = `${parts[0]}.${parts[1]}`;
    } else {
      token = token.replace(/,/g, "");
    }
  }

  const n = Number(token);
  return Number.isFinite(n) ? n : null;
}

export type ParsedLabReferenceRange = {
  low: number | null;
  high: number | null;
};

/** Parse human reference strings; returns null when range cannot be determined safely. */
export function parseLabReferenceRange(raw: string | null | undefined): ParsedLabReferenceRange | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const gtMatch = text.match(/^>\s*(-?\d[\d\s.,]*)/);
  if (gtMatch) {
    const low = parseLabNumericValue(gtMatch[1]);
    return low == null ? null : { low, high: null };
  }

  const ltMatch = text.match(/^<\s*(-?\d[\d\s.,]*)/);
  if (ltMatch) {
    const high = parseLabNumericValue(ltMatch[1]);
    return high == null ? null : { low: null, high };
  }

  const rangeMatch = text.match(
    /(-?\d[\d\s.,]*)\s*(?:–|—|-|\u2013|\u2014|to)\s*(-?\d[\d\s.,]*)/
  );
  if (rangeMatch) {
    const low = parseLabNumericValue(rangeMatch[1]);
    const high = parseLabNumericValue(rangeMatch[2]);
    if (low == null || high == null) return null;
    return { low: Math.min(low, high), high: Math.max(low, high) };
  }

  return null;
}

/** Compute H/L from value + reference; returns null when unknown (no guessing). */
export function computeLabResultFlagFromReference(
  valueRaw: string | null | undefined,
  referenceRaw: string | null | undefined
): LabResultReferenceFlag {
  const value = parseLabNumericValue(valueRaw);
  const range = parseLabReferenceRange(referenceRaw);
  if (value == null || range == null) return null;

  if (range.low != null && value < range.low) return "L";
  if (range.high != null && value > range.high) return "H";
  return null;
}

/** Detect explicit trailing H/L/C flags in pasted result text (not unit suffixes like mmol/L). */
export function extractExplicitLabResultFlag(
  value: string | null | undefined
): { cleanValue: string; flag: LabResultReferenceFlag | "HH" | "LL" | "C" | null } {
  let v = String(value ?? "").trim();
  let flag: LabResultReferenceFlag | "HH" | "LL" | "C" | null = null;

  const m = v.match(/\s+(HH|LL|H|L|C)\s*$/i);
  if (m) {
    const g = m[1].toUpperCase();
    if (g === "HH") flag = "HH";
    else if (g === "LL") flag = "LL";
    else if (g === "H") flag = "H";
    else if (g === "L") flag = "L";
    else if (g === "C") flag = "C";
    v = v.slice(0, m.index).trim();
  }

  if (/\bcritique\b/i.test(String(value ?? ""))) flag = "C";

  return { cleanValue: v, flag };
}

export function resolveLabParsedRowFlag(args: {
  value: string;
  ref?: string | null;
  explicitFlag?: LabResultReferenceFlag | "HH" | "LL" | "C" | null;
}): LabParsedRowFlag {
  if (args.explicitFlag === "HH" || args.explicitFlag === "LL") return args.explicitFlag;
  if (args.explicitFlag === "H" || args.explicitFlag === "L" || args.explicitFlag === "C") {
    return args.explicitFlag;
  }
  return computeLabResultFlagFromReference(args.value, args.ref ?? null);
}

export type LabParsedRowFlag = "H" | "L" | "HH" | "LL" | "C" | null;
