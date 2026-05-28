"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultLanguage, supportedLanguages, type SupportedLanguage } from "./config";
import frMessages from "./messages/fr";
import enMessages from "./messages/en";
import {
  persistFacilityUiLanguage,
  readCachedFacilityUiLanguage,
  readStoredUiLanguageRaw,
  resolveBrowserUiLanguage,
  resolveClientUiLanguage,
  UI_LANGUAGE_STORAGE_KEY,
} from "./resolveClientUiLanguage";

const messagesByLang: Record<SupportedLanguage, unknown> = {
  fr: frMessages,
  en: enMessages,
};

function isSupportedLanguage(v: string | null): v is SupportedLanguage {
  return v != null && supportedLanguages.includes(v as SupportedLanguage);
}

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Resolve a dotted message key for the active locale only.
 * Missing keys return the key path — never fall back to the other language catalog (19U.1).
 */
function resolveT(
  active: unknown,
  _frRoot: unknown,
  key: string,
  language: SupportedLanguage
): string {
  const v = getByPath(active, key);
  if (typeof v === "string") return v;
  if (language === "en") {
    return key;
  }
  return key;
}

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
    facilityLanguage && isSupportedLanguage(facilityLanguage) ? facilityLanguage : defaultLanguage
  );

  useEffect(() => {
    try {
      if (facilityLanguage && isSupportedLanguage(facilityLanguage)) {
        setLanguageState(facilityLanguage);
        persistFacilityUiLanguage(facilityLanguage);
        return;
      }

      const resolved = resolveClientUiLanguage({
        storedLanguage: readStoredUiLanguageRaw(),
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
    (key: string) => {
      const activeRoot = messagesByLang[language];
      return resolveT(activeRoot, null, key, language);
    },
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
