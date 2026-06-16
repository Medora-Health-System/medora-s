import { describe, expect, it } from "vitest";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const TARGET_NAMESPACES = [
  "erMseMdmChips",
  "erMseMdmGuidance",
  "erMseHpiChipsTrauma",
  "erMseHpiChipsPediatric",
] as const;

/** UI panel chrome — not inserted into clinical note text. */
const EXCLUDED_CHIP_KEYS = new Set([
  "hint",
  "catWorkingAssessment",
  "catPlanSummary",
  "catImmediateActions",
  "catConsults",
  "catDisposition",
]);

const FORBIDDEN_EN_VALUE_PATTERNS = [
  /\breviewed\b/i,
  /\bassessed\b/i,
  /\bconsidered\b/i,
  /\bcompleted\b/i,
  /\bdocumented\b/i,
  /\bnoted\b/i,
  /\bif applicable\b/i,
  /\bif indicated\b/i,
  /\breviewed if available\b/i,
  /\bper clinical assessment\b/i,
  /\bper protocol\b/i,
  /\breview whether\b/i,
  /\bassess for\b/i,
  /\bconsider documenting\b/i,
  /\bdocument if\b/i,
] as const;

const FORBIDDEN_FR_VALUE_PATTERNS = [
  /\brevu(e?s?)?\b/i,
  /\bévalué(e?s?)?\b/i,
  /\bdocumenté(e?s?)?\b/i,
  /\bsi applicable\b/i,
  /\bsi indiqué(e)?\b/i,
  /\bselon l['']évaluation clinique\b/i,
  /\bselon protocole\b/i,
  /\benvisagé(e?s?)?\b/i,
] as const;

function namespaceRecord(
  messages: Record<string, unknown>,
  namespace: (typeof TARGET_NAMESPACES)[number]
): Record<string, string> {
  const record = messages[namespace];
  if (!record || typeof record !== "object") {
    throw new Error(`Missing namespace ${namespace}`);
  }
  return record as Record<string, string>;
}

function scanNamespaceValues(
  messages: Record<string, string>,
  patterns: readonly RegExp[],
  excludeKeys: ReadonlySet<string>
): Array<{ key: string; value: string; pattern: string }> {
  const hits: Array<{ key: string; value: string; pattern: string }> = [];
  for (const [key, value] of Object.entries(messages)) {
    if (excludeKeys.has(key)) continue;
    for (const pattern of patterns) {
      if (pattern.test(value)) {
        hits.push({ key, value, pattern: pattern.source });
      }
    }
  }
  return hits;
}

describe("providerDocumentationSharedUtilityValueModernization — MEDUI.ED.POSTCERT.1A", () => {
  it.each(TARGET_NAMESPACES)("preserves EN key set for %s", (namespace) => {
    const enKeys = Object.keys(namespaceRecord(enMessages as Record<string, unknown>, namespace)).sort();
    const frKeys = Object.keys(namespaceRecord(frMessages as Record<string, unknown>, namespace)).sort();
    expect(frKeys).toEqual(enKeys);
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it.each(TARGET_NAMESPACES)("has zero forbidden EN rendered values in %s", (namespace) => {
    const hits = scanNamespaceValues(
      namespaceRecord(enMessages as Record<string, unknown>, namespace),
      FORBIDDEN_EN_VALUE_PATTERNS,
      EXCLUDED_CHIP_KEYS
    );
    expect(hits, JSON.stringify(hits, null, 2)).toEqual([]);
  });

  it.each(TARGET_NAMESPACES)("has zero forbidden FR rendered values in %s", (namespace) => {
    const hits = scanNamespaceValues(
      namespaceRecord(frMessages as Record<string, unknown>, namespace),
      FORBIDDEN_FR_VALUE_PATTERNS,
      EXCLUDED_CHIP_KEYS
    );
    expect(hits, JSON.stringify(hits, null, 2)).toEqual([]);
  });

  it("reports expected namespace key counts", () => {
    expect(Object.keys(namespaceRecord(enMessages as Record<string, unknown>, "erMseMdmChips")).length).toBe(34);
    expect(Object.keys(namespaceRecord(enMessages as Record<string, unknown>, "erMseMdmGuidance")).length).toBe(40);
    expect(Object.keys(namespaceRecord(enMessages as Record<string, unknown>, "erMseHpiChipsTrauma")).length).toBe(21);
    expect(Object.keys(namespaceRecord(enMessages as Record<string, unknown>, "erMseHpiChipsPediatric")).length).toBe(16);
  });

  it("remediates representative shared utility chip values", () => {
    expect(enMessages.erMseMdmChips.planSdM).toBe("shared decision-making discussed");
    expect(enMessages.erMseMdmChips.dispReturnPrecautions).toBe("return precautions provided");
    expect(enMessages.erMseMdmChips.dispObs).toBe("observation needed for continued reassessment");
    expect(enMessages.erMseHpiChipsTrauma.mechanismReviewed).toBe("injury mechanism reported");
    expect(enMessages.erMseHpiChipsPediatric.hydrationStatusReviewed).toBe("hydration status described");
    expect(enMessages.erMseMdmGuidance.traumaSurveyDocumented).toBe("initial trauma survey performed");
    expect(frMessages.erMseMdmChips.dispDcCriteria).toBe("critères de sortie remplis");
    expect(frMessages.erMseHpiChipsTrauma.restraintUseReviewed).toBe("ceinture ou contention rapportée");
  });
});
