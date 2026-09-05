import { adaptProductUiToCatalogLabelStrategy, parseProductUiLanguage, type SupportedLanguage } from "@/i18n/config";
import type { CatalogSearchItem, CatalogSearchItemType } from "@/lib/catalogSearchTypes";
import { formatCatalogMedicationSubtitleForLocale } from "@/lib/localizedMedicationDisplay";
import {
  pickStrictEnCatalogPrimaryLabel,
  composeMedicationDisplayEs,
  lookupGovernedCatalogEsLabel,
  medicationInnIdentityCandidate,
  type ClinicalCatalogKind,
} from "@medora/shared";

const CATALOG_SEARCH_EN_FALLBACK_KEYS: Record<CatalogSearchItemType, string> = {
  LAB_TEST: "patientChartUi.orderDisplayFallback.labTest",
  IMAGING_STUDY: "patientChartUi.orderDisplayFallback.imaging",
  MEDICATION: "patientChartUi.orderDisplayFallback.medication",
  CARE_PROCEDURE: "patientChartUi.orderDisplayFallback.care",
};

function catalogKindForSearchItem(type: CatalogSearchItemType): ClinicalCatalogKind {
  if (type === "LAB_TEST") return "LAB_TEST";
  if (type === "IMAGING_STUDY") return "IMAGING_STUDY";
  if (type === "CARE_PROCEDURE") return "CARE_PROCEDURE";
  return "MEDICATION";
}

/**
 * Primary display line for catalog search rows (lab / imaging / medication).
 * EN: `displayNameEn` → `code` → typed fallback — never `displayNameFr` or legacy `name`.
 * FR: `displayNameFr` → `code` → typed fallback — never `displayNameEn`.
 * ES: governed Spanish overlay / composed medication label → `code`. Never EN/FR.
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
  if (strategy === "es_preferred") {
    if (item.type === "MEDICATION") {
      const composed = composeMedicationDisplayEs({
        genericName: item.metadata?.genericName || medicationInnIdentityCandidate(item.displayNameEn),
        strength: item.metadata?.strength,
        dosageForm: item.metadata?.dosageForm,
        route: item.metadata?.route,
        code: item.code,
      });
      if (composed) return composed;
    }
    const overlay = lookupGovernedCatalogEsLabel(catalogKindForSearchItem(item.type), item.code);
    if (overlay) return overlay;
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

function normalizeCatalogDisplayCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function otherLanguageCatalogLabels(
  item: CatalogSearchItem,
  language: SupportedLanguage | string
): string[] {
  const parsed = parseProductUiLanguage(language);
  const overlay = lookupGovernedCatalogEsLabel(catalogKindForSearchItem(item.type), item.code);
  const labels: string[] = [];
  if (parsed !== "en" && item.displayNameEn?.trim()) labels.push(item.displayNameEn.trim());
  if (parsed !== "fr" && item.displayNameFr?.trim()) labels.push(item.displayNameFr.trim());
  if (parsed !== "es" && overlay) labels.push(overlay);
  return labels;
}

function isOtherLanguageCatalogLabel(
  item: CatalogSearchItem,
  language: SupportedLanguage | string,
  candidate: string
): boolean {
  const n = normalizeCatalogDisplayCompare(candidate);
  if (!n) return false;
  return otherLanguageCatalogLabels(item, language).some((label) => {
    const other = normalizeCatalogDisplayCompare(label);
    return other.length > 0 && n === other;
  });
}

function sanitizeCatalogMetadataLine(
  item: CatalogSearchItem,
  language: SupportedLanguage | string,
  raw: string,
  primary: string
): string {
  const tail = raw.trim();
  const head = primary.trim();
  if (!tail) return "";
  if (normalizeCatalogDisplayCompare(tail) === normalizeCatalogDisplayCompare(head)) return "";
  if (isOtherLanguageCatalogLabel(item, language, tail)) return "";
  return tail;
}

/**
 * Secondary catalog metadata (lab category, imaging meta, medication form/route, canonical code).
 * Active locale only. Never another language's display label. Never a duplicate of the primary.
 */
export function getCatalogSearchItemSecondaryLine(
  item: CatalogSearchItem,
  language: SupportedLanguage | string
): string {
  const parsed = parseProductUiLanguage(language);
  const primary = getCatalogSearchItemDisplayLabel(item, language);
  let raw = "";
  if (item.type === "MEDICATION") {
    if (parsed === "en" || parsed === "fr") {
      raw = formatCatalogMedicationSubtitleForLocale(item, parsed);
    } else if (parsed === "es" || (language != null && String(language).trim() !== "")) {
      raw = item.code?.trim() || "";
    } else {
      raw = formatCatalogMedicationSubtitleForLocale(item, "en");
    }
  } else if (parsed === "fr") {
    raw = item.secondaryTextFr?.trim() || "";
  } else if (parsed === "en") {
    raw = item.secondaryTextEn?.trim() || "";
  } else if (parsed === "es") {
    raw =
      lookupGovernedCatalogEsLabel(catalogKindForSearchItem(item.type), item.code) && item.code
        ? item.code.trim()
        : "";
  } else if (language != null && String(language).trim() !== "") {
    raw = item.code?.trim() || "";
  } else {
    raw = item.secondaryTextEn?.trim() || "";
  }
  return sanitizeCatalogMetadataLine(item, language, raw, primary);
}

/**
 * Canonical code as optional same-line metadata. Never identical to the primary label.
 * Never another language description.
 */
export function getCatalogResultCodeMetadata(
  item: CatalogSearchItem,
  language: SupportedLanguage | string,
  t?: (key: string) => string
): string | null {
  const code = item.code?.trim() || "";
  if (!code) return null;
  const primary = getCatalogSearchItemDisplayLabel(item, language, t);
  if (normalizeCatalogDisplayCompare(code) === normalizeCatalogDisplayCompare(primary)) return null;
  if (isOtherLanguageCatalogLabel(item, language, code)) return null;
  return code;
}

/**
 * Permanent one-line catalog result contract.
 * Search may inspect aliases. Display is one active-locale primary line.
 */
export function getCatalogResultOneLineDisplay(
  item: CatalogSearchItem,
  language: SupportedLanguage | string,
  t?: (key: string) => string
): { primary: string; metadata: string | null; visibleLines: 1 } {
  return {
    primary: getCatalogSearchItemDisplayLabel(item, language, t),
    metadata: getCatalogResultCodeMetadata(item, language, t),
    visibleLines: 1,
  };
}

/**
 * Full single-line label (primary + locale metadata), for chips, controlled inputs, and order modal lines.
 * Never a second language. Never CODE · CODE.
 */
export function catalogSearchItemFullDisplayLine(
  item: CatalogSearchItem,
  language: SupportedLanguage | string,
  t?: (key: string) => string
): string {
  const head = getCatalogSearchItemDisplayLabel(item, language, t);
  const tail = getCatalogSearchItemSecondaryLine(item, language);
  if (tail && tail === head) return head;
  if (tail && head && tail === item.code?.trim() && head !== item.code?.trim()) {
    return `${head} · ${tail}`;
  }
  if (tail && head && tail === item.code?.trim() && head === item.code?.trim()) return head;
  return [head, tail].filter(Boolean).join(" · ") || item.code;
}
