import type { SupportedLanguage } from "@/i18n/config";
import type { CatalogSearchItem, CatalogSearchItemType } from "@/lib/catalogSearchTypes";
import { formatCatalogMedicationSubtitleForLocale } from "@/lib/localizedMedicationDisplay";
import { pickStrictEnCatalogPrimaryLabel } from "@medora/shared";

const CATALOG_SEARCH_EN_FALLBACK_KEYS: Record<CatalogSearchItemType, string> = {
  LAB_TEST: "patientChartUi.orderDisplayFallback.labTest",
  IMAGING_STUDY: "patientChartUi.orderDisplayFallback.imaging",
  MEDICATION: "patientChartUi.orderDisplayFallback.medication",
  CARE_PROCEDURE: "patientChartUi.orderDisplayFallback.care",
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
 * Full single-line label (primary + subtitle), for chips, controlled inputs, and order modal lines.
 * Medication rows normalize catalog metadata by locale (Phase 19U.2).
 */
export function catalogSearchItemFullDisplayLine(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t?: (key: string) => string
): string {
  const head = getCatalogSearchItemDisplayLabel(item, language, t);
  const tail =
    item.type === "MEDICATION"
      ? formatCatalogMedicationSubtitleForLocale(item, language)
      : item.secondaryText?.trim() ?? "";
  return [head, tail].filter(Boolean).join(" · ") || item.code;
}
