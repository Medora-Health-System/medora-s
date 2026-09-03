import type { SupportedLanguage } from "@/i18n/config";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";

/**
 * Resolves a dotted path against the active clinical UI catalog (non-React).
 * Missing keys return the key path. Never fall back to another locale.
 */
export function i18nMessage(locale: SupportedLanguage, path: string): string {
  return resolveClinicalUiMessage(locale, path);
}
