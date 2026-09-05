"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultLanguage,
  isPubliclySelectableProductUiLanguage,
  type SupportedLanguage,
} from "./config";
import { resolveClinicalUiMessage } from "./messages/registry";
import {
  hydrateProductUiLanguage,
  readRuntimeFacilityUiLanguage,
  UI_LANGUAGE_STORAGE_KEY,
} from "./resolveClientUiLanguage";

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  applyFacilityLanguage: (lang?: string) => void;
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
  const [sessionFacilityLanguage, setSessionFacilityLanguage] = useState<string | undefined>(
    facilityLanguage
  );

  // SSR/hydration-safe: never read localStorage in useState initializer (React #418).
  const [language, setLanguageState] = useState<SupportedLanguage>(() =>
    facilityLanguage && isPubliclySelectableProductUiLanguage(facilityLanguage)
      ? facilityLanguage
      : defaultLanguage
  );

  useEffect(() => {
    if (facilityLanguage !== undefined) {
      setSessionFacilityLanguage(facilityLanguage);
    }
  }, [facilityLanguage]);

  useEffect(() => {
    try {
      setLanguageState(hydrateProductUiLanguage(sessionFacilityLanguage));
    } catch {
      // ignore
    }
  }, [sessionFacilityLanguage]);

  const applyFacilityLanguage = useCallback((lang?: string) => {
    setSessionFacilityLanguage(lang);
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    if (!isPubliclySelectableProductUiLanguage(lang)) return;
    const facility = readRuntimeFacilityUiLanguage();
    if (facility) {
      // Authenticated facility-backed session: login toggle must not stick.
      setLanguageState(facility);
      return;
    }
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
    () => ({ language, setLanguage, applyFacilityLanguage, t }),
    [language, setLanguage, applyFacilityLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Single product locale store lives on the root I18nProvider.
 * App shell publishes the active facility language into that store — no nested provider.
 */
export function I18nFacilityLanguageBridge({
  facilityLanguage,
}: {
  facilityLanguage?: string;
}) {
  const { applyFacilityLanguage } = useI18n();
  useEffect(() => {
    applyFacilityLanguage(facilityLanguage);
  }, [facilityLanguage, applyFacilityLanguage]);
  useEffect(() => {
    return () => applyFacilityLanguage(undefined);
  }, [applyFacilityLanguage]);
  return null;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
