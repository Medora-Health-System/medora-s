/**
 * M1.7A.6 — Single source of truth for medication order line identity (name + strength).
 * Used by API enrichment, MAR snapshots, and web display helpers.
 */

import type { CatalogMedicationLabel, OrderItemLabelInput } from "../orders/orderItemDisplayLabels.js";

const TECHNICAL_DISPLAY_TOKENS = new Set([
  "LAB_TEST",
  "IMAGING_STUDY",
  "MEDICATION",
  "CARE",
  "SUPPLY",
  "IVP",
  "PROCEDURE",
]);

function isInvalidTechnicalOrderDisplayLabel(raw: string, catalogItemType: string): boolean {
  const s = raw.trim();
  if (!s) return true;
  if (TECHNICAL_DISPLAY_TOKENS.has(s)) return true;
  if (s === String(catalogItemType ?? "").trim()) return true;
  if (/^[A-Z]+(_[A-Z]+)+$/.test(s)) return true;
  return false;
}

function isOrderDisplayLabelUnavailable(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    label === "Medication (label unavailable)" ||
    label === "Médicament (libellé indisponible)" ||
    lower.includes("label unavailable") ||
    lower.includes("libellé indisponible") ||
    lower.includes("label not available")
  );
}

function acceptableManualOrderLine(it: OrderItemLabelInput): string {
  const manual = it.manualLabel?.trim();
  if (!manual) return "";
  const cat = String(it.catalogItemType ?? "");
  if (manual === cat.trim()) return "";
  if (isInvalidTechnicalOrderDisplayLabel(manual, cat)) return "";
  const manualSec = it.manualSecondaryText?.trim();
  const line = manualSec ? `${manual} — ${manualSec}` : manual;
  if (isInvalidTechnicalOrderDisplayLabel(line, cat)) return "";
  return line;
}

/**
 * Derive INN-style primary name from catalog code prefix (e.g. HYDROMORPHONE_2MG_ML_INJECTABLE → Hydromorphone).
 */
export function medicationInnFromCatalogCode(code: string | null | undefined): string | null {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return null;
  const segment = trimmed.split("_")[0]?.trim() ?? "";
  if (segment.length < 3 || !/^[A-Za-z][A-Za-z0-9]*$/.test(segment)) return null;
  if (isInvalidTechnicalOrderDisplayLabel(segment, "MEDICATION")) return null;
  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}

export type MedicationOrderIdentitySource =
  | "catalog_display_name"
  | "catalog_generic_name"
  | "product_legacy_catalog"
  | "medication_concept"
  | "catalog_code_inn"
  | "snapshot"
  | "manual"
  | "fallback";

export type MedicationOrderIdentityConfidence = "high" | "medium" | "low";

export type MedicationProductIdentityInput = {
  code?: string | null;
  strengthDisplay?: string | null;
  legacyCatalogMedication?: CatalogMedicationLabel | null;
  concept?: { genericName?: string | null; displayName?: string | null } | null;
};

export type ResolveMedicationOrderIdentityInput = {
  catalogMedication?: CatalogMedicationLabel | null;
  medicationProduct?: MedicationProductIdentityInput | null;
  orderLine?: (OrderItemLabelInput & { notes?: string | null }) | null;
  snapshotLabel?: string | null;
};

export type MedicationOrderIdentityResult = {
  medicationNameEn: string | null;
  medicationNameFr: string | null;
  strengthDisplay: string | null;
  displayLabelEn: string;
  displayLabelFr: string;
  source: MedicationOrderIdentitySource;
  confidence: MedicationOrderIdentityConfidence;
};

const FALLBACK_EN = "Medication (label unavailable)";
const FALLBACK_FR = "Médicament (libellé indisponible)";

const EXACT_VACCINE_DISPLAY_BY_CODE_PREFIX: Record<string, { en: string; fr: string }> = {
  TDAP: { en: "Tdap vaccine", fr: "Vaccin Tdap" },
  TD: { en: "Td vaccine", fr: "Vaccin Td" },
  DTAP: { en: "DTaP vaccine", fr: "Vaccin DTaP" },
};

function exactVaccineDisplayFromCode(code: string | null | undefined): { en: string; fr: string } | null {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) return null;
  // Tdap, Td, and DTaP are clinically distinct products. Preserve exact product identity
  // from the catalog code before considering generic/canonical display labels.
  if (normalized.startsWith("TDAP_")) return EXACT_VACCINE_DISPLAY_BY_CODE_PREFIX.TDAP;
  if (normalized.startsWith("DTAP_")) return EXACT_VACCINE_DISPLAY_BY_CODE_PREFIX.DTAP;
  if (normalized.startsWith("TD_")) return EXACT_VACCINE_DISPLAY_BY_CODE_PREFIX.TD;
  return null;
}

/** Normalize strength tokens for equality checks (M1.7A.6). */
export function normalizeMedicationStrengthToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Collect strength candidates from order line, catalog, and product. */
export function medicationOrderStrengthCandidates(
  input: ResolveMedicationOrderIdentityInput
): string[] {
  const out = new Set<string>();
  const push = (v: string | null | undefined) => {
    const t = (v ?? "").trim();
    if (t) out.add(t);
  };
  push(input.orderLine?.strength);
  push(input.catalogMedication?.strength);
  push(input.medicationProduct?.strengthDisplay);
  push(input.medicationProduct?.legacyCatalogMedication?.strength);
  return [...out];
}

/**
 * True when `label` is only a strength/concentration string (never a valid medication title alone).
 */
export function isStrengthOnlyMedicationLabel(
  label: string | null | undefined,
  strengthCandidates: (string | null | undefined)[] = []
): boolean {
  const t = (label ?? "").trim();
  if (!t) return false;

  const norm = normalizeMedicationStrengthToken(t);
  for (const s of strengthCandidates) {
    const sn = normalizeMedicationStrengthToken(s ?? "");
    if (sn && norm === sn) return true;
  }

  /** Pure numeric concentration without a drug name (e.g. `2 mg/mL`, `5 mg`, `10%`). */
  if (
    /^[\d.]+\s*([µμ]?g|mg|mcg|kg|mL|ml|l|L|%|unit|units?)(\s*\/\s*[\d.]+\s*(mL|ml|l|L))?$/i.test(t)
  ) {
    return true;
  }

  return false;
}

/**
 * Incomplete medication display: unavailable sentinel, strength-only, or technical token.
 */
export function isIncompleteMedicationOrderDisplayLabel(
  label: string | null | undefined,
  options?: {
    strengthCandidates?: (string | null | undefined)[];
    catalogItemType?: string;
  }
): boolean {
  const t = (label ?? "").trim();
  if (!t) return true;
  const cat = options?.catalogItemType ?? "MEDICATION";
  if (isOrderDisplayLabelUnavailable(t)) return true;
  if (isInvalidTechnicalOrderDisplayLabel(t, cat)) return true;
  if (isStrengthOnlyMedicationLabel(t, options?.strengthCandidates ?? [])) return true;
  return false;
}

function acceptableMedicationName(
  candidate: string | null | undefined,
  strengthCandidates: string[]
): string | null {
  const t = (candidate ?? "").trim();
  if (!t) return null;
  if (isInvalidTechnicalOrderDisplayLabel(t, "MEDICATION")) return null;
  if (isStrengthOnlyMedicationLabel(t, strengthCandidates)) return null;
  return t;
}

function firstAcceptableMedicationName(
  strengthCandidates: string[],
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const c of candidates) {
    const name = acceptableMedicationName(c, strengthCandidates);
    if (name) return name;
  }
  return null;
}

function extractNameFromFullLabel(
  fullLabel: string,
  strengthCandidates: string[]
): string | null {
  const t = fullLabel.trim();
  if (!t || isIncompleteMedicationOrderDisplayLabel(t, { strengthCandidates })) return null;
  let remainder = t;
  for (const s of strengthCandidates) {
    const sn = (s ?? "").trim();
    if (!sn) continue;
    if (remainder.endsWith(sn)) {
      remainder = remainder.slice(0, -sn.length).trim();
    } else if (remainder.toLowerCase().endsWith(sn.toLowerCase())) {
      remainder = remainder.slice(0, -sn.length).trim();
    }
  }
  return acceptableMedicationName(remainder, strengthCandidates);
}

function resolveStrengthDisplay(input: ResolveMedicationOrderIdentityInput): string | null {
  const line = input.orderLine;
  const cat = input.catalogMedication;
  const prod = input.medicationProduct;
  const legacy = prod?.legacyCatalogMedication;
  return (
    line?.strength?.trim() ||
    cat?.strength?.trim() ||
    legacy?.strength?.trim() ||
    prod?.strengthDisplay?.trim() ||
    null
  );
}

function buildDisplayLabel(name: string | null, strength: string | null, lang: "en" | "fr"): string {
  if (name && strength) return `${name} ${strength}`;
  if (name) return name;
  return lang === "fr" ? FALLBACK_FR : FALLBACK_EN;
}

type NamePick = { nameEn: string | null; nameFr: string | null; source: MedicationOrderIdentitySource; confidence: MedicationOrderIdentityConfidence };

function resolveMedicationNames(input: ResolveMedicationOrderIdentityInput): NamePick {
  const strengthCandidates = medicationOrderStrengthCandidates(input);
  const cat = input.catalogMedication;
  const prod = input.medicationProduct;
  const legacy = prod?.legacyCatalogMedication;
  const concept = prod?.concept;
  const exactVaccine =
    exactVaccineDisplayFromCode(cat?.code) ??
    exactVaccineDisplayFromCode(legacy?.code) ??
    exactVaccineDisplayFromCode(prod?.code);
  if (exactVaccine) {
    return {
      nameEn: exactVaccine.en,
      nameFr: exactVaccine.fr,
      source: "catalog_code_inn",
      confidence: "high",
    };
  }
  const manual = acceptableManualOrderLine(
    input.orderLine ?? { catalogItemType: "MEDICATION", manualLabel: null, manualSecondaryText: null }
  );

  const nameEn =
    firstAcceptableMedicationName(
      strengthCandidates,
      cat?.displayNameEn,
      cat?.genericName,
      legacy?.displayNameEn,
      legacy?.genericName,
      concept?.genericName,
      concept?.displayName,
      manual || null,
      medicationInnFromCatalogCode(cat?.code),
      medicationInnFromCatalogCode(legacy?.code),
      medicationInnFromCatalogCode(prod?.code),
      extractNameFromFullLabel(input.snapshotLabel ?? "", strengthCandidates)
    ) ?? null;

  const nameFr =
    firstAcceptableMedicationName(
      strengthCandidates,
      cat?.displayNameFr,
      legacy?.displayNameFr,
      cat?.genericName,
      legacy?.genericName,
      concept?.genericName,
      manual || null,
      medicationInnFromCatalogCode(cat?.code),
      medicationInnFromCatalogCode(legacy?.code),
      medicationInnFromCatalogCode(prod?.code)
    ) ?? null;

  let source: MedicationOrderIdentitySource = "fallback";
  let confidence: MedicationOrderIdentityConfidence = "low";

  if (nameEn || nameFr) {
    if (
      acceptableMedicationName(cat?.displayNameEn, strengthCandidates) ||
      acceptableMedicationName(cat?.displayNameFr, strengthCandidates)
    ) {
      source = "catalog_display_name";
      confidence = "high";
    } else if (
      acceptableMedicationName(cat?.genericName, strengthCandidates) ||
      acceptableMedicationName(legacy?.genericName, strengthCandidates)
    ) {
      source = "catalog_generic_name";
      confidence = "high";
    } else if (
      legacy &&
      (acceptableMedicationName(legacy.displayNameEn, strengthCandidates) ||
        acceptableMedicationName(legacy.displayNameFr, strengthCandidates) ||
        acceptableMedicationName(legacy.genericName, strengthCandidates))
    ) {
      source = "product_legacy_catalog";
      confidence = "high";
    } else if (
      concept &&
      (acceptableMedicationName(concept.genericName, strengthCandidates) ||
        acceptableMedicationName(concept.displayName, strengthCandidates))
    ) {
      source = "medication_concept";
      confidence = "medium";
    } else if (
      medicationInnFromCatalogCode(cat?.code) ||
      medicationInnFromCatalogCode(legacy?.code) ||
      medicationInnFromCatalogCode(prod?.code)
    ) {
      source = "catalog_code_inn";
      confidence = "medium";
    } else if (extractNameFromFullLabel(input.snapshotLabel ?? "", strengthCandidates)) {
      source = "snapshot";
      confidence = "medium";
    } else if (acceptableMedicationName(manual, strengthCandidates)) {
      source = "manual";
      confidence = "medium";
    }
  }

  return {
    nameEn,
    nameFr,
    source,
    confidence: nameEn || nameFr ? confidence : "low",
  };
}

/**
 * Permanent medication order identity contract (M1.7A.6).
 * Strength alone is never a valid display label.
 */
export function resolveMedicationOrderIdentity(
  input: ResolveMedicationOrderIdentityInput
): MedicationOrderIdentityResult {
  const strengthDisplay = resolveStrengthDisplay(input);
  const { nameEn, nameFr, source, confidence } = resolveMedicationNames(input);

  const displayLabelEn = nameEn ? buildDisplayLabel(nameEn, strengthDisplay, "en") : FALLBACK_EN;
  const displayLabelFr = nameFr ? buildDisplayLabel(nameFr, strengthDisplay, "fr") : FALLBACK_FR;
  const hasIdentity = Boolean(nameEn || nameFr);

  return {
    medicationNameEn: nameEn,
    medicationNameFr: nameFr,
    strengthDisplay,
    displayLabelEn,
    displayLabelFr,
    source: hasIdentity ? source : "fallback",
    confidence: hasIdentity ? confidence : "low",
  };
}
