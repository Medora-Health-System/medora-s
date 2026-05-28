import { defaultLanguage, type SupportedLanguage } from "./config";
import {
  readCachedFacilityUiLanguage,
  readStoredUiLanguageRaw,
  resolveBrowserUiLanguage,
  resolveClientUiLanguage,
} from "./resolveClientUiLanguage";

/** Client-only: resolves UI language from stored/facility/browser preferences (matches {@link I18nProvider}). */
export function readStoredUiLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return defaultLanguage;
  return resolveClientUiLanguage({
    storedLanguage: readStoredUiLanguageRaw(),
    cachedFacilityLanguage: readCachedFacilityUiLanguage(),
    browserLanguage: resolveBrowserUiLanguage(),
  });
}
