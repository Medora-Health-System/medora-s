export const supportedLanguages = ["fr", "en"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

/** Unauthenticated fallback when no stored/facility/browser preference exists (MEDUI.2C). */
export const defaultLanguage: SupportedLanguage = "en";

/** Explicit locale for non-UI modules without `useI18n` context (Phase 19U.1). Prefer passing UI `language` in components. */
export const productDefaultLocale: SupportedLanguage = "en";
