import {
  getMedicationFrequencyDefinition,
  type MedicationFrequencyCode,
} from "./medicationFrequencyCatalog.js";

export type MedicationFrequencyNormalizationConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type MedicationFrequencyNormalizationResult = {
  frequencyCode: MedicationFrequencyCode | null;
  confidence: MedicationFrequencyNormalizationConfidence;
  prnModifier: boolean;
  ambiguousMatches: MedicationFrequencyCode[];
  sourceText: string;
};

type AliasRule = {
  frequencyCode: MedicationFrequencyCode;
  aliases: readonly string[];
  confidence: MedicationFrequencyNormalizationConfidence;
};

/**
 * Advisory sig → frequency mapping for future order-entry assist (M1.8B.6).
 * Never auto-persists — provider must confirm structured frequency on write.
 */
const MEDICATION_FREQUENCY_ALIAS_RULES: readonly AliasRule[] = [
  { frequencyCode: "ONCE", aliases: ["once", "one time", "x1", "dose unique"], confidence: "HIGH" },
  { frequencyCode: "NOW", aliases: ["now", "give now", "immediately"], confidence: "HIGH" },
  { frequencyCode: "STAT", aliases: ["stat"], confidence: "HIGH" },
  { frequencyCode: "DAILY", aliases: ["daily", "qd", "q.d.", "once daily", "quotidien"], confidence: "HIGH" },
  { frequencyCode: "BID", aliases: ["bid", "b.i.d.", "twice daily", "2x daily", "2x/day"], confidence: "HIGH" },
  { frequencyCode: "TID", aliases: ["tid", "t.i.d.", "three times daily", "3x daily", "3x/day"], confidence: "HIGH" },
  { frequencyCode: "QID", aliases: ["qid", "q.i.d.", "four times daily", "4x daily", "4x/day"], confidence: "HIGH" },
  { frequencyCode: "Q2H", aliases: ["q2h", "every 2 hours", "q 2 h"], confidence: "HIGH" },
  { frequencyCode: "Q3H", aliases: ["q3h", "every 3 hours", "q 3 h"], confidence: "HIGH" },
  { frequencyCode: "Q4H", aliases: ["q4h", "every 4 hours", "q 4 h"], confidence: "HIGH" },
  { frequencyCode: "Q6H", aliases: ["q6h", "every 6 hours", "q 6 h", "6h"], confidence: "HIGH" },
  { frequencyCode: "Q8H", aliases: ["q8h", "every 8 hours", "q 8 h", "8h"], confidence: "HIGH" },
  { frequencyCode: "Q12H", aliases: ["q12h", "every 12 hours", "q12", "q 12 h"], confidence: "HIGH" },
  { frequencyCode: "Q24H", aliases: ["q24h", "every 24 hours"], confidence: "MEDIUM" },
  { frequencyCode: "AC", aliases: ["ac", "a.c.", "before meals", "avant repas"], confidence: "HIGH" },
  { frequencyCode: "PC", aliases: ["pc", "p.c.", "after meals", "apres repas"], confidence: "HIGH" },
  { frequencyCode: "HS", aliases: ["hs", "h.s.", "at bedtime", "bedtime", "au coucher"], confidence: "HIGH" },
  {
    frequencyCode: "ACHS",
    aliases: ["achs", "a.c. h.s.", "before meals and bedtime", "avant repas et coucher"],
    confidence: "HIGH",
  },
  { frequencyCode: "PRN", aliases: ["prn", "p.r.n.", "as needed", "selon besoin", "pm"], confidence: "HIGH" },
  { frequencyCode: "WEEKLY", aliases: ["weekly", "once weekly", "qweek"], confidence: "HIGH" },
  { frequencyCode: "MONTHLY", aliases: ["monthly", "once monthly"], confidence: "HIGH" },
  { frequencyCode: "CONTINUOUS", aliases: ["continuous", "continuous infusion", "drip", "infusion"], confidence: "MEDIUM" },
  { frequencyCode: "TAPER", aliases: ["taper", "tapering"], confidence: "MEDIUM" },
] as const;

const PRN_MARKERS = ["prn", "p.r.n.", "as needed", "selon besoin"] as const;

function normalizeSigToken(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip common dose/route prefixes before frequency token matching. */
function stripLeadingDoseRoutePrefix(normalized: string): string {
  return normalized
    .replace(/^\d+(\.\d+)?\s*(tab|tabs|tablet|tablets|cap|caps|ml|mg|mcg|g|unit|units)\s*/i, "")
    .replace(/^(po|iv|ivp|ivpb|im|sq|sc)\s+/i, "")
    .trim();
}

export function normalizeMedicationFrequencyFromSig(
  sigText: string | null | undefined
): MedicationFrequencyNormalizationResult {
  const sourceText = typeof sigText === "string" ? sigText.trim() : "";
  if (!sourceText) {
    return {
      frequencyCode: null,
      confidence: "NONE",
      prnModifier: false,
      ambiguousMatches: [],
      sourceText,
    };
  }

  const normalized = stripLeadingDoseRoutePrefix(normalizeSigToken(sourceText));
  const prnModifier = PRN_MARKERS.some((m) => normalized.includes(m));

  const matches: { code: MedicationFrequencyCode; confidence: MedicationFrequencyNormalizationConfidence }[] =
    [];

  for (const rule of MEDICATION_FREQUENCY_ALIAS_RULES) {
    for (const alias of rule.aliases) {
      const a = normalizeSigToken(alias);
      if (!a) continue;
      if (normalized === a || normalized.includes(` ${a} `) || normalized.startsWith(`${a} `) || normalized.endsWith(` ${a}`)) {
        matches.push({ code: rule.frequencyCode, confidence: rule.confidence });
        break;
      }
    }
  }

  let uniqueCodes = [...new Set(matches.map((m) => m.code))];
  if (uniqueCodes.length === 0) {
    return {
      frequencyCode: null,
      confidence: "NONE",
      prnModifier,
      ambiguousMatches: [],
      sourceText,
    };
  }

  // "q6h PRN" → interval base + PRN modifier, not standalone PRN.
  if (prnModifier && uniqueCodes.includes("PRN") && uniqueCodes.length > 1) {
    const intervalCandidates = uniqueCodes.filter(
      (c) => c !== "PRN" && getMedicationFrequencyDefinition(c)?.prnModifierAllowed === true
    );
    if (intervalCandidates.length === 1) {
      uniqueCodes = intervalCandidates;
    }
  }

  if (uniqueCodes.length > 1) {
    return {
      frequencyCode: null,
      confidence: "LOW",
      prnModifier,
      ambiguousMatches: uniqueCodes,
      sourceText,
    };
  }

  const code = uniqueCodes[0]!;
  const confidence = matches
    .filter((m) => m.code === code)
    .reduce<MedicationFrequencyNormalizationConfidence>((best, m) => {
      if (m.confidence === "HIGH") return "HIGH";
      if (m.confidence === "MEDIUM" && best !== "HIGH") return "MEDIUM";
      return best;
    }, "LOW");

  if (code === "PRN" || (prnModifier && getMedicationFrequencyDefinition(code)?.prnModifierAllowed)) {
    return {
      frequencyCode: code,
      confidence: code === "PRN" ? "HIGH" : confidence,
      prnModifier: prnModifier || code === "PRN",
      ambiguousMatches: [],
      sourceText,
    };
  }

  return {
    frequencyCode: code,
    confidence,
    prnModifier,
    ambiguousMatches: [],
    sourceText,
  };
}
