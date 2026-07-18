/**
 * Medication Orderable Catalog Completion — Universal Provider Ordering.
 * Not Medication Intelligence Phase 19. Not a Knowledge Expansion wave.
 * Goal: existing catalog medications are searchable and orderable for providers.
 */

export const MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID =
  "MEDUI.MEDICATION_ORDERABLE_CATALOG_COMPLETION";

export const MEDICATION_ORDERABLE_CATALOG_COMPLETION_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_ORDERABLE_CATALOG_COMPLETION_UNIVERSAL_PROVIDER_ORDERING";

export const MEDICATION_ORDERABLE_CATALOG_COMPLETION_PROGRAM_KEY =
  "MEDICATION_ORDERABLE_CATALOG_COMPLETION_V1";

export const MEDICATION_ORDERABLE_CATALOG_COMPLETION_VERSION =
  "orderable-catalog-completion-1.0.0";

export const MEDICATION_ORDERABLE_CATALOG_COMPLETION_DECISIONS = [
  "MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFIED",
  "MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS",
  "MEDICATION_ORDERABLE_CATALOG_COMPLETION_NOT_CERTIFIED",
] as const;

export type MedicationOrderableCatalogCompletionDecision =
  (typeof MEDICATION_ORDERABLE_CATALOG_COMPLETION_DECISIONS)[number];

export const MEDICATION_ORDERABLE_CATALOG_COMPLETION_DEFAULTS = {
  fabricateRxNorm: false,
  fabricateNdc: false,
  fabricateStrength: false,
  fabricateRoute: false,
  activateDualLayerProducts: false,
  enableProductionCds: false,
  enableEnterpriseActive: false,
  mutateOrders: false,
  mutateMar: false,
  mutateChart: false,
  redesignFormulary: false,
} as const;

export function assertMedicationOrderableCatalogCompletionSafetyDefaults(): void {
  const d = MEDICATION_ORDERABLE_CATALOG_COMPLETION_DEFAULTS;
  if (
    d.fabricateRxNorm ||
    d.fabricateNdc ||
    d.fabricateStrength ||
    d.fabricateRoute ||
    d.activateDualLayerProducts ||
    d.enableProductionCds ||
    d.enableEnterpriseActive ||
    d.mutateOrders ||
    d.mutateMar ||
    d.mutateChart ||
    d.redesignFormulary
  ) {
    throw new Error("Orderable catalog completion safety defaults violated.");
  }
}

/** Common clinical search terms providers type (brand + generic + abbreviations). */
export const MEDICATION_ORDERABLE_COMMON_CLINICAL_QUERIES: readonly string[] = [
  "Jardiance",
  "Farxiga",
  "Invokana",
  "Ozempic",
  "Wegovy",
  "Mounjaro",
  "Zepbound",
  "Trulicity",
  "Rybelsus",
  "Eliquis",
  "Xarelto",
  "Pradaxa",
  "Warfarin",
  "Lovenox",
  "Heparin",
  "Entresto",
  "Coreg",
  "Metoprolol",
  "Carvedilol",
  "Losartan",
  "Valsartan",
  "Lisinopril",
  "Amlodipine",
  "Hydralazine",
  "Clonidine",
  "Furosemide",
  "Torsemide",
  "Bumetanide",
  "Insulin glargine",
  "Insulin lispro",
  "Humalog",
  "Novolog",
  "Lantus",
  "Levemir",
  "Tresiba",
  "Tylenol",
  "Acetaminophen",
  "Ibuprofen",
  "Ketorolac",
  "Morphine",
  "Hydromorphone",
  "Fentanyl",
  "Oxycodone",
  "Ceftriaxone",
  "Vancomycin",
  "Piperacillin/Tazobactam",
  "Azithromycin",
  "Levofloxacin",
  "Amoxicillin",
  "Doxycycline",
  "Ondansetron",
  "Promethazine",
  "Metoclopramide",
  "Pantoprazole",
  "Omeprazole",
  "Famotidine",
  "Albuterol",
  "Duoneb",
  "Normal Saline",
  "Lactated Ringer",
  "D5W",
  "Magnesium Sulfate",
  "Potassium Chloride",
  "Calcium Gluconate",
] as const;

export type OrderabilityBlocker =
  | "INACTIVE"
  | "MISSING_GENERIC"
  | "MISSING_STRENGTH"
  | "MISSING_FORM"
  | "MISSING_ROUTE"
  | "TEST_OR_NONCLINICAL"
  | "BLOCKED_OR_RETIRED_PRODUCT"
  | "NONE";

export function isTestOrNonclinicalCatalog(input: {
  code: string;
  name: string | null | undefined;
  genericName: string | null | undefined;
}): boolean {
  const code = (input.code || "").toUpperCase();
  const name = (input.name || "").trim();
  const generic = (input.genericName || "").trim();
  if (!generic && /^GENERIC[_-]/i.test(code)) return true;
  if (/ROUTE[_-].*TEST|TEST MED|Generic Medication/i.test(name)) return true;
  if (/^19G1-/i.test(code)) return true;
  if (/_MST_/i.test(code) && !generic) return true;
  return false;
}

export function classifyCatalogOrderability(input: {
  code: string;
  name: string | null | undefined;
  genericName: string | null | undefined;
  strength: string | null | undefined;
  dosageForm: string | null | undefined;
  route: string | null | undefined;
  isActive: boolean;
  linkedProductGovernanceStatus?: string | null;
}): {
  orderable: boolean;
  searchableEligible: boolean;
  blocker: OrderabilityBlocker;
} {
  if (isTestOrNonclinicalCatalog(input)) {
    return {
      orderable: false,
      searchableEligible: false,
      blocker: "TEST_OR_NONCLINICAL",
    };
  }
  if (!input.isActive) {
    return { orderable: false, searchableEligible: false, blocker: "INACTIVE" };
  }
  const gov = (input.linkedProductGovernanceStatus || "").toUpperCase();
  if (gov === "BLOCKED" || gov === "RETIRED") {
    return {
      orderable: false,
      searchableEligible: false,
      blocker: "BLOCKED_OR_RETIRED_PRODUCT",
    };
  }
  if (!(input.genericName || "").trim()) {
    return {
      orderable: false,
      searchableEligible: true,
      blocker: "MISSING_GENERIC",
    };
  }
  if (!(input.strength || "").trim()) {
    return {
      orderable: false,
      searchableEligible: true,
      blocker: "MISSING_STRENGTH",
    };
  }
  if (!(input.dosageForm || "").trim()) {
    return {
      orderable: false,
      searchableEligible: true,
      blocker: "MISSING_FORM",
    };
  }
  if (!(input.route || "").trim()) {
    return {
      orderable: false,
      searchableEligible: true,
      blocker: "MISSING_ROUTE",
    };
  }
  return { orderable: true, searchableEligible: true, blocker: "NONE" };
}

/** Derive strength from existing display text only — never invent doses. */
export function deriveStrengthFromExistingText(
  ...texts: Array<string | null | undefined>
): string | null {
  for (const raw of texts) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    const conc = t.match(
      /(\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|units?|UI|mEq)\s*\/\s*(?:\d+(?:[.,]\d+)?\s*)?(?:mL|ml|L|h))/i
    );
    if (conc?.[1]) return conc[1].replace(",", ".").replace(/\s+/g, " ").trim();
    const m = t.match(
      /(\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|mL|ml|L|units?|UI|%|mEq))/i
    );
    if (m?.[1]) return m[1].replace(",", ".").replace(/\s+/g, " ").trim();
  }
  return null;
}

/** Derive dosage form from existing display text only. */
export function deriveDosageFormFromExistingText(
  ...texts: Array<string | null | undefined>
): string | null {
  const forms: Array<[RegExp, string]> = [
    [/\b(comprimé|comprimés|tablet|tablets|tab)\b/i, "comprimé"],
    [/\b(gélule|gelule|capsule|capsules|cap)\b/i, "gélule"],
    [/\b(injection|injectable|solution injectable)\b/i, "solution injectable"],
    [/\b(perfusion|infusion)\b/i, "perfusion"],
    [/\b(sirop|syrup)\b/i, "sirop"],
    [/\b(crème|cream)\b/i, "crème"],
    [/\b(pommade|ointment)\b/i, "pommade"],
    [/\b(collyre|ophthalmic|eye drop)/i, "collyre"],
    [/\b(inhalation|nebulizer|nébuliseur|aerosol|aérosol)\b/i, "inhalation"],
    [/\b(patch|transdermal)\b/i, "patch"],
    [/\b(suspension)\b/i, "suspension"],
    [/\b(solution)\b/i, "solution"],
  ];
  for (const raw of texts) {
    const t = String(raw ?? "");
    for (const [re, form] of forms) {
      if (re.test(t)) return form;
    }
  }
  return null;
}

export function decideMedicationOrderableCatalogCompletion(input: {
  schemaOk: boolean;
  regressionOk: boolean;
  coveragePercent: number;
  commonClinicalSearchPassRate: number;
  fabricatedData: boolean;
  dualLayerBulkActivated: boolean;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  cdsActivations: number;
  importIdempotent: boolean | null;
}): MedicationOrderableCatalogCompletionDecision {
  if (
    !input.schemaOk ||
    !input.regressionOk ||
    input.fabricatedData ||
    input.dualLayerBulkActivated ||
    input.orderMutations > 0 ||
    input.marMutations > 0 ||
    input.chartMutations > 0 ||
    input.cdsActivations > 0 ||
    input.importIdempotent === false
  ) {
    return "MEDICATION_ORDERABLE_CATALOG_COMPLETION_NOT_CERTIFIED";
  }
  if (input.coveragePercent < 95 || input.commonClinicalSearchPassRate < 0.95) {
    return "MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS";
  }
  if (input.coveragePercent < 99 || input.commonClinicalSearchPassRate < 0.99) {
    return "MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS";
  }
  return "MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFIED";
}
