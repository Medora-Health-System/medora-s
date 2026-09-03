import { adaptProductUiToCatalogLabelStrategy, parseProductUiLanguage, type SupportedLanguage } from "@/i18n/config";
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
 * EN: `displayNameEn` → `code` → typed fallback — never `displayNameFr` or legacy `name`.
 * FR: `displayNameFr` → `code` → typed fallback — never `displayNameEn`.
 * Unsupported locales: canonical `code` only (UNLOCALIZED_SOURCE), never EN/FR labels.
 */
export function getCatalogSearchItemDisplayLabel(
  item: CatalogSearchItem,
  language: SupportedLanguage | string,
  t?: (key: string) => string
): string {
  const strategy = adaptProductUiToCatalogLabelStrategy(language);
  if (!strategy) {
    return item.code?.trim() || "";
  }
  if (strategy === "fr_preferred") {
    const fr = item.displayNameFr?.trim();
    if (fr) return fr;
    const code = item.code?.trim();
    if (code) return code;
    const key = CATALOG_SEARCH_EN_FALLBACK_KEYS[item.type];
    if (t && key) return t(key);
    return "";
  }
  const strict = pickStrictEnCatalogPrimaryLabel(item.type, item.displayNameEn, item.code);
  if (strict) return strict;
  const key = CATALOG_SEARCH_EN_FALLBACK_KEYS[item.type];
  if (t && key) return t(key);
  return item.code?.trim() || "";
}

/**
 * Secondary catalog line (lab category, imaging meta, medication subtitle).
 * Active locale only — never uses the mixed/legacy `secondaryText` FR-first blob.
 */
export function getCatalogSearchItemSecondaryLine(
  item: CatalogSearchItem,
  language: SupportedLanguage | string
): string {
  const parsed = parseProductUiLanguage(language);
  if (item.type === "MEDICATION") {
    if (parsed === "en" || parsed === "fr") {
      return formatCatalogMedicationSubtitleForLocale(item, parsed);
    }
    if (language != null && String(language).trim() !== "") {
      return item.code?.trim() || "";
    }
    return formatCatalogMedicationSubtitleForLocale(item, "en");
  }
  if (parsed === "fr") return item.secondaryTextFr?.trim() || "";
  if (parsed === "en") return item.secondaryTextEn?.trim() || "";
  if (language != null && String(language).trim() !== "") {
    return item.code?.trim() || "";
  }
  return item.secondaryTextEn?.trim() || "";
}

/**
 * Full single-line label (primary + subtitle), for chips, controlled inputs, and order modal lines.
 * Medication rows normalize catalog metadata by locale (Phase 19U.2).
 */
export function catalogSearchItemFullDisplayLine(
  item: CatalogSearchItem,
  language: SupportedLanguage | string,
  t?: (key: string) => string
): string {
  const head = getCatalogSearchItemDisplayLabel(item, language, t);
  const tail = getCatalogSearchItemSecondaryLine(item, language);
  return [head, tail].filter(Boolean).join(" · ") || item.code;
}
