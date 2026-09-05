import {
  defaultLanguage,
  isPubliclySelectableProductUiLanguage,
  parseProductUiLanguage,
  resolveProductUiLanguageFromBrowserCandidates,
  type SupportedLanguage,
} from "./config";

export const UI_LANGUAGE_STORAGE_KEY = "medora_locale";
export const FACILITY_UI_LANGUAGE_STORAGE_KEY = "medora_facility_ui_language";

function parsePublicProductUiLanguage(raw: string | null | undefined): SupportedLanguage | null {
  const parsed = parseProductUiLanguage(raw);
  return parsed && isPubliclySelectableProductUiLanguage(parsed) ? parsed : null;
}

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

/**
 * Live facility language last applied by the product I18nProvider.
 * Lets non-React callers (apiClient) follow the same facility-authoritative session
 * without reading a stale login localStorage value.
 */
let runtimeFacilityUiLanguage: SupportedLanguage | null = null;

export function readRuntimeFacilityUiLanguage(): SupportedLanguage | null {
  return runtimeFacilityUiLanguage;
}

export function clearRuntimeFacilityUiLanguage(): void {
  runtimeFacilityUiLanguage = null;
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
 * Client UI language priority (MEDUI.LOCALE.P0):
 *
 * 1. Active facility language when valid — AUTHORITATIVE for authenticated /app
 * 2. Login / unauthenticated stored language (`medora_locale`) — never overrides (1)
 * 3. Cached facility language from a prior authenticated session
 * 4. English product default
 *
 * Browser language and Platform Admin cookie/storage never override this chain.
 */
export function resolveClientUiLanguage(input: ResolveClientUiLanguageInput = {}): SupportedLanguage {
  const fallback = input.fallback ?? defaultLanguage;

  const facility = parsePublicProductUiLanguage(input.facilityLanguage);
  if (facility) return facility;

  const stored = parsePublicProductUiLanguage(input.storedLanguage);
  if (stored) return stored;

  const cached = parsePublicProductUiLanguage(input.cachedFacilityLanguage);
  if (cached) return cached;

  return fallback;
}

/**
 * Production I18nProvider hydration path.
 * Persists facility language for reload fallback, publishes it to runtime readers,
 * then resolves through {@link resolveClientUiLanguage}.
 */
export function hydrateProductUiLanguage(facilityLanguage?: string | null): SupportedLanguage {
  const valid = parsePublicProductUiLanguage(facilityLanguage);
  runtimeFacilityUiLanguage = valid;
  if (valid) persistFacilityUiLanguage(valid);
  return resolveClientUiLanguage({
    storedLanguage: readStoredUiLanguageRaw(),
    facilityLanguage: valid,
    cachedFacilityLanguage: readCachedFacilityUiLanguage(),
    browserLanguage: resolveBrowserUiLanguage(),
  });
}

/** Session mapping: active facility id → `facilityRoles[].defaultLanguage`. */
export function readActiveFacilityLanguage(
  facilityRoles:
    | ReadonlyArray<{ facilityId?: string | null; defaultLanguage?: string | null }>
    | null
    | undefined,
  activeFacility: string | null | undefined
): string | undefined {
  const facilityId = typeof activeFacility === "string" ? activeFacility.trim() : "";
  if (!facilityId || !facilityRoles?.length) return undefined;
  const match = facilityRoles.find((fr) => String(fr.facilityId ?? "") === facilityId);
  const lang = match?.defaultLanguage;
  return typeof lang === "string" && lang.trim() ? lang : undefined;
}
