import { resolveClinicalUiMessage } from "@/i18n/messages/registry";

/**
 * Resolves a dotted path against the active clinical UI catalog (non-React).
 * Missing keys return the key path. Never fall back to another locale.
 */
export function i18nMessage(locale: string, path: string): string {
  return resolveClinicalUiMessage(locale, path);
}
