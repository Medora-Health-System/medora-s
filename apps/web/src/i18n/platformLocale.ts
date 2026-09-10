/**
 * Platform Admin UI locale — EN / FR / ES, type-isolated from the clinical
 * product catalog but the same three public languages.
 *
 * Unknown locale: reject / English island default at this boundary — never `else => fr`.
 */

export type PlatformUiLanguage = "en" | "fr" | "es";

export const PLATFORM_UI_LANGUAGES = ["en", "fr", "es"] as const satisfies ReadonlyArray<PlatformUiLanguage>;

/** @deprecated Use PlatformUiLanguage. Kept so existing imports compile. */
export type PlatformAdminLegacyLocale = PlatformUiLanguage;

export const PLATFORM_DEFAULT_UI_LANGUAGE: PlatformUiLanguage = "en";

export function isPlatformUiLanguage(value: string | null | undefined): value is PlatformUiLanguage {
  return value != null && (PLATFORM_UI_LANGUAGES as readonly string[]).includes(value);
}

/** Explicit parser. Unknown → null. Never `non-en → fr`. Accepts BCP 47 prefixes. */
export function parsePlatformUiLanguage(raw: string | null | undefined): PlatformUiLanguage | null {
  if (raw == null) return null;
  const norm = raw.trim().toLowerCase();
  if (!norm) return null;
  if (isPlatformUiLanguage(norm)) return norm;
  for (const code of PLATFORM_UI_LANGUAGES) {
    if (norm.startsWith(`${code}-`)) return code;
  }
  return null;
}

/**
 * Island-resolution boundary only (storage missing / unsupported).
 * Defaults to English. Never French.
 */
export function resolvePlatformAdminLegacyLocaleOrDefault(
  raw: string | null | undefined
): PlatformUiLanguage {
  return parsePlatformUiLanguage(raw) ?? PLATFORM_DEFAULT_UI_LANGUAGE;
}

/** MutationObserver may run for every supported Platform Admin locale. */
export function canRunPlatformAdminDomRewrite(
  locale: string | null | undefined
): locale is PlatformUiLanguage {
  return isPlatformUiLanguage(locale);
}

/** Native chrome labels for Platform Admin selectors. */
const PLATFORM_LANGUAGE_OPTION_LABELS: Record<PlatformUiLanguage, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
};

export function platformLanguageSelectOptions(): ReadonlyArray<{
  value: PlatformUiLanguage;
  label: string;
}> {
  return PLATFORM_UI_LANGUAGES.map((code) => ({
    value: code,
    label: PLATFORM_LANGUAGE_OPTION_LABELS[code],
  }));
}
