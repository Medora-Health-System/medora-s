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
  "gastro-intestinal": "Gastrointestinal",
  gastrointestinal: "Gastrointestinal",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Normalize catalog French clinical labels to English when locale is EN.
 * Raw catalog metadata (route, form, class) must pass through here before display (19U.1).
 * Unknown values pass through unchanged — expand maps in Phase 19U.2.
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

export function formatMedicationOptionForLocale(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t?: (key: string) => string
): { primary: string; subtitle: string } {
  const primary = getCatalogSearchItemDisplayLabel(item, language, t);
  const meta = item.metadata ?? {};
  const strength = normalizeMedicationDisplayForLocale(meta.strength, language);
  const form = normalizeMedicationDisplayForLocale(meta.dosageForm, language);
  const route = normalizeMedicationDisplayForLocale(meta.route, language);
  const therapeuticClass = normalizeMedicationDisplayForLocale(meta.therapeuticClass, language);
  const generic = normalizeMedicationDisplayForLocale(meta.genericName, language);

  const parts: string[] = [];
  if (strength && form) parts.push(`${strength} ${form}`);
  else if (item.secondaryText?.trim()) {
    parts.push(normalizeMedicationDisplayForLocale(item.secondaryText, language));
  } else {
    if (strength) parts.push(strength);
    if (form) parts.push(form);
  }
  if (route) parts.push(route);
  if (generic && !primary.toLowerCase().includes(generic.toLowerCase())) parts.push(generic);
  if (therapeuticClass) parts.push(therapeuticClass);

  return {
    primary,
    subtitle: parts.join(" — "),
  };
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
