"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultLanguage,
  isProductUiLanguage,
  type SupportedLanguage,
} from "./config";
import { resolveClinicalUiMessage } from "./messages/registry";
import {
  persistFacilityUiLanguage,
  readCachedFacilityUiLanguage,
  readStoredUiLanguageRaw,
  resolveBrowserUiLanguage,
  resolveClientUiLanguage,
  UI_LANGUAGE_STORAGE_KEY,
} from "./resolveClientUiLanguage";

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  facilityLanguage,
}: {
  children: React.ReactNode;
  facilityLanguage?: string;
}) {
  // SSR/hydration-safe: never read localStorage in useState initializer (React #418).
  const [language, setLanguageState] = useState<SupportedLanguage>(() =>
    facilityLanguage && isProductUiLanguage(facilityLanguage) ? facilityLanguage : defaultLanguage
  );

  useEffect(() => {
    try {
      // Cache facility language for fallback only — never override an explicit user locale.
      if (facilityLanguage && isProductUiLanguage(facilityLanguage)) {
        persistFacilityUiLanguage(facilityLanguage);
      }

      const resolved = resolveClientUiLanguage({
        storedLanguage: readStoredUiLanguageRaw(),
        facilityLanguage,
        cachedFacilityLanguage: readCachedFacilityUiLanguage(),
        browserLanguage: resolveBrowserUiLanguage(),
      });
      setLanguageState(resolved);
    } catch {
      // ignore
    }
  }, [facilityLanguage]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string) => resolveClinicalUiMessage(language, key),
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
