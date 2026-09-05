/**
 * Narrow SEARCH-ONLY Spanish aliases tied to governed exact ICD concepts.
 * Never used as clinician displayName. No generic "dolor" → all pain mapping.
 */

export type GovernedIcd10SearchAliasSeed = {
  normalizedCode: string;
  locale: "es";
  aliasText: string;
};

const ABDOMINAL_PAIN_NORMALIZED = ["R1084", "R1085", "R109", "R1010"] as const;
const VOMIT_NORMALIZED = "R1110";

export function buildGovernedSpanishSearchAliasSeeds(
  governedNormalizedCodes: ReadonlySet<string>,
): GovernedIcd10SearchAliasSeed[] {
  const out: GovernedIcd10SearchAliasSeed[] = [];
  for (const code of ABDOMINAL_PAIN_NORMALIZED) {
    if (!governedNormalizedCodes.has(code)) continue;
    out.push({ normalizedCode: code, locale: "es", aliasText: "dolor abdominal" });
  }
  if (governedNormalizedCodes.has(VOMIT_NORMALIZED)) {
    out.push({ normalizedCode: VOMIT_NORMALIZED, locale: "es", aliasText: "vómito" });
    out.push({ normalizedCode: VOMIT_NORMALIZED, locale: "es", aliasText: "vómitos" });
  }
  return out;
}
