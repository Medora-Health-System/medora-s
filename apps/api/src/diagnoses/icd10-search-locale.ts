import { BadRequestException } from "@nestjs/common";
import { parseProductUiLanguage, type ProductUiLanguage } from "@medora/shared";

/**
 * Search locale gate. Uses the canonical parser only.
 * Never resolveProductUiLanguageOrDefault — missing/unknown must not become EN.
 */
export function requireIcd10SearchLocale(raw: string | undefined): ProductUiLanguage {
  const locale = parseProductUiLanguage(raw);
  if (!locale) {
    throw new BadRequestException("Query parameter locale is required and must be en, fr, or es");
  }
  return locale;
}

/**
 * Optional list/chart-summary locale. Missing → unlocalized code presentation.
 * Invalid → 400 (never silent EN).
 */
export function parseOptionalIcd10ListLocale(raw: string | undefined): ProductUiLanguage | null {
  if (raw == null || raw.trim() === "") return null;
  const locale = parseProductUiLanguage(raw);
  if (!locale) {
    throw new BadRequestException("Query parameter locale must be en, fr, or es");
  }
  return locale;
}
