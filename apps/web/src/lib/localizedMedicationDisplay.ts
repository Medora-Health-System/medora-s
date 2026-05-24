import type { SupportedLanguage } from "@/i18n/config";
import { getCatalogSearchItemDisplayLabel } from "@/lib/catalogDisplayLabel";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import type { HomeMedicationEntryForm } from "@/features/emergency/homeMedicationEntry";

const FRENCH_TO_ENGLISH_MEDICATION_LABELS: Record<string, string> = {
  comprimé: "tablet",
  comprime: "tablet",
  "comprimé orale": "oral tablet",
  orale: "oral",
  oral: "oral",
  intraveineuse: "intravenous",
  intraveineux: "intravenous",
  iv: "IV",
  "sous-cutanée": "subcutaneous",
  "sous-cutané": "subcutaneous",
  intramusculaire: "intramuscular",
  capsule: "capsule",
  gélule: "capsule",
  "solution injectable": "injectable solution",
  antidiabétique: "Antidiabetic",
  antidiabetique: "Antidiabetic",
  "gastro-intestinal": "Gastrointestinal",
  gastrointestinal: "Gastrointestinal",
  quotidien: "daily",
  "1 fois par jour": "once daily",
  "deux fois par jour": "twice daily",
  "trois fois par jour": "three times daily",
  bid: "twice daily",
  tid: "three times daily",
  qid: "four times daily",
  qd: "once daily",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Normalize catalog French clinical labels to English when locale is EN.
 * Display-only — never mutate persisted catalog DB values or clinical free text at save time.
 */
export function normalizeMedicationDisplayForLocale(
  value: string | null | undefined,
  language: SupportedLanguage
): string {
  const raw = value?.trim();
  if (!raw) return "";
  if (language === "fr") return raw;

  const key = normalizeKey(raw);
  if (FRENCH_TO_ENGLISH_MEDICATION_LABELS[key]) {
    return FRENCH_TO_ENGLISH_MEDICATION_LABELS[key];
  }

  // Partial replacements for compound French phrases (longest keys first).
  let out = raw;
  const entries = Object.entries(FRENCH_TO_ENGLISH_MEDICATION_LABELS).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [fr, en] of entries) {
    const re = new RegExp(fr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (re.test(out)) out = out.replace(re, en);
  }
  return out.replace(/\s+/g, " ").trim();
}

export type CatalogMedicationMetadataFields = {
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  frequency?: string | null;
  therapeuticClass?: string | null;
};

function normalizedField(value: string | null | undefined, language: SupportedLanguage): string {
  return normalizeMedicationDisplayForLocale(value, language);
}

/**
 * Build locale-aware medication metadata detail parts (route, form, class, frequency).
 * Strength is passed through unchanged (typically numeric + unit).
 */
export function formatCatalogMedicationMetadataParts(
  fields: CatalogMedicationMetadataFields,
  language: SupportedLanguage
): string[] {
  const strength = fields.strength?.trim() ?? "";
  const form = normalizedField(fields.dosageForm, language);
  const route = normalizedField(fields.route, language);
  const frequency = normalizedField(fields.frequency, language);
  const therapeuticClass = normalizedField(fields.therapeuticClass, language);

  const parts: string[] = [];
  if (strength && form) parts.push(`${strength} ${form}`);
  else {
    if (strength) parts.push(strength);
    if (form) parts.push(form);
  }
  if (route) parts.push(route);
  if (frequency) parts.push(frequency);
  if (therapeuticClass) parts.push(therapeuticClass);
  return parts;
}

/**
 * Subtitle / secondary line for medication catalog search rows (display only).
 */
export function formatCatalogMedicationSubtitleForLocale(
  item: Pick<CatalogSearchItem, "type" | "secondaryText" | "metadata">,
  language: SupportedLanguage,
  separator = " · "
): string {
  if (item.type !== "MEDICATION") {
    return item.secondaryText?.trim() ?? "";
  }

  const meta = item.metadata ?? {};
  const structuredParts = formatCatalogMedicationMetadataParts(
    {
      strength: meta.strength,
      dosageForm: meta.dosageForm,
      route: meta.route,
      therapeuticClass: meta.therapeuticClass,
    },
    language
  );

  if (structuredParts.length > 0) {
    return structuredParts.join(separator);
  }

  if (item.secondaryText?.trim()) {
    return normalizedField(item.secondaryText, language);
  }

  return "";
}

/** Joined order / worklist medication detail suffix (display only). */
export function formatCatalogMedicationOrderDetailLine(
  fields: CatalogMedicationMetadataFields,
  language: SupportedLanguage
): string {
  return formatCatalogMedicationMetadataParts(fields, language).join(" · ");
}

export function formatMedicationOptionForLocale(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t?: (key: string) => string
): { primary: string; subtitle: string } {
  const primary = getCatalogSearchItemDisplayLabel(item, language, t);
  const meta = item.metadata ?? {};
  const generic = normalizedField(meta.genericName, language);

  let subtitle = formatCatalogMedicationSubtitleForLocale(item, language, " — ");
  if (generic && !primary.toLowerCase().includes(generic.toLowerCase())) {
    subtitle = subtitle ? `${subtitle} — ${generic}` : generic;
  }

  return { primary, subtitle };
}

const ENGLISH_FORBIDDEN_IN_EN_UI = [
  "comprimé",
  "orale",
  "intraveineuse",
  "antidiabétique",
] as const;

export function englishMedicationDisplayContainsFrench(value: string): boolean {
  const lower = value.toLowerCase();
  return ENGLISH_FORBIDDEN_IN_EN_UI.some((word) => lower.includes(word));
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

  const form = normalizeMedicationDisplayForLocale(entry.dosageForm, language);
  const route = normalizeMedicationDisplayForLocale(entry.route, language);
  const frequency = normalizeMedicationDisplayForLocale(entry.frequency, language);

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
