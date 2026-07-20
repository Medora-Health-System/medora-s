/**
 * Locale-neutral certification finding → translation key mapping.
 * Display strings are resolved by the active application locale on the client.
 * English fallbacks here are English-only safety nets — never French.
 */

export type ChartCertificationLocalizedKeys = {
  titleKey: string;
  descriptionKey: string;
  /** English-only fallback when a key is missing at runtime (EN locale / last resort). */
  fallbackTitleEn: string;
  fallbackDescriptionEn: string;
};

const B1 = (code: string) => ({
  titleKey: `edLifecycle.certification.b1.codes.${code}.title`,
  descriptionKey: `edLifecycle.certification.b1.codes.${code}.description`,
});

const STAGE_A = (code: string) => ({
  titleKey: `edLifecycle.certification.stageA.codes.${code}.title`,
  descriptionKey: `edLifecycle.certification.stageA.codes.${code}.description`,
});

/**
 * Map disposition-readiness / Stage A stable codes to certification i18n keys.
 * Content vs communication for discharge instructions are preserved.
 */
export function resolveChartCertificationLocalizationKeys(
  code: string | null | undefined
): ChartCertificationLocalizedKeys | null {
  if (!code) return null;

  switch (code) {
    case "DISCHARGE_FOLLOW_UP_MISSING":
      return {
        ...B1("DISCHARGE_FOLLOW_UP_MISSING"),
        fallbackTitleEn: "Discharge follow-up missing",
        fallbackDescriptionEn:
          "Document structured follow-up (destination/provider, timeframe, and contact when applicable) in discharge planning.",
      };
    case "DISCHARGE_INSTRUCTIONS_MISSING":
    case "DISCHARGE_INSTRUCTIONS_INCOMPLETE":
    case "DISCHARGE_INSTRUCTIONS_CONTENT_MISSING":
      return {
        ...B1("DISCHARGE_INSTRUCTIONS_CONTENT_MISSING"),
        fallbackTitleEn: "Discharge instructions content missing",
        fallbackDescriptionEn:
          "Discharge instruction content is incomplete. Complete diagnosis description, clinical instructions, return precautions, or activity guidance as required.",
      };
    case "DISCHARGE_INSTRUCTIONS_NOT_GIVEN":
    case "DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED":
      return {
        ...B1("DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED"),
        fallbackTitleEn: "Discharge instruction communication not documented",
        fallbackDescriptionEn:
          "Instruction content may be present, but the chart does not document that instructions were explained or provided to the patient or representative.",
      };
    case "PROVIDER_DOCUMENTATION_UNSIGNED":
    case "PROVIDER_NOTE_UNSIGNED":
      return {
        ...STAGE_A("PROVIDER_NOTE_UNSIGNED"),
        fallbackTitleEn: "Provider note unsigned",
        fallbackDescriptionEn: "Provider documentation exists but is not signed.",
      };
    case "DISCHARGE_RETURN_PRECAUTIONS_MISSING":
      return {
        ...STAGE_A("DISCHARGE_RETURN_PRECAUTIONS_MISSING"),
        fallbackTitleEn: "Discharge return precautions missing",
        fallbackDescriptionEn:
          "Record return precautions and warning signs in discharge instructions.",
      };
    case "ACTIVE_ORDERS_UNRESOLVED":
      return {
        ...STAGE_A("ACTIVE_ORDERS_UNRESOLVED"),
        fallbackTitleEn: "Active orders unresolved",
        fallbackDescriptionEn: "Active diagnostic or care orders must be completed or cancelled.",
      };
    case "VITALS_MISSING":
      return {
        ...STAGE_A("VITALS_MISSING"),
        fallbackTitleEn: "Vitals missing",
        fallbackDescriptionEn: "No recent vitals are documented for this encounter.",
      };
    case "VITALS_STALE":
      return {
        ...STAGE_A("VITALS_STALE"),
        fallbackTitleEn: "Vitals stale",
        fallbackDescriptionEn: "The latest vitals are older than the configured freshness window.",
      };
    case "PHYSICAL_DEPARTURE_INCOMPLETE":
      return {
        ...STAGE_A("PHYSICAL_DEPARTURE_INCOMPLETE"),
        fallbackTitleEn: "Physical departure incomplete",
        fallbackDescriptionEn: "Disposition execution or handoff is not complete.",
      };
    case "DEPARTURE_TIME_MISSING":
      return {
        ...STAGE_A("DEPARTURE_TIME_MISSING"),
        fallbackTitleEn: "Departure time missing",
        fallbackDescriptionEn: "Encounter dischargedAt is not recorded.",
      };
    default:
      return {
        ...STAGE_A(code),
        fallbackTitleEn: code
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        fallbackDescriptionEn: `Certification finding: ${code}`,
      };
  }
}
