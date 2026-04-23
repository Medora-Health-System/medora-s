import type { SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { isInvalidTechnicalOrderDisplayLabel } from "@medora/shared";

/**
 * Libellé affichable pour une ligne d’ordre (priorité alignée sur l’API enrichOrderItemsForDisplay).
 * Ne jamais exposer catalogItemId dans l’UI.
 *
 * Priorité : displayLabelFr → catalogue (displayNameFr / name selon le type) → manualLabel (+ secondaire) → repli FR.
 */
/** French catalog resolution (used only inside {@link getOrderItemDisplayLabelForLanguage}). */
function orderItemDisplayLabelFr(item: {
  displayLabelFr?: string | null;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  catalogItemType?: string | null;
  catalogLabTest?: {
    code?: string | null;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
    name?: string | null;
  } | null;
  catalogImagingStudy?: {
    code?: string | null;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
    name?: string | null;
    modality?: string | null;
  } | null;
  catalogMedication?: {
    code?: string | null;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
    name?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
  } | null;
  strength?: string | null;
  notes?: string | null;
}): string {
  const resolvedTypeFr = resolveCatalogItemType(item);
  const catGuardFr = String(item.catalogItemType ?? resolvedTypeFr ?? "CARE");
  const dlf = item.displayLabelFr?.trim();
  if (dlf && !isInvalidTechnicalOrderDisplayLabel(dlf, catGuardFr)) return dlf;

  const resolvedType = resolvedTypeFr;
  const fromCatalog = catalogDisplayLabelFr(item, resolvedType);
  if (fromCatalog) return fromCatalog;

  const man = item.manualLabel?.trim();
  if (man) {
    const sec = item.manualSecondaryText?.trim();
    return sec ? `${man} — ${sec}` : man;
  }

  return typeFallbackFr(resolvedType);
}

/** Locale-aware chrome label for order rows (facility language). */
export function getOrderItemDisplayLabelForLanguage(
  item: {
    /** English-first label from API enrichment (preferred over legacy `displayLabel`). */
    displayLabelEn?: string | null;
    displayLabel?: string | null;
    displayLabelFr?: string | null;
    manualLabel?: string | null;
    manualSecondaryText?: string | null;
    catalogItemType?: string | null;
    catalogLabTest?: {
      code?: string | null;
      displayNameEn?: string | null;
      displayNameFr?: string | null;
      name?: string | null;
    } | null;
    catalogImagingStudy?: {
      code?: string | null;
      displayNameEn?: string | null;
      displayNameFr?: string | null;
      name?: string | null;
      modality?: string | null;
    } | null;
    catalogMedication?: {
      code?: string | null;
      displayNameEn?: string | null;
      displayNameFr?: string | null;
      name?: string | null;
      strength?: string | null;
      dosageForm?: string | null;
      route?: string | null;
    } | null;
    strength?: string | null;
    notes?: string | null;
  },
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  if (language === "fr") return orderItemDisplayLabelFr(item);
  const resolvedType = resolveCatalogItemType(item);
  const catType = String(item.catalogItemType ?? resolvedType ?? "CARE");
  const enApi = item.displayLabelEn?.trim();
  if (enApi && !isInvalidTechnicalOrderDisplayLabel(enApi, catType)) return enApi;
  const fromCatalog = catalogDisplayLabelEn(item, resolvedType, catType);
  if (fromCatalog) return fromCatalog;
  const man = item.manualLabel?.trim();
  if (man && !isInvalidTechnicalOrderDisplayLabel(man, catType)) {
    const sec = item.manualSecondaryText?.trim();
    const line = sec ? `${man} — ${sec}` : man;
    if (!isInvalidTechnicalOrderDisplayLabel(line, catType)) return line;
  }
  return typeFallbackEn(resolvedType, t);
}

/** Facility-language order label for non-React modules (mirrors {@link getOrderItemDisplayLabelForLanguage}). */
export function getOrderItemDisplayLabelFromLocale(
  item: Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
  locale: SupportedLanguage
): string {
  return getOrderItemDisplayLabelForLanguage(item, locale, (k) => i18nMessage(locale, k));
}

function resolveCatalogItemType(item: {
  catalogItemType?: string | null;
  catalogLabTest?: unknown;
  catalogImagingStudy?: unknown;
  catalogMedication?: unknown;
}): string | null {
  const t = item.catalogItemType?.trim();
  if (t) return t;
  if (item.catalogLabTest) return "LAB_TEST";
  if (item.catalogImagingStudy) return "IMAGING_STUDY";
  if (item.catalogMedication) return "MEDICATION";
  return null;
}

function catalogDisplayLabelFr(
  item: {
    catalogLabTest?: { displayNameFr?: string | null; name?: string | null } | null;
    catalogImagingStudy?: { displayNameFr?: string | null; name?: string | null; modality?: string | null } | null;
    catalogMedication?: {
      displayNameFr?: string | null;
      name?: string | null;
      strength?: string | null;
      dosageForm?: string | null;
      route?: string | null;
    } | null;
    strength?: string | null;
  },
  t: string | null
): string | null {
  if (t === "LAB_TEST") {
    const c = item.catalogLabTest;
    if (c?.displayNameFr?.trim()) return c.displayNameFr.trim();
    if (c?.name?.trim()) return c.name.trim();
    return null;
  }
  if (t === "IMAGING_STUDY") {
    const c = item.catalogImagingStudy;
    const base = c?.displayNameFr?.trim() || c?.name?.trim();
    if (base) {
      const mod = c?.modality ? ` (${c.modality})` : "";
      return `${base}${mod}`;
    }
    return null;
  }
  if (t === "MEDICATION") {
    const c = item.catalogMedication;
    const n = c?.displayNameFr?.trim() || c?.name?.trim();
    const parts = [
      n,
      item.strength?.trim() || c?.strength?.trim(),
      c?.dosageForm,
      c?.route,
    ].filter(Boolean);
    if (parts.length) return parts.join(" · ");
    return null;
  }
  return null;
}

function catalogDisplayLabelEn(
  item: {
    catalogLabTest?: {
      code?: string | null;
      displayNameEn?: string | null;
      displayNameFr?: string | null;
      name?: string | null;
    } | null;
    catalogImagingStudy?: {
      code?: string | null;
      displayNameEn?: string | null;
      displayNameFr?: string | null;
      name?: string | null;
      modality?: string | null;
    } | null;
    catalogMedication?: {
      code?: string | null;
      displayNameEn?: string | null;
      displayNameFr?: string | null;
      name?: string | null;
      strength?: string | null;
      dosageForm?: string | null;
      route?: string | null;
    } | null;
    strength?: string | null;
  },
  t: string | null,
  catalogItemTypeForGuard: string
): string | null {
  if (t === "LAB_TEST") {
    const c = item.catalogLabTest;
    const line =
      pickFirstValidEnCatalogField(catalogItemTypeForGuard, c?.displayNameEn, c?.name, c?.code) ?? null;
    return line;
  }
  if (t === "IMAGING_STUDY") {
    const c = item.catalogImagingStudy;
    const base =
      pickFirstValidEnCatalogField(catalogItemTypeForGuard, c?.displayNameEn, c?.name, c?.code) ?? null;
    if (base) {
      const mod = c?.modality ? ` (${c.modality})` : "";
      const full = `${base}${mod}`;
      return isInvalidTechnicalOrderDisplayLabel(full, catalogItemTypeForGuard) ? base : full;
    }
    return null;
  }
  if (t === "MEDICATION") {
    const c = item.catalogMedication;
    const n = pickFirstValidEnCatalogField(catalogItemTypeForGuard, c?.displayNameEn, c?.name, c?.code);
    const parts = [
      n,
      item.strength?.trim() || c?.strength?.trim(),
      c?.dosageForm,
      c?.route,
    ].filter(Boolean);
    if (parts.length) return parts.join(" · ");
    return null;
  }
  return null;
}

function pickFirstValidEnCatalogField(
  catalogItemType: string,
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const c of candidates) {
    const v = (c ?? "").trim();
    if (v && !isInvalidTechnicalOrderDisplayLabel(v, catalogItemType)) return v;
  }
  return null;
}

function typeFallbackFr(t: string | null): string {
  if (t === "LAB_TEST") return "Analyse (libellé indisponible)";
  if (t === "IMAGING_STUDY") return "Imagerie (libellé indisponible)";
  if (t === "MEDICATION") return "Médicament (libellé indisponible)";
  if (t === "CARE") return "Soin (libellé indisponible)";
  return "—";
}

function typeFallbackEn(t: string | null, tr: (key: string) => string): string {
  if (t === "LAB_TEST") return tr("patientChartUi.orderDisplayFallback.labTest");
  if (t === "IMAGING_STUDY") return tr("patientChartUi.orderDisplayFallback.imaging");
  if (t === "MEDICATION") return tr("patientChartUi.orderDisplayFallback.medication");
  if (t === "CARE") return tr("patientChartUi.orderDisplayFallback.care");
  return tr("common.dash");
}

/** Base medication name: English catalog `name` first in EN, French display name first in FR. */
export function catalogMedicationNameForLocale(
  m: {
    code?: string | null;
    name?: string | null;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
  } | null | undefined,
  language: SupportedLanguage
): string {
  if (!m) return "";
  const catType = "MEDICATION";
  if (language === "en") {
    return pickFirstValidEnCatalogField(catType, m.displayNameEn, m.name, m.code) ?? "";
  }
  return (m.displayNameFr?.trim() || m.name?.trim() || m.displayNameEn?.trim() || "").trim();
}
