/**
 * Medication Knowledge Expansion Wave 2 — Emergency Medicine Catalog Expansion.
 * Content CREATE path (CatalogMedication-first). Not Medication Intelligence Phase 19.
 * Does not redesign engines, fabricate RxNorm/NDC, or activate recommendations/CDS.
 */

import { deriveMedicationCatalogCode } from "./medicationCatalogCodeDerive.js";
import { normalizeMedicationFamilyName } from "./medicationKnowledgePopulationGovernance.js";

export const MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID =
  "MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_EMERGENCY_MEDICINE_CATALOG";

export const MK_EXPANSION_WAVE2_CATALOG_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_EM_CATALOG_CREATE";

export const MK_EXPANSION_WAVE2_CATALOG_PROGRAM_KEY = "EM_KNOWLEDGE_EXPANSION_WAVE2_CATALOG_V1";

export const MK_EXPANSION_WAVE2_CATALOG_CONCEPT_PREFIX = "EM_W2C_";

export const MK_EXPANSION_WAVE2_CATALOG_DEFAULTS = {
  clinicalActivationOfRecommendations: false,
  enterpriseActiveAllowed: false,
  productionCdsEnabled: false,
  orderFromRecommendationEnabled: false,
  autoPlaceOrders: false,
  autoMutateMar: false,
  autoMutateChart: false,
  fabricateRxNorm: false,
  fabricateNdc: false,
  fabricateUnsupportedClinicalMetadata: false,
  duplicateMedicationMaster: false,
  targetNetNewConcepts: 750,
} as const;

export const MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_DECISION_VALUES = [
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED",
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED_WITH_REVIEW_ITEMS",
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED",
] as const;

export type MkExpansionWave2CatalogCertificationDecision =
  (typeof MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_DECISION_VALUES)[number];

export const MK_EXPANSION_WAVE2_CATALOG_OUTCOMES = [
  "NEW_CANONICAL_CONCEPT",
  "EXISTING_CONCEPT_NEW_VARIANT",
  "EXISTING_CONCEPT_NEW_SYNONYM",
  "EXISTING_CONCEPT_NEW_MAPPING",
  "DUPLICATE_REJECTED",
  "CONFLICT_REQUIRES_REVIEW",
  "SOURCE_INSUFFICIENT",
  "OUT_OF_SCOPE",
] as const;

export type MkExpansionWave2CatalogOutcome =
  (typeof MK_EXPANSION_WAVE2_CATALOG_OUTCOMES)[number];

export const MK_EXPANSION_WAVE2_CATALOG_MODES = [
  "AUDIT",
  "DRY_RUN",
  "APPLY",
  "VERIFY",
  "REPORT",
] as const;

export type MkExpansionWave2CatalogMode =
  (typeof MK_EXPANSION_WAVE2_CATALOG_MODES)[number];

export type MkExpansionWave2CatalogPackKey =
  | "CARDIOLOGY"
  | "AIRWAY_RSI"
  | "PULMONARY"
  | "INFECTIOUS_DISEASE"
  | "NEUROLOGY"
  | "TOXICOLOGY"
  | "ENDOCRINE"
  | "GASTROENTEROLOGY"
  | "ALLERGY"
  | "TRAUMA"
  | "OB"
  | "PEDIATRICS"
  | "PSYCHIATRY"
  | "RENAL_UROLOGY"
  | "OPHTHALMOLOGY"
  | "ENT_DENTAL"
  | "DERMATOLOGY"
  | "MUSCULOSKELETAL"
  | "HEMATOLOGY_ONCOLOGY";

export type MkExpansionWave2CatalogVariant = {
  strength: string;
  dosageForm: string;
  route: string;
  administrationType: string;
  billingClass: string;
};

export type MkExpansionWave2CatalogCandidate = {
  conceptKey: string;
  genericName: string;
  packKey: MkExpansionWave2CatalogPackKey | string;
  displayNameEn: string;
  displayNameFr: string;
  therapeuticClass: string;
  aliases: readonly string[];
  brands: readonly string[];
  variants: readonly MkExpansionWave2CatalogVariant[];
  flags?: {
    isControlled?: boolean;
    controlledSchedule?: string | null;
    isHighAlert?: boolean;
    isVasopressor?: boolean;
    isAntidote?: boolean;
    isInsulin?: boolean;
    isRsiParalytic?: boolean;
  };
  sourceNote?: string;
};

export function normalizeMkExpansionWave2ConceptKey(raw: string): string {
  return normalizeMedicationFamilyName(raw)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function mkExpansionWave2CatalogConceptCode(conceptKey: string): string {
  const slug = normalizeMkExpansionWave2ConceptKey(conceptKey)
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${MK_EXPANSION_WAVE2_CATALOG_CONCEPT_PREFIX}${slug || "UNKNOWN"}`.slice(0, 120);
}

export function mkExpansionWave2CatalogVariantCode(input: {
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
}): string {
  return deriveMedicationCatalogCode(input).slice(0, 120);
}

export function mkExpansionWave2CatalogPackMarker(packKey: string): string {
  return `EM_PACK:${packKey.trim().toUpperCase()}`;
}

export function buildMkExpansionWave2VariantSearchText(input: {
  genericName: string;
  displayNameEn: string;
  displayNameFr: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  packKey: string;
  aliases: readonly string[];
  brands: readonly string[];
}): string {
  const parts = [
    input.genericName,
    input.displayNameEn,
    input.displayNameFr,
    input.strength,
    input.dosageForm,
    input.route,
    input.therapeuticClass,
    mkExpansionWave2CatalogPackMarker(input.packKey),
    ...input.aliases,
    ...input.brands,
  ]
    .map((p) => String(p ?? "").toLowerCase().trim())
    .filter(Boolean);
  return [...new Set(parts)].join(" ").slice(0, 2000);
}

export function assertMkExpansionWave2CatalogSafetyDefaults(): void {
  const d = MK_EXPANSION_WAVE2_CATALOG_DEFAULTS;
  if (d.fabricateRxNorm || d.fabricateNdc || d.fabricateUnsupportedClinicalMetadata) {
    throw new Error("Wave 2 catalog forbids fabricating terminology or clinical metadata.");
  }
  if (d.duplicateMedicationMaster) {
    throw new Error("Wave 2 catalog forbids a second medication master.");
  }
  if (
    d.autoPlaceOrders ||
    d.autoMutateMar ||
    d.autoMutateChart ||
    d.orderFromRecommendationEnabled ||
    d.productionCdsEnabled ||
    d.enterpriseActiveAllowed ||
    d.clinicalActivationOfRecommendations
  ) {
    throw new Error("Wave 2 catalog forbids autonomous clinical activation.");
  }
}

export function classifyMkExpansionWave2Candidate(input: {
  conceptKey: string;
  variants: readonly MkExpansionWave2CatalogVariant[];
  existingNormalizedGenerics: ReadonlySet<string>;
  existingCatalogCodes: ReadonlySet<string>;
}): {
  outcome: MkExpansionWave2CatalogOutcome;
  netNewConcept: boolean;
  variantActions: Array<{
    catalogCode: string;
    action: "CREATE_VARIANT" | "SKIP_DUPLICATE_CODE" | "SOURCE_INSUFFICIENT";
  }>;
} {
  const key = normalizeMkExpansionWave2ConceptKey(input.conceptKey);
  if (!key || input.variants.length === 0) {
    return {
      outcome: "SOURCE_INSUFFICIENT",
      netNewConcept: false,
      variantActions: [],
    };
  }

  const genericExists = input.existingNormalizedGenerics.has(key);
  const variantActions: Array<{
    catalogCode: string;
    action: "CREATE_VARIANT" | "SKIP_DUPLICATE_CODE" | "SOURCE_INSUFFICIENT";
  }> = [];

  let creatable = 0;
  for (const v of input.variants) {
    if (!v.strength?.trim() || !v.dosageForm?.trim() || !v.route?.trim()) {
      variantActions.push({
        catalogCode: "",
        action: "SOURCE_INSUFFICIENT",
      });
      continue;
    }
    const catalogCode = mkExpansionWave2CatalogVariantCode({
      genericName: key,
      strength: v.strength,
      dosageForm: v.dosageForm,
      route: v.route,
    });
    if (input.existingCatalogCodes.has(catalogCode)) {
      variantActions.push({ catalogCode, action: "SKIP_DUPLICATE_CODE" });
    } else {
      variantActions.push({ catalogCode, action: "CREATE_VARIANT" });
      creatable += 1;
    }
  }

  if (creatable === 0) {
    return {
      outcome: genericExists ? "DUPLICATE_REJECTED" : "DUPLICATE_REJECTED",
      netNewConcept: false,
      variantActions,
    };
  }

  if (!genericExists) {
    return {
      outcome: "NEW_CANONICAL_CONCEPT",
      netNewConcept: true,
      variantActions,
    };
  }

  return {
    outcome: "EXISTING_CONCEPT_NEW_VARIANT",
    netNewConcept: false,
    variantActions,
  };
}
