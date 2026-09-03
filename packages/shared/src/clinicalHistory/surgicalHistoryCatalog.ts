/**
 * Governed static surgical-history catalog for clinical documentation (not procedure orders).
 * Past surgical history is free-text on triage/patient profile; this catalog assists search/picks only.
 * Do not reuse ENTERPRISE_PROCEDURE_CATALOG — that governs active CARE order lines (MEDPROC).
 */

import { pickCatalogDisplayLabelForProductUi } from "../i18n/productUiLocale.js";

export const SURGICAL_HISTORY_CATEGORIES = [
  "GENERAL",
  "GYN",
  "CARDIAC",
  "ORTHOPEDIC",
  "ENT",
  "ABDOMINAL",
  "OTHER",
] as const;

export type SurgicalHistoryCategory = (typeof SURGICAL_HISTORY_CATEGORIES)[number];

export type SurgicalHistorySearchLocale = "en" | "fr";

export type SurgicalHistoryCatalogEntry = {
  id: string;
  displayNameEn: string;
  displayNameFr: string;
  aliases: string[];
  category: SurgicalHistoryCategory;
  /** When set, only one active entry per group should remain in structured picks. */
  mutuallyExclusiveGroup?: string;
  /** When true, selecting replaces prior surgical-history text (e.g. no prior surgery). */
  replacesExisting?: boolean;
  /** Retired entries stay out of search but ids remain stable for future migration. */
  inactive?: boolean;
};

export const SURGICAL_HISTORY_SEARCH_MIN_CHARS = 2;

function safeSearchQuery(query: unknown): string {
  if (query == null) return "";
  if (typeof query === "string") return query.trim();
  return String(query).trim();
}

function safeText(value: unknown): string {
  return safeSearchQuery(value);
}

export const SURGICAL_HISTORY_CATALOG: readonly SurgicalHistoryCatalogEntry[] = [
  {
    id: "appendectomy",
    displayNameEn: "Appendectomy",
    displayNameFr: "Appendicectomie",
    aliases: ["appendix", "appendice"],
    category: "GENERAL",
  },
  {
    id: "cholecystectomy",
    displayNameEn: "Cholecystectomy",
    displayNameFr: "Cholécystectomie",
    aliases: ["gallbladder", "vésicule", "vesicule"],
    category: "GENERAL",
  },
  {
    id: "c_section",
    displayNameEn: "C-section",
    displayNameFr: "Césarienne",
    aliases: ["cesarean", "caesarean", "cesarienne"],
    category: "GYN",
  },
  {
    id: "hysterectomy",
    displayNameEn: "Hysterectomy",
    displayNameFr: "Hystérectomie",
    aliases: ["hysterectomie"],
    category: "GYN",
  },
  {
    id: "hernia_repair",
    displayNameEn: "Hernia repair",
    displayNameFr: "Cure de hernie",
    aliases: ["hernia", "hernie"],
    category: "GENERAL",
  },
  {
    id: "tonsillectomy",
    displayNameEn: "Tonsillectomy",
    displayNameFr: "Amygdalectomie",
    aliases: ["tonsils", "amygdales"],
    category: "ENT",
  },
  {
    id: "orthopedic_surgery",
    displayNameEn: "Orthopedic surgery",
    displayNameFr: "Chirurgie orthopédique",
    aliases: ["orthopedic", "orthopaedic", "fracture", "orthopedie", "orthopédie"],
    category: "ORTHOPEDIC",
  },
  {
    id: "cardiac_surgery_stent",
    displayNameEn: "Cardiac surgery / stent",
    displayNameFr: "Chirurgie cardiaque / stent",
    aliases: ["cardiac", "stent", "cabg", "bypass", "pontage", "cardiaque"],
    category: "CARDIAC",
  },
  {
    id: "abdominal_surgery",
    displayNameEn: "Abdominal surgery",
    displayNameFr: "Chirurgie abdominale",
    aliases: ["abdominal", "laparotomy", "laparotomie"],
    category: "ABDOMINAL",
  },
  {
    id: "no_prior_surgery",
    displayNameEn: "No prior surgery",
    displayNameFr: "Pas de chirurgie antérieure",
    aliases: ["none", "no prior", "no surgery", "aucune", "pas de chirurgie", "néant", "neant"],
    category: "OTHER",
    mutuallyExclusiveGroup: "prior_surgery_status",
    replacesExisting: true,
  },
  {
    id: "other",
    displayNameEn: "Other",
    displayNameFr: "Autre",
    aliases: ["other", "autre"],
    category: "OTHER",
  },
] as const;

export function normalizeSurgicalHistorySearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveSurgicalHistoryDisplayName(
  entry: SurgicalHistoryCatalogEntry,
  locale: SurgicalHistorySearchLocale | string
): string {
  return pickCatalogDisplayLabelForProductUi(locale, {
    displayNameEn: entry.displayNameEn,
    displayNameFr: entry.displayNameFr,
    code: entry.id,
  });
}

export function surgicalHistoryById(id: string): SurgicalHistoryCatalogEntry | undefined {
  const needle = safeSearchQuery(id);
  if (!needle) return undefined;
  return SURGICAL_HISTORY_CATALOG.find((e) => e.id === needle && !e.inactive);
}

export function activeSurgicalHistoryCatalog(
  catalog: readonly SurgicalHistoryCatalogEntry[] = SURGICAL_HISTORY_CATALOG
): SurgicalHistoryCatalogEntry[] {
  return catalog.filter((e) => !e.inactive);
}

function searchableHaystack(entry: SurgicalHistoryCatalogEntry, locale: SurgicalHistorySearchLocale): string {
  const parts = [
    entry.id.replace(/_/g, " "),
    resolveSurgicalHistoryDisplayName(entry, locale),
    // Dual-field search index (legacy bilingual storage). Not product-UI identity coercion.
    resolveSurgicalHistoryDisplayName(entry, locale === "en" ? "fr" : "en"),
    ...entry.aliases,
  ];
  return normalizeSurgicalHistorySearchText(parts.join(" "));
}

function matchesSurgicalHistoryQuery(
  entry: SurgicalHistoryCatalogEntry,
  needle: string,
  locale: SurgicalHistorySearchLocale
): boolean {
  const haystack = searchableHaystack(entry, locale);
  return haystack.includes(needle);
}

/** Search-only: empty or short query returns no results (TRIAGE.2 / TRIAGE.2A). */
export function searchSurgicalHistoryCatalog(
  query: string,
  locale: SurgicalHistorySearchLocale,
  catalog: readonly SurgicalHistoryCatalogEntry[] = SURGICAL_HISTORY_CATALOG
): SurgicalHistoryCatalogEntry[] {
  const q = safeSearchQuery(query);
  if (q.length < SURGICAL_HISTORY_SEARCH_MIN_CHARS) return [];
  const needle = normalizeSurgicalHistorySearchText(q);
  if (!needle) return [];
  return activeSurgicalHistoryCatalog(catalog).filter((entry) =>
    matchesSurgicalHistoryQuery(entry, needle, locale)
  );
}

/**
 * Applies a catalog pick to free-text past surgical history.
 * Does not create orders or persist catalog ids — text only.
 */
export function applySurgicalHistoryCatalogSelection(
  currentText: string,
  entry: SurgicalHistoryCatalogEntry,
  locale: SurgicalHistorySearchLocale
): string {
  const label = safeText(resolveSurgicalHistoryDisplayName(entry, locale));
  if (!label) return safeText(currentText);
  if (entry.replacesExisting) return label;
  const base = safeText(currentText);
  if (!base) return label;
  if (base.toLowerCase().includes(label.toLowerCase())) return base;
  return `${base}; ${label}`;
}
