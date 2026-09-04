/**
 * MEDUI.ED.DISCHARGE.I18N_REMEDIATION.1 — strict locale text resolution (no cross-locale fallback).
 */

import type { ProductUiLanguage } from "@/i18n/config";
import { parseProductUiLanguage } from "@/i18n/config";

export class ProviderDischargeLocaleTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderDischargeLocaleTextError";
  }
}

export function resolveStrictProviderDischargeLocaleText(
  ruleId: string,
  text: Partial<Record<ProductUiLanguage, string>>,
  locale: string
): string {
  const parsed = parseProductUiLanguage(locale);
  const localized = parsed ? text[parsed]?.trim() : undefined;
  if (!localized) {
    throw new ProviderDischargeLocaleTextError(`[${ruleId}] missing text.${parsed ?? locale}`);
  }
  return localized;
}

/** Runtime resolver — skips rule when locale text missing (never injects English into FR). */
export function resolveProviderDischargeLocaleTextOrNull(
  text: Partial<Record<ProductUiLanguage, string>>,
  locale: string
): string | null {
  const parsed = parseProductUiLanguage(locale);
  if (!parsed) return null;
  const localized = text[parsed]?.trim();
  return localized || null;
}
