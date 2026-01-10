export const LANGUAGE_CODES = ["en", "fr", "es", "ht"] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

