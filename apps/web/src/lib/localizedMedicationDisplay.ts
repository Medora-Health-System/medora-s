import {
  medicationClinicalDisplayLocaleForProductUi,
  type SupportedLanguage,
} from "@/i18n/config";
import { getCatalogSearchItemDisplayLabel } from "@/lib/catalogDisplayLabel";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import type { HomeMedicationEntryForm } from "@/features/emergency/homeMedicationEntry";
import {
  buildMedicationCatalogClinicalParts,
  filterMedicationAliasesForDisplayLocale,
  formatMedicationCatalogClinicalLine,
  medicationEnglishDisplayContainsFrenchLeak,
  normalizeMedicationSecondaryTextBlob,
  resolveMedicationClinicalDisplayValue,
  type MedicationCatalogClinicalFields,
  type MedicationClinicalDisplayLocale,
} from "@medora/shared";

function toClinicalLocale(language: SupportedLanguage): MedicationClinicalDisplayLocale {
  return medicationClinicalDisplayLocaleForProductUi(language);
}

/**
 * Normalize catalog French clinical labels to English when locale is EN.
 * Display-only — never mutate persisted catalog DB values or clinical free text at save time.
 */
export function normalizeMedicationDisplayForLocale(
  value: string | null | undefined,
  language: SupportedLanguage,
  field?: "dosageForm" | "route" | "therapeuticClass" | "frequency"
): string {
  return resolveMedicationClinicalDisplayValue(value, toClinicalLocale(language), field);
}

export type CatalogMedicationMetadataFields = MedicationCatalogClinicalFields;

function medicationFieldsFromSearchItem(
  item: Pick<CatalogSearchItem, "metadata">
): MedicationCatalogClinicalFields {
  const meta = item.metadata ?? {};
  return {
    strength: meta.strength,
    dosageForm: meta.dosageForm,
    route: meta.route,
    therapeuticClass: meta.therapeuticClass,
  };
}

function localeSecondaryFromItem(
  item: Pick<CatalogSearchItem, "secondaryText" | "secondaryTextEn" | "secondaryTextFr">,
  language: SupportedLanguage
): string | undefined {
  const locale = toClinicalLocale(language);
  if (locale === "en" && item.secondaryTextEn?.trim()) return item.secondaryTextEn.trim();
  if (locale === "fr" && item.secondaryTextFr?.trim()) return item.secondaryTextFr.trim();
  return undefined;
}

/**
 * Build locale-aware medication metadata detail parts (route, form, class, frequency).
 * Strength is passed through unchanged (typically numeric + unit).
 */
export function formatCatalogMedicationMetadataParts(
  fields: CatalogMedicationMetadataFields,
  language: SupportedLanguage
): string[] {
  return buildMedicationCatalogClinicalParts(fields, toClinicalLocale(language));
}

/**
 * Subtitle / secondary line for medication catalog search rows (display only).
 */
export function formatCatalogMedicationSubtitleForLocale(
  item: Pick<
    CatalogSearchItem,
    "type" | "secondaryText" | "secondaryTextEn" | "secondaryTextFr" | "metadata"
  >,
  language: SupportedLanguage,
  separator = " · "
): string {
  if (item.type !== "MEDICATION") {
    return item.secondaryText?.trim() ?? "";
  }

  const fromApi = localeSecondaryFromItem(item, language);
  if (fromApi) return fromApi;

  const structuredParts = formatCatalogMedicationMetadataParts(
    medicationFieldsFromSearchItem(item),
    language
  );

  if (structuredParts.length > 0) {
    return structuredParts.join(separator);
  }

  if (item.secondaryText?.trim()) {
    return normalizeMedicationSecondaryTextBlob(item.secondaryText, toClinicalLocale(language));
  }

  return "";
}

/** Joined order / worklist medication detail suffix (display only). */
export function formatCatalogMedicationOrderDetailLine(
  fields: CatalogMedicationMetadataFields,
  language: SupportedLanguage
): string {
  return formatMedicationCatalogClinicalLine(fields, toClinicalLocale(language));
}

export function formatMedicationOptionForLocale(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t?: (key: string) => string
): { primary: string; subtitle: string } {
  const primary = getCatalogSearchItemDisplayLabel(item, language, t);
  const meta = item.metadata ?? {};
  const locale = toClinicalLocale(language);
  const generic = normalizeMedicationDisplayForLocale(meta.genericName, language);

  let subtitle = formatCatalogMedicationSubtitleForLocale(item, language, " — ");
  const displayAliases = filterMedicationAliasesForDisplayLocale(meta.commonAliases, locale);
  const aliasHint = displayAliases[0];
  if (aliasHint && !primary.toLowerCase().includes(aliasHint.toLowerCase())) {
    subtitle = subtitle ? `${subtitle} — ${aliasHint}` : aliasHint;
  } else if (generic && !primary.toLowerCase().includes(generic.toLowerCase())) {
    subtitle = subtitle ? `${subtitle} — ${generic}` : generic;
  }

  return { primary, subtitle };
}

/** @deprecated Use medicationEnglishDisplayContainsFrenchLeak from shared — kept for existing tests. */
export function englishMedicationDisplayContainsFrench(value: string): boolean {
  return medicationEnglishDisplayContainsFrenchLeak(value);
}

export function formatHomeMedicationSummaryForLocale(
  entry: HomeMedicationEntryForm,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  const name = entry.medicationName.trim();
  if (!name) return "";

  const dose =
    entry.doseValue.trim() && entry.doseUnit.trim()
      ? `${entry.doseValue.trim()} ${normalizeMedicationDisplayForLocale(entry.doseUnit, language)}`
      : normalizeMedicationDisplayForLocale(entry.strength, language);

  const form = normalizeMedicationDisplayForLocale(entry.dosageForm, language, "dosageForm");
  const route = normalizeMedicationDisplayForLocale(entry.route, language, "route");
  const frequency = normalizeMedicationDisplayForLocale(entry.frequency, language, "frequency");

  const hasDetails = Boolean(dose || form || route || frequency);
  if (!hasDetails) {
    return `${name} — ${t("erTriage.homeMed.summaryNotConfirmed")}`;
  }

  const headParts = [name];
  if (dose) headParts.push(dose);
  if (form) headParts.push(form);
  const routeFreq = [route, frequency].filter(Boolean).join(" ");
  if (routeFreq) headParts.push(routeFreq);

  let line = headParts.join(" ");
  if (entry.lastTaken) {
    line += `; ${t("erTriage.homeMed.lastTakenPrefix")} ${t(`erTriage.homeMed.lastTaken.${entry.lastTaken}`)}`;
  }
  return line.replace(/\s+/g, " ").trim();
}
