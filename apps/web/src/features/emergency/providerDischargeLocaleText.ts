/**
 * MEDUI.ED.DISCHARGE.I18N_REMEDIATION.1 — strict locale text resolution (no cross-locale fallback).
 */

import type { SupportedLanguage } from "@/i18n/config";

export class ProviderDischargeLocaleTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderDischargeLocaleTextError";
  }
}

export function resolveStrictProviderDischargeLocaleText(
  ruleId: string,
  text: Partial<Record<SupportedLanguage, string>>,
  locale: SupportedLanguage
): string {
  const localized = text[locale]?.trim();
  if (!localized) {
    throw new ProviderDischargeLocaleTextError(`[${ruleId}] missing text.${locale}`);
  }
  return localized;
}

/** Runtime resolver — skips rule when locale text missing (never injects English into FR). */
export function resolveProviderDischargeLocaleTextOrNull(
  text: Partial<Record<SupportedLanguage, string>>,
  locale: SupportedLanguage
): string | null {
  const localized = text[locale]?.trim();
  return localized || null;
}
