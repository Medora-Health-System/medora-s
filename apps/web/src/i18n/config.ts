export const supportedLanguages = ["fr", "en"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const defaultLanguage: SupportedLanguage = "fr";

/** Explicit locale for non-UI modules without `useI18n` context (Phase 19U.1). Prefer passing UI `language` in components. */
export const productDefaultLocale: SupportedLanguage = "fr";
