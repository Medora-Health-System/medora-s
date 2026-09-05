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
