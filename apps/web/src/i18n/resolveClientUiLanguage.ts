import {
  defaultLanguage,
  isPubliclySelectableProductUiLanguage,
  parseProductUiLanguage,
  resolveProductUiLanguageFromBrowserCandidates,
  type SupportedLanguage,
} from "./config";

export const UI_LANGUAGE_STORAGE_KEY = "medora_locale";
export const FACILITY_UI_LANGUAGE_STORAGE_KEY = "medora_facility_ui_language";

export function readStoredUiLanguageRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readCachedFacilityUiLanguage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(FACILITY_UI_LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistFacilityUiLanguage(lang: SupportedLanguage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FACILITY_UI_LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function resolveBrowserUiLanguage(): SupportedLanguage | null {
  if (typeof navigator === "undefined") return null;
  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : [];
  return resolveProductUiLanguageFromBrowserCandidates(candidates);
}

export type ResolveClientUiLanguageInput = {
  facilityLanguage?: string | null;
  storedLanguage?: string | null;
  cachedFacilityLanguage?: string | null;
  browserLanguage?: SupportedLanguage | null;
  fallback?: SupportedLanguage;
};

  /**
   * Client UI language priority (MEDUI.2C login boundary):
   * 1. Explicit user-selected language in localStorage
   * 2. Active facility language when known
   * 3. Cached facility language from a prior authenticated session
   * 4. English fallback (browser language does not override default)
   */
export function resolveClientUiLanguage(input: ResolveClientUiLanguageInput = {}): SupportedLanguage {
  const fallback = input.fallback ?? defaultLanguage;

  const stored = parseProductUiLanguage(input.storedLanguage);
  if (stored && isPubliclySelectableProductUiLanguage(stored)) return stored;

  const facility = parseProductUiLanguage(input.facilityLanguage);
  if (facility && isPubliclySelectableProductUiLanguage(facility)) return facility;

  const cached = parseProductUiLanguage(input.cachedFacilityLanguage);
  if (cached && isPubliclySelectableProductUiLanguage(cached)) return cached;

  return fallback;
}
