/**
 * M1.7A.3 — Locale-aware medication clinical field display (dosage form, route, class).
 * Display-only: does not mutate persisted catalog values.
 */

import { looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";

export type MedicationClinicalDisplayLocale = "en" | "fr";

export type MedicationCatalogClinicalFields = {
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  therapeuticClass?: string | null;
  frequency?: string | null;
};

/** Haiti formulary FR → EN clinical labels (complete set for active catalog). */
const DOSAGE_FORM_FR_TO_EN: Record<string, string> = {
  "aérosol doseur": "metered-dose inhaler",
  aérosol: "aerosol",
  capsule: "capsule",
  collyre: "eye drops",
  "comprimé dispersible": "dispersible tablet",
  comprimé: "tablet",
  comprime: "tablet",
  crème: "cream",
  gélule: "capsule",
  gelule: "capsule",
  inhalateur: "inhaler",
  injectable: "injectable",
  lotion: "lotion",
  nébulisation: "nebulization",
  ovule: "vaginal suppository",
  perfusion: "infusion",
  "pommade ophtalmique": "ophthalmic ointment",
  pommade: "ointment",
  "poudre pour solution buvable": "powder for oral solution",
  shampooing: "shampoo",
  sirop: "syrup",
  "solution de nébulisation": "nebulizer solution",
  "spray nasal": "nasal spray",
  suppositoire: "suppository",
  "suspension buvable": "oral suspension",
};

const ROUTE_FR_TO_EN: Record<string, string> = {
  inhalation: "inhalation",
  inhalée: "inhaled",
  injectable: "injection",
  intramusculaire: "intramuscular",
  "intraveineuse / intramusculaire": "IV / IM",
  intraveineuse: "intravenous",
  nasale: "nasal",
  ophtalmique: "ophthalmic",
  orale: "oral",
  rectale: "rectal",
  "sous-cutanée": "subcutaneous",
  topique: "topical",
  vaginale: "vaginal",
};

const THERAPEUTIC_CLASS_FR_TO_EN: Record<string, string> = {
  AINS: "NSAID",
  "Analgésique / antipyrétique": "Analgesic / antipyretic",
  Analgésique: "Analgesic",
  "Anesthésique local": "Local anesthetic",
  Anesthésique: "Anesthetic",
  "Antalgique opioïde": "Opioid analgesic",
  Antalgique: "Analgesic",
  Antiacide: "Antacid",
  Antiarythmique: "Antiarrhythmic",
  Antibiotique: "Antibiotic",
  Anticoagulant: "Anticoagulant",
  Antidiabétique: "Antidiabetic",
  Antidiarrhéique: "Antidiarrheal",
  Antifongique: "Antifungal",
  Antihistaminique: "Antihistamine",
  Antihypertenseur: "Antihypertensive",
  Antipaludique: "Antimalarial",
  "Antiparasitaire cutané": "Topical antiparasitic",
  Antiparasitaire: "Antiparasitic",
  Antiplaquettaire: "Antiplatelet",
  "Antipsychotique / antiémétique": "Antipsychotic / antiemetic",
  Antipsychotique: "Antipsychotic",
  Antispasmodique: "Antispasmodic",
  Antiviral: "Antiviral",
  Antiémetique: "Antiemetic",
  Antiémétique: "Antiemetic",
  Anxiolytique: "Anxiolytic",
  Benzodiazépine: "Benzodiazepine",
  Bronchodilatateur: "Bronchodilator",
  "Bêta-bloquant": "Beta-blocker",
  "Contraception d'urgence": "Emergency contraception",
  Contraception: "Contraception",
  "Correction hydro-électrolytique": "Fluid and electrolyte replacement",
  Corticostéroide: "Corticosteroid",
  "Corticoïde inhalé": "Inhaled corticosteroid",
  Corticoïde: "Corticosteroid",
  Curare: "Neuromuscular blocker",
  Dermatologie: "Dermatology",
  Diurétique: "Diuretic",
  Grossesse: "Pregnancy",
  Hypolipémiant: "Lipid-lowering",
  Hémostase: "Hemostasis",
  IPP: "PPI",
  "Inotrope / vasopresseur": "Inotrope / vasopressor",
  Inotrope: "Inotrope",
  Laxatif: "Laxative",
  ORL: "ENT",
  Obstétrique: "Obstetric",
  Ophtalmologie: "Ophthalmology",
  "Réhydratation / micronutriment": "Rehydration / micronutrient",
  Réhydratation: "Rehydration",
  Soluté: "Solution",
  Thyroïde: "Thyroid",
  Urgence: "Emergency",
  Vasopresseur: "Vasopressor",
  Vitamine: "Vitamin",
  Vitamines: "Vitamins",
  Électrolyte: "Electrolyte",
};

const FREQUENCY_FR_TO_EN: Record<string, string> = {
  quotidien: "daily",
  "1 fois par jour": "once daily",
  "deux fois par jour": "twice daily",
  "trois fois par jour": "three times daily",
  bid: "twice daily",
  tid: "three times daily",
  qid: "four times daily",
  qd: "once daily",
};

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function mapFrToEn(value: string, table: Record<string, string>): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const direct = table[trimmed];
  if (direct) return direct;
  const lower = normalizeLookupKey(trimmed);
  for (const [fr, en] of Object.entries(table)) {
    if (normalizeLookupKey(fr) === lower) return en;
  }
  return trimmed;
}

/**
 * Resolve one persisted clinical label for UI locale.
 * French locale returns stored text; English applies formulary map then passes through ASCII clinical terms.
 */
export function resolveMedicationClinicalDisplayValue(
  value: string | null | undefined,
  locale: MedicationClinicalDisplayLocale,
  field: "dosageForm" | "route" | "therapeuticClass" | "frequency" = "dosageForm"
): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  if (locale === "fr") return raw;

  const table =
    field === "route"
      ? ROUTE_FR_TO_EN
      : field === "therapeuticClass"
        ? THERAPEUTIC_CLASS_FR_TO_EN
        : field === "frequency"
          ? FREQUENCY_FR_TO_EN
          : DOSAGE_FORM_FR_TO_EN;

  return mapFrToEn(raw, table);
}

/** Structured metadata parts for medication search / order display. */
export function buildMedicationCatalogClinicalParts(
  fields: MedicationCatalogClinicalFields,
  locale: MedicationClinicalDisplayLocale
): string[] {
  const strength = fields.strength?.trim() ?? "";
  const form = resolveMedicationClinicalDisplayValue(fields.dosageForm, locale, "dosageForm");
  const route = resolveMedicationClinicalDisplayValue(fields.route, locale, "route");
  const frequency = resolveMedicationClinicalDisplayValue(fields.frequency, locale, "frequency");
  const therapeuticClass = resolveMedicationClinicalDisplayValue(
    fields.therapeuticClass,
    locale,
    "therapeuticClass"
  );

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

export function formatMedicationCatalogClinicalLine(
  fields: MedicationCatalogClinicalFields,
  locale: MedicationClinicalDisplayLocale,
  separator = " · "
): string {
  return buildMedicationCatalogClinicalParts(fields, locale).join(separator);
}

export type MedicationCatalogSecondaryTexts = {
  secondaryTextFr: string;
  secondaryTextEn: string;
};

export function buildMedicationCatalogSecondaryTexts(
  fields: MedicationCatalogClinicalFields
): MedicationCatalogSecondaryTexts {
  return {
    secondaryTextFr: formatMedicationCatalogClinicalLine(fields, "fr"),
    secondaryTextEn: formatMedicationCatalogClinicalLine(fields, "en"),
  };
}

function resolveMappedClinicalValue(
  piece: string,
  locale: MedicationClinicalDisplayLocale,
  field: "dosageForm" | "route" | "therapeuticClass"
): string | undefined {
  const resolved = resolveMedicationClinicalDisplayValue(piece, locale, field);
  return normalizeLookupKey(resolved) !== normalizeLookupKey(piece) ? resolved : undefined;
}

/** Normalize legacy combined secondaryText blobs (FR tokens joined by ·). */
export function normalizeMedicationSecondaryTextBlob(
  secondaryText: string | null | undefined,
  locale: MedicationClinicalDisplayLocale
): string {
  const raw = secondaryText?.trim();
  if (!raw) return "";
  if (locale === "fr") return raw;

  return raw
    .split("·")
    .map((segment) => {
      const piece = segment.trim();
      if (!piece) return "";
      const strengthForm = /^(\d[\d./\s]*(?:mg|mcg|g|mL|ml|%)?)\s+(.+)$/i.exec(piece);
      if (strengthForm) {
        const strength = strengthForm[1].trim();
        const form =
          resolveMappedClinicalValue(strengthForm[2], "en", "dosageForm") ??
          strengthForm[2].trim();
        return form ? `${strength} ${form}` : strength;
      }
      return (
        resolveMappedClinicalValue(piece, "en", "therapeuticClass") ??
        resolveMappedClinicalValue(piece, "en", "route") ??
        resolveMappedClinicalValue(piece, "en", "dosageForm") ??
        piece
      );
    })
    .filter(Boolean)
    .join(" · ");
}

/** Filter alias strings for display in the active UI locale (search may still match all). */
export function filterMedicationAliasesForDisplayLocale(
  aliases: readonly string[] | undefined,
  locale: MedicationClinicalDisplayLocale
): string[] {
  if (!aliases?.length) return [];
  return aliases
    .map((a) => a.trim())
    .filter((text) => text.length > 0 && (locale === "fr" || !looksFrenchLocalizedText(text)));
}

const EN_UI_FRENCH_LEAK_MARKERS = [
  "comprimé",
  "comprime",
  "orale",
  "intraveineuse",
  "antidiabétique",
  "antidiabetique",
  "analgésique",
  "analgesique",
  "antipyrétique",
  "antipyretique",
  "antalgique",
  "suspension buvable",
  "buvable",
  "gélule",
  "gelule",
  "nébulisation",
  "sous-cutanée",
  "bêta-bloquant",
] as const;

/** Regression guard: English UI strings must not contain common French clinical tokens. */
export function medicationEnglishDisplayContainsFrenchLeak(text: string): boolean {
  const lower = text.toLowerCase();
  if (looksFrenchLocalizedText(text)) return true;
  return EN_UI_FRENCH_LEAK_MARKERS.some((marker) => lower.includes(marker));
}
