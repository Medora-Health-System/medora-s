import type { SupportedLanguage } from "@/i18n/config";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

/**
 * Clinical UI message roots keyed by product UI locale.
 * Lookups must use `clinicalUiMessages[language]` — never `en ? en : fr`.
 */
export const clinicalUiMessages: Record<SupportedLanguage, unknown> = {
  en: enMessages,
  fr: frMessages,
};

export function getClinicalUiMessages(language: SupportedLanguage): unknown {
  return clinicalUiMessages[language];
}

export function getMessageByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Active-locale-only message resolution.
 * Missing keys return the key path. Never read another language catalog.
 */
export function resolveClinicalUiMessage(language: SupportedLanguage, key: string): string {
  const v = getMessageByPath(getClinicalUiMessages(language), key);
  return typeof v === "string" ? v : key;
}
