"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultLanguage, supportedLanguages, type SupportedLanguage } from "./config";
import frMessages from "./messages/fr";
import enMessages from "./messages/en";

const STORAGE_KEY = "medora_locale";

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

function resolveT(active: unknown, frRoot: unknown, key: string): string {
  const v = getByPath(active, key);
  if (typeof v === "string") return v;
  const frVal = getByPath(frRoot, key);
  if (typeof frVal === "string") return frVal;
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
  const [language, setLanguageState] = useState<SupportedLanguage>(
    (facilityLanguage as SupportedLanguage) || defaultLanguage
  );

  useEffect(() => {
    try {
      if (facilityLanguage && isSupportedLanguage(facilityLanguage)) {
        setLanguageState(facilityLanguage);
        return;
      }

      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;

      if (raw && isSupportedLanguage(raw)) {
        setLanguageState(raw);
      }
    } catch {
      // ignore
    }
  }, [facilityLanguage]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      const activeRoot = messagesByLang[language];
      return resolveT(activeRoot, frMessages, key);
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
