/**
 * Platform Admin is a **legacy EN/FR island**, type-isolated from clinical
 * `ProductUiLanguage`. DOM rewrite and `messages.ts` only cover EN/FR.
 *
 * Future `es` must not compile or execute through MutationObserver translation.
 * Unknown locale: reject / English island default at this boundary — never `else => fr`.
 */

export type PlatformAdminLegacyLocale = "en" | "fr";

export const PLATFORM_UI_LANGUAGES = ["en", "fr"] as const satisfies ReadonlyArray<PlatformAdminLegacyLocale>;

export type PlatformUiLanguage = PlatformAdminLegacyLocale;

export const PLATFORM_DEFAULT_UI_LANGUAGE: PlatformAdminLegacyLocale = "en";

export function isPlatformUiLanguage(value: string | null | undefined): value is PlatformAdminLegacyLocale {
  return value != null && (PLATFORM_UI_LANGUAGES as readonly string[]).includes(value);
}

/** Explicit parser. `es` / unknown → null. Never `non-en → fr`. */
export function parsePlatformUiLanguage(raw: string | null | undefined): PlatformAdminLegacyLocale | null {
  if (raw == null) return null;
  const norm = raw.trim().toLowerCase();
  return isPlatformUiLanguage(norm) ? norm : null;
}

/**
 * Island-resolution boundary only (storage missing / unsupported).
 * Defaults to English. Never French.
 */
export function resolvePlatformAdminLegacyLocaleOrDefault(
  raw: string | null | undefined
): PlatformAdminLegacyLocale {
  return parsePlatformUiLanguage(raw) ?? PLATFORM_DEFAULT_UI_LANGUAGE;
}

/** MutationObserver may run only for this island's EN/FR locales. */
export function canRunPlatformAdminDomRewrite(
  locale: string | null | undefined
): locale is PlatformAdminLegacyLocale {
  return isPlatformUiLanguage(locale);
}

/** English chrome labels for Platform Admin selectors (DOM rewrite island). */
const PLATFORM_LANGUAGE_OPTION_LABELS: Record<PlatformUiLanguage, string> = {
  en: "English",
  fr: "French",
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
