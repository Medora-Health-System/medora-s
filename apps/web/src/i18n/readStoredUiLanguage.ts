import { defaultLanguage, type SupportedLanguage } from "./config";
import {
  readCachedFacilityUiLanguage,
  readRuntimeFacilityUiLanguage,
  readStoredUiLanguageRaw,
  resolveBrowserUiLanguage,
  resolveClientUiLanguage,
} from "./resolveClientUiLanguage";

/** Client-only: resolves UI language from the same facility-authoritative chain as {@link I18nProvider}. */
export function readStoredUiLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return defaultLanguage;
  return resolveClientUiLanguage({
    storedLanguage: readStoredUiLanguageRaw(),
    facilityLanguage: readRuntimeFacilityUiLanguage(),
    cachedFacilityLanguage: readCachedFacilityUiLanguage(),
    browserLanguage: resolveBrowserUiLanguage(),
  });
}
