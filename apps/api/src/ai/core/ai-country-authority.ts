import type { AiJurisdiction } from "@medora/shared";

/**
 * AI-1 jurisdiction authority. The facility's persisted country, not the
 * browser locale, user language or model output, selects the jurisdiction.
 * Unknown jurisdictions remain unsupported; never substitute US rules.
 */
export type MedoraAiJurisdiction = Extract<AiJurisdiction, "US" | "DO" | "HT">;
export type MedoraAiLanguage = "en" | "es" | "fr";

export interface MedoraAiCountryAuthority {
  jurisdiction: MedoraAiJurisdiction;
  countryCode: MedoraAiJurisdiction;
  policyNamespace: "MEDORA_AI_US" | "MEDORA_AI_DO" | "MEDORA_AI_HT";
  documentationAndBillingRulesEnabled: false;
}

const AUTHORITIES: Record<MedoraAiJurisdiction, MedoraAiCountryAuthority> = {
  US: { jurisdiction: "US", countryCode: "US", policyNamespace: "MEDORA_AI_US", documentationAndBillingRulesEnabled: false },
  DO: { jurisdiction: "DO", countryCode: "DO", policyNamespace: "MEDORA_AI_DO", documentationAndBillingRulesEnabled: false },
  HT: { jurisdiction: "HT", countryCode: "HT", policyNamespace: "MEDORA_AI_HT", documentationAndBillingRulesEnabled: false },
};

/** Returns null on missing, ambiguous, or unsupported persisted country. */
export function resolveMedoraAiCountryAuthority(country: string | null | undefined): MedoraAiCountryAuthority | null {
  const normalized = country?.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!normalized) return null;
  const jurisdiction: MedoraAiJurisdiction | null =
    ["us", "usa", "united states", "united states of america", "etats-unis"].includes(normalized) ? "US" :
    ["do", "dom", "dominican republic", "republica dominicana", "republique dominicaine"].includes(normalized) ? "DO" :
    ["ht", "hti", "haiti"].includes(normalized) ? "HT" : null;
  return jurisdiction ? AUTHORITIES[jurisdiction] : null;
}

/**
 * Facility language is an independent persisted setting. Never infer country
 * from language or language from country. Unknown language fails closed.
 */
export function resolveMedoraAiFacilityLanguage(language: string | null | undefined): MedoraAiLanguage | null {
  const normalized = language?.trim().toLowerCase();
  if (normalized === "en" || normalized === "english" || normalized === "en-us") return "en";
  if (normalized === "es" || normalized === "spanish" || normalized === "es-do") return "es";
  if (normalized === "fr" || normalized === "french" || normalized === "fr-ht") return "fr";
  return null;
}
