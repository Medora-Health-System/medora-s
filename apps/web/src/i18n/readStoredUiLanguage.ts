import { defaultLanguage, supportedLanguages, type SupportedLanguage } from "./config";

const STORAGE_KEY = "medora_locale";

/** Client-only: resolves UI language from localStorage (matches {@link I18nProvider}). */
export function readStoredUiLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return defaultLanguage;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && supportedLanguages.includes(raw as SupportedLanguage)) {
      return raw as SupportedLanguage;
    }
  } catch {
    // ignore
  }
  return defaultLanguage;
}
