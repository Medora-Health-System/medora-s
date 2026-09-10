"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { messages, type MessageKey } from "./messages";
import { canonicalEn, canonicalEs, canonicalFr, platformText, translatePlatformText } from "./platformText";
import {
  canRunPlatformAdminDomRewrite,
  isPlatformUiLanguage,
  parsePlatformUiLanguage,
  PLATFORM_DEFAULT_UI_LANGUAGE,
  PLATFORM_UI_LANGUAGES,
  platformLanguageSelectOptions,
  type PlatformUiLanguage,
} from "./platformLocale";

export type Locale = PlatformUiLanguage;

const STORAGE = "medora.locale";

const PLATFORM_BCP47: Record<PlatformUiLanguage, string> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-419",
};

const I18n = createContext({
  locale: PLATFORM_DEFAULT_UI_LANGUAGE as Locale,
  setLocale: (_l: Locale) => {},
  t: (key: MessageKey) => messages.en[key] as string,
  formatDate: (v: string | Date) =>
    new Intl.DateTimeFormat(PLATFORM_BCP47.en, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)),
});

/**
 * Platform Admin i18n island — EN / FR / ES keyed catalog plus complete
 * source-literal rewrite for remaining hardcoded chrome.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<Locale>(PLATFORM_DEFAULT_UI_LANGUAGE);

  useEffect(() => {
    const saved = parsePlatformUiLanguage(localStorage.getItem(STORAGE));
    if (saved) setState(saved);
  }, []);

  function setLocale(value: Locale) {
    if (!isPlatformUiLanguage(value)) return;
    localStorage.setItem(STORAGE, value);
    document.cookie = `medora_locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = value;
    setState(value);
  }

  useEffect(() => {
    if (!canRunPlatformAdminDomRewrite(locale)) return;
    document.documentElement.lang = locale;
    const root = document.body;
    const reverseFr = new Map(Object.entries(platformText.fr).map(([en, fr]) => [fr, en]));
    const reverseEs = new Map(Object.entries(platformText.es).map(([en, es]) => [es, en]));
    const canonicalReverseFr = new Map(Object.entries(canonicalFr).map(([en, fr]) => [fr, en]));
    const canonicalReverseEs = new Map(Object.entries(canonicalEs).map(([en, es]) => [es, en]));
    const localize = (raw: string) => {
      const exact =
        reverseFr.get(raw) ??
        reverseEs.get(raw) ??
        canonicalReverseFr.get(raw) ??
        canonicalReverseEs.get(raw) ??
        raw;
      if (locale === "fr") return canonicalFr[exact] ?? translatePlatformText("fr", exact);
      if (locale === "es") return canonicalEs[exact] ?? translatePlatformText("es", exact);
      return canonicalEn[exact] ?? exact;
    };
    const visit = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const raw = node.textContent;
        const trim = raw.trim();
        if (trim) {
          let next = localize(trim);
          if (next === trim && node.parentElement?.closest(".platform-error")) {
            next = messages[locale]["common.unknownError"];
          }
          if (next !== trim) node.textContent = raw.replace(trim, next);
        }
      }
      if (node instanceof HTMLElement) {
        for (const attr of ["aria-label", "placeholder", "title"]) {
          const raw = node.getAttribute(attr);
          if (raw) {
            const next = localize(raw);
            if (next !== raw) node.setAttribute(attr, next);
          }
        }
      }
      node.childNodes.forEach(visit);
    };
    visit(root);
    const observer = new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach(visit)));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  const t = (key: MessageKey) => messages[locale][key];
  const formatDate = (v: string | Date) =>
    new Intl.DateTimeFormat(PLATFORM_BCP47[locale], { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));

  return <I18n.Provider value={{ locale, setLocale, t, formatDate }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t("common.language")} className="language-selector">
      {platformLanguageSelectOptions().map((opt, index) => (
        <span key={opt.value}>
          {index > 0 ? <span aria-hidden> | </span> : null}
          <button aria-pressed={locale === opt.value} onClick={() => setLocale(opt.value)}>
            {opt.label}
          </button>
        </span>
      ))}
    </div>
  );
}
