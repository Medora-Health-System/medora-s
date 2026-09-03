import { catalogLabelStrategyForProductUi, type SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { formatCatalogMedicationOrderDetailLine } from "@/lib/localizedMedicationDisplay";
import {
  isIncompleteMedicationOrderDisplayLabel,
  isInvalidTechnicalOrderDisplayLabel,
  isOrderDisplayLabelUnavailable,
  looksEnglishFormText,
  medicationEnglishDisplayContainsFrenchLeak,
  medicationOrderStrengthCandidates,
  OXYGEN_THERAPY_PROCEDURE_CODE,
  pickStrictEnCatalogPrimaryLabel,
  resolveMedicationClinicalDisplayValue,
  resolveMedicationOrderIdentity,
  resolveOxygenTherapyOrderDisplay,
} from "@medora/shared";

/**
 * Libellé affichable pour une ligne d’ordre (priorité alignée sur l’API enrichOrderItemsForDisplay).
 * Ne jamais exposer catalogItemId dans l’UI.
 *
 * Priorité : displayLabelFr → catalogue (displayNameFr / name selon le type) → manualLabel (+ secondaire) → repli FR.
 */
/** Append locale-normalized form/route when English identity label omits catalog metadata. */
function appendEnglishMedicationCatalogFormRoute(
  baseLabel: string,
  catalogMedication?: { dosageForm?: string | null; route?: string | null } | null
): string {
  if (!catalogMedication) return baseLabel;
  const lower = baseLabel.toLowerCase();
  const extras: string[] = [];
  for (const [raw, field] of [
    [catalogMedication.dosageForm, "dosageForm"],
    [catalogMedication.route, "route"],
  ] as const) {
    const trimmed = raw?.trim();
    if (!trimmed || looksEnglishFormText(trimmed)) continue;
    if (!medicationEnglishDisplayContainsFrenchLeak(trimmed)) continue;
    const normalized = resolveMedicationClinicalDisplayValue(trimmed, "en", field);
    if (normalized && !lower.includes(normalized.toLowerCase())) extras.push(normalized);
  }
  return extras.length ? `${baseLabel} · ${extras.join(" · ")}` : baseLabel;
}

/** French catalog resolution (used only inside {@link getOrderItemDisplayLabelForLanguage}). */
function orderItemDisplayLabelFr(item: {
  displayLabelFr?: string | null;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  catalogItemType?: string | null;
  enterpriseProcedureId?: string | null;
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
  if (resolvedTypeFr === "CARE" && item.enterpriseProcedureId?.trim() === OXYGEN_THERAPY_PROCEDURE_CODE) {
    const oxygen = resolveOxygenTherapyOrderDisplay({
      manualLabel: item.manualLabel,
      notes: item.notes,
      locale: "fr",
    });
    if (oxygen?.title) return oxygen.title;
  }
  if (resolvedTypeFr === "MEDICATION") {
    const strengthCandidates = medicationOrderStrengthCandidates(medicationIdentityInput(item));
    const dlf = item.displayLabelFr?.trim();
    if (
      dlf &&
      !isIncompleteMedicationOrderDisplayLabel(dlf, {
        strengthCandidates,
        catalogItemType: catGuardFr,
      })
    ) {
      return dlf;
    }
    const identity = resolveMedicationOrderIdentity(medicationIdentityInput(item));
    if (identity.medicationNameFr || identity.medicationNameEn) return identity.displayLabelFr;
    return typeFallbackFr(resolvedTypeFr);
  }

  const dlf = item.displayLabelFr?.trim();
  if (dlf && !isOrderDisplayLabelUnavailable(dlf) && !isInvalidTechnicalOrderDisplayLabel(dlf, catGuardFr)) {
    return dlf;
  }

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
    enterpriseProcedureId?: string | null;
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
      genericName?: string | null;
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
  if (catalogLabelStrategyForProductUi(language) === "fr_preferred") return orderItemDisplayLabelFr(item);
  const resolvedType = resolveCatalogItemType(item);
  const catType = String(item.catalogItemType ?? resolvedType ?? "CARE");
  if (resolvedType === "CARE" && item.enterpriseProcedureId?.trim() === OXYGEN_THERAPY_PROCEDURE_CODE) {
    const oxygen = resolveOxygenTherapyOrderDisplay({
      manualLabel: item.manualLabel,
      notes: item.notes,
      locale: "en",
    });
    if (oxygen?.title) return oxygen.title;
  }
  if (resolvedType === "MEDICATION") {
    const strengthCandidates = medicationOrderStrengthCandidates(medicationIdentityInput(item));
    const enApi = item.displayLabelEn?.trim();
    if (
      enApi &&
      !isIncompleteMedicationOrderDisplayLabel(enApi, {
        strengthCandidates,
        catalogItemType: catType,
      })
    ) {
      return enApi;
    }
    const identity = resolveMedicationOrderIdentity(medicationIdentityInput(item));
    if (identity.medicationNameEn || identity.medicationNameFr) {
      return appendEnglishMedicationCatalogFormRoute(
        identity.displayLabelEn,
        item.catalogMedication
      );
    }
    return typeFallbackEn(resolvedType, t);
  }
  const enApi = item.displayLabelEn?.trim();
  if (enApi && !isOrderDisplayLabelUnavailable(enApi) && !isInvalidTechnicalOrderDisplayLabel(enApi, catType)) {
    return enApi;
  }
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
    const identity = resolveMedicationOrderIdentity(medicationIdentityInput(item));
    if (identity.medicationNameFr || identity.medicationNameEn) return identity.displayLabelFr;
    const c = item.catalogMedication;
    const detail = formatCatalogMedicationOrderDetailLine(
      {
        strength: item.strength?.trim() || c?.strength?.trim() || null,
        dosageForm: c?.dosageForm,
        route: c?.route,
      },
      "fr"
    );
    if (detail && !isIncompleteMedicationOrderDisplayLabel(detail, { strengthCandidates: [detail] })) {
      return detail;
    }
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
      genericName?: string | null;
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
    const en = (c?.displayNameEn ?? "").trim();
    if (en && !isInvalidTechnicalOrderDisplayLabel(en, catalogItemTypeForGuard)) return en;
    const code = (c?.code ?? "").trim();
    if (code) return code;
    return null;
  }
  if (t === "IMAGING_STUDY") {
    const c = item.catalogImagingStudy;
    const en = (c?.displayNameEn ?? "").trim();
    let base: string | null = null;
    if (en && !isInvalidTechnicalOrderDisplayLabel(en, catalogItemTypeForGuard)) base = en;
    else {
      const code = (c?.code ?? "").trim();
      if (code) base = code;
    }
    if (base) {
      const mod = c?.modality ? ` (${c.modality})` : "";
      const full = `${base}${mod}`;
      return isInvalidTechnicalOrderDisplayLabel(full, catalogItemTypeForGuard) ? base : full;
    }
    return null;
  }
  if (t === "MEDICATION") {
    const identity = resolveMedicationOrderIdentity(medicationIdentityInput(item));
    if (identity.medicationNameEn || identity.medicationNameFr) {
      return appendEnglishMedicationCatalogFormRoute(
        identity.displayLabelEn,
        item.catalogMedication
      );
    }
    const c = item.catalogMedication;
    const detail = formatCatalogMedicationOrderDetailLine(
      {
        strength: item.strength?.trim() || c?.strength?.trim() || null,
        dosageForm: c?.dosageForm,
        route: c?.route,
      },
      "en"
    );
    if (detail && !isIncompleteMedicationOrderDisplayLabel(detail, { strengthCandidates: [detail] })) {
      return detail;
    }
    return null;
  }
  return null;
}

function medicationIdentityInput(item: {
  catalogMedication?: {
    code?: string | null;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
    genericName?: string | null;
    name?: string | null;
    strength?: string | null;
  } | null;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  strength?: string | null;
}) {
  return {
    catalogMedication: item.catalogMedication ?? null,
    orderLine: {
      catalogItemType: "MEDICATION" as const,
      manualLabel: item.manualLabel,
      manualSecondaryText: item.manualSecondaryText,
      strength: item.strength,
    },
  };
}

function typeFallbackFr(t: string | null): string {
  if (t === "LAB_TEST") return "Analyse (libellé indisponible)";
  if (t === "IMAGING_STUDY") return "Imagerie (libellé indisponible)";
  if (t === "MEDICATION") return "Médicament (libellé indisponible)";
  if (t === "CARE") return "Soin (libellé indisponible)";
  if (t === "SUPPLY") return "Article / fourniture (libellé indisponible)";
  return "—";
}

function typeFallbackEn(t: string | null, tr: (key: string) => string): string {
  if (t === "LAB_TEST") return tr("patientChartUi.orderDisplayFallback.labTest");
  if (t === "IMAGING_STUDY") return tr("patientChartUi.orderDisplayFallback.imaging");
  if (t === "MEDICATION") return tr("patientChartUi.orderDisplayFallback.medication");
  if (t === "CARE") return tr("patientChartUi.orderDisplayFallback.care");
  if (t === "SUPPLY") return tr("patientChartUi.orderDisplayFallback.supply");
  return tr("common.dash");
}

/** Base medication name: EN uses strict catalog policy (no legacy `name`); FR uses FR → EN → `name`. */
export function catalogMedicationNameForLocale(
  m: {
    code?: string | null;
    name?: string | null;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
    genericName?: string | null;
  } | null | undefined,
  language: SupportedLanguage
): string {
  if (!m) return "";
  const identity = resolveMedicationOrderIdentity({
    catalogMedication: m,
    orderLine: { catalogItemType: "MEDICATION" },
  });
  const strategy = catalogLabelStrategyForProductUi(language);
  if (strategy === "fr_preferred") {
    return identity.medicationNameFr ?? "";
  }
  return identity.medicationNameEn ?? "";
}
