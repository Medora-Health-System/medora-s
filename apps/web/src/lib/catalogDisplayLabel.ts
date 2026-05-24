import type { SupportedLanguage } from "@/i18n/config";
import type { CatalogSearchItem, CatalogSearchItemType } from "@/lib/catalogSearchTypes";
import { pickStrictEnCatalogPrimaryLabel } from "@medora/shared";

const CATALOG_SEARCH_EN_FALLBACK_KEYS: Record<CatalogSearchItemType, string> = {
  LAB_TEST: "patientChartUi.orderDisplayFallback.labTest",
  IMAGING_STUDY: "patientChartUi.orderDisplayFallback.imaging",
  MEDICATION: "patientChartUi.orderDisplayFallback.medication",
};

/**
 * Primary display line for catalog search rows (lab / imaging / medication).
 * Phase C EN: `displayNameEn` → `code` → typed fallback — never `displayNameFr` or legacy `name`.
 * FR: `displayNameFr` → `displayNameEn` → `name` / `code`.
 */
export function getCatalogSearchItemDisplayLabel(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t?: (key: string) => string
): string {
  if (language === "fr") {
    return (
      item.displayNameFr?.trim() ||
      item.displayNameEn?.trim() ||
      item.name?.trim() ||
      item.code?.trim() ||
      ""
    );
  }
  const strict = pickStrictEnCatalogPrimaryLabel(item.type, item.displayNameEn, item.code);
  if (strict) return strict;
  const key = CATALOG_SEARCH_EN_FALLBACK_KEYS[item.type];
  if (t && key) return t(key);
  return item.code?.trim() || "";
}

/**
 * Full single-line label (primary + `secondaryText`), for chips, controlled inputs, and order modal lines.
 * Phase 19U.2: normalize `secondaryText` / metadata by locale before append — do not render raw FR catalog labels in EN UI.
 */
export function catalogSearchItemFullDisplayLine(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t?: (key: string) => string
): string {
  const head = getCatalogSearchItemDisplayLabel(item, language, t);
  return [head, item.secondaryText].filter(Boolean).join(" · ") || item.code;
}
