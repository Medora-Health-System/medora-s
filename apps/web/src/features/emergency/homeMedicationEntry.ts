import type { SupportedLanguage } from "@/i18n/config";
import { getCatalogSearchItemDisplayLabel } from "@/lib/catalogDisplayLabel";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";

export type HomeMedicationStatus = "" | "active" | "inactive" | "in_error";

export type HomeMedicationCompliance =
  | ""
  | "taking_as_prescribed"
  | "not_taking"
  | "not_taking_as_prescribed"
  | "unknown";

export type HomeMedicationLastTaken = "" | "today" | "yesterday" | "past_week" | "unknown";

export type HomeMedicationEntryForm = {
  catalogId: string;
  medicationName: string;
  status: HomeMedicationStatus;
  doseValue: string;
  doseUnit: string;
  route: string;
  frequency: string;
  indication: string;
  startDate: string;
  lastTaken: HomeMedicationLastTaken;
  compliance: HomeMedicationCompliance;
  dosageForm: string;
  strength: string;
  quantity: string;
  refillsRemaining: string;
  duration: string;
  endDate: string;
  lastFillDate: string;
  therapeuticClass: string;
  source: string;
  patientInstructions: string;
  notes: string;
  catalogDetailsAvailable: boolean;
};

export const HOME_MED_FREQUENCY_CHIP_CODES = [
  "daily",
  "bid",
  "tid",
  "qid",
  "prn",
  "bedtime",
  "with_meals",
] as const;

export type HomeMedicationFrequencyChipCode = (typeof HOME_MED_FREQUENCY_CHIP_CODES)[number];

export const HOME_MED_COMPLIANCE_CHIP_CODES = [
  "taking_as_prescribed",
  "not_taking",
  "not_taking_as_prescribed",
  "unknown",
] as const;

export const HOME_MED_LAST_TAKEN_CHIP_CODES = [
  "today",
  "yesterday",
  "past_week",
  "unknown",
] as const;

export function emptyHomeMedicationEntryForm(): HomeMedicationEntryForm {
  return {
    catalogId: "",
    medicationName: "",
    status: "active",
    doseValue: "",
    doseUnit: "",
    route: "",
    frequency: "",
    indication: "",
    startDate: "",
    lastTaken: "",
    compliance: "",
    dosageForm: "",
    strength: "",
    quantity: "",
    refillsRemaining: "",
    duration: "",
    endDate: "",
    lastFillDate: "",
    therapeuticClass: "",
    source: "",
    patientInstructions: "",
    notes: "",
    catalogDetailsAvailable: false,
  };
}

/** Catalog-derived dose strength chips (e.g. 5 mg, 10 mg). */
export function extractHomeMedicationDoseStrengthChips(item: CatalogSearchItem): string[] {
  const meta = item.metadata ?? {};
  const chips: string[] = [];
  const add = (raw: string | undefined) => {
    const t = raw?.trim();
    if (!t) return;
    if (!chips.includes(t)) chips.push(t);
  };

  if (meta.strength?.trim()) add(meta.strength);

  const haystack = [meta.strength, meta.dosageForm, item.secondaryText, item.searchText]
    .filter(Boolean)
    .join(" ");
  const matches = haystack.match(/\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mL|unit|%|units?)/gi);
  if (matches) {
    for (const m of matches) add(m);
  }

  return chips.slice(0, 8);
}

export function catalogItemHasHomeMedicationDetails(item: CatalogSearchItem): boolean {
  const meta = item.metadata ?? {};
  return Boolean(
    meta.strength?.trim() ||
      meta.dosageForm?.trim() ||
      meta.route?.trim() ||
      meta.therapeuticClass?.trim() ||
      item.secondaryText?.trim()
  );
}

export function formatHomeMedicationSearchSubtitle(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  const meta = item.metadata ?? {};
  const strength = meta.strength?.trim();
  const form = meta.dosageForm?.trim();
  const route = meta.route?.trim();
  const therapeuticClass = meta.therapeuticClass?.trim();

  const parts: string[] = [];
  if (strength && form) {
    parts.push(`${strength} ${form}`);
  } else if (item.secondaryText?.trim()) {
    parts.push(item.secondaryText.trim());
  } else {
    if (strength) parts.push(strength);
    if (form) parts.push(form);
  }
  if (route) parts.push(route);
  if (therapeuticClass) parts.push(therapeuticClass);

  if (parts.length === 0) {
    return t("erTriage.homeMed.searchDetailsUnavailable");
  }
  return parts.join(" — ");
}

function parseDoseFromStrengthChip(chip: string): { doseValue: string; doseUnit: string } {
  const m = chip.trim().match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  if (!m) return { doseValue: "", doseUnit: "" };
  return { doseValue: m[1], doseUnit: m[2].trim() };
}

export function homeMedicationEntryFormFromCatalog(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string
): HomeMedicationEntryForm {
  const base = emptyHomeMedicationEntryForm();
  const meta = item.metadata ?? {};
  const catalogDetailsAvailable = catalogItemHasHomeMedicationDetails(item);
  const strength = meta.strength?.trim() ?? "";
  const doseUnitGuess = strength.match(/\d+(?:\.\d+)?\s*(.+)$/)?.[1]?.trim() ?? "";

  return {
    ...base,
    catalogId: item.id,
    medicationName: getCatalogSearchItemDisplayLabel(item, language, t),
    status: "active",
    strength,
    dosageForm: meta.dosageForm?.trim() ?? "",
    route: meta.route?.trim() ?? "",
    therapeuticClass: meta.therapeuticClass?.trim() ?? "",
    doseUnit: doseUnitGuess,
    source: t("erTriage.homeMed.sourceCatalog"),
    catalogDetailsAvailable,
  };
}

export function applyHomeMedicationDoseChip(
  form: HomeMedicationEntryForm,
  chip: string
): HomeMedicationEntryForm {
  const parsed = parseDoseFromStrengthChip(chip);
  return {
    ...form,
    strength: chip.trim(),
    doseValue: parsed.doseValue || form.doseValue,
    doseUnit: parsed.doseUnit || form.doseUnit,
  };
}

function doseSegment(entry: HomeMedicationEntryForm): string {
  if (entry.doseValue.trim() && entry.doseUnit.trim()) {
    return `${entry.doseValue.trim()} ${entry.doseUnit.trim()}`;
  }
  if (entry.strength.trim()) return entry.strength.trim();
  return "";
}

function hasConfirmedDoseOrFrequency(entry: HomeMedicationEntryForm): boolean {
  return Boolean(
    doseSegment(entry) ||
      entry.frequency.trim() ||
      entry.route.trim() ||
      entry.dosageForm.trim()
  );
}

/**
 * Readable one-line home medication summary appended to triage `medicationsSummary`.
 * Does not create orders, MAR events, or billing.
 */
export function formatHomeMedicationSummaryLine(
  entry: HomeMedicationEntryForm,
  t: (key: string) => string
): string {
  const name = entry.medicationName.trim();
  if (!name) return "";

  if (!hasConfirmedDoseOrFrequency(entry)) {
    return `${name} — ${t("erTriage.homeMed.summaryNotConfirmed")}`;
  }

  const headParts: string[] = [name];
  const dose = doseSegment(entry);
  if (dose) headParts.push(dose);
  if (entry.dosageForm.trim()) headParts.push(entry.dosageForm.trim());

  const routeFreq: string[] = [];
  if (entry.route.trim()) routeFreq.push(entry.route.trim());
  if (entry.frequency.trim()) routeFreq.push(entry.frequency.trim());
  if (routeFreq.length) headParts.push(routeFreq.join(" "));

  let line = headParts.join(" ");

  if (entry.compliance) {
    line += ` — ${t(`erTriage.homeMed.compliance.${entry.compliance}`)}`;
  }
  if (entry.lastTaken) {
    line += `; ${t("erTriage.homeMed.lastTakenPrefix")} ${t(`erTriage.homeMed.lastTaken.${entry.lastTaken}`)}`;
  }
  if (entry.indication.trim()) {
    line += ` (${entry.indication.trim()})`;
  }
  if (entry.notes.trim()) {
    line += `. ${entry.notes.trim()}`;
  }

  return line.replace(/\s+/g, " ").trim();
}

export function homeMedicationEntryFormIsValid(entry: HomeMedicationEntryForm): boolean {
  return Boolean(entry.medicationName.trim());
}

/** Explicit guard: home medication triage entry is documentation-only. */
export const HOME_MEDICATION_TRIAGE_DOCUMENTATION_ONLY = true as const;
