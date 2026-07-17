/**
 * Phase 6.5 — controlled EM pilot duplicate prevention + identity keys.
 * Deterministic normalization; never auto-merges probable/possible duplicates.
 */
import { normalizeMedicationIdentityToken } from "./medicationCanonicalNormalization.js";
import { normalizeUnitTokens } from "./medicationRxNormNormalization.js";

export const MEDICATION_DUPLICATE_CLASSIFICATION_VALUES = [
  "EXACT_DUPLICATE",
  "NORMALIZED_DUPLICATE",
  "PROBABLE_DUPLICATE",
  "POSSIBLE_DUPLICATE",
  "CLINICALLY_DISTINCT",
  "SOURCE_DUPLICATE",
  "PACKAGE_DUPLICATE",
  "MAPPING_DUPLICATE",
  "SYNONYM_DUPLICATE",
  "NO_DUPLICATE",
] as const;

export type MedicationDuplicateClassification =
  (typeof MEDICATION_DUPLICATE_CLASSIFICATION_VALUES)[number];

export const MEDICATION_DUPLICATE_RESOLUTION_STATUS_VALUES = [
  "OPEN",
  "CONFIRMED_DUPLICATE",
  "CONFIRMED_DISTINCT",
  "MERGED",
  "LINKED_TO_EXISTING",
  "NEW_RECORD_APPROVED",
  "REJECTED",
  "DEFERRED",
] as const;

export type MedicationDuplicateResolutionStatus =
  (typeof MEDICATION_DUPLICATE_RESOLUTION_STATUS_VALUES)[number];

export const MEDICATION_PILOT_REUSE_DECISION_VALUES = [
  "REUSE_EXISTING_CONCEPT",
  "REUSE_EXISTING_PRODUCT",
  "REUSE_EXISTING_PACKAGE",
  "CREATE_NEW_CONCEPT",
  "CREATE_NEW_PRODUCT",
  "CREATE_NEW_PACKAGE",
  "BLOCK_FOR_REVIEW",
] as const;

export type MedicationPilotReuseDecision =
  (typeof MEDICATION_PILOT_REUSE_DECISION_VALUES)[number];

export const MEDICATION_PILOT_LIFECYCLE_STATUS_VALUES = [
  "DRAFT",
  "PILOT_STAGED",
  "IDENTITY_REVIEWED",
  "RXNORM_VERIFIED",
  "CATALOG_REVIEW_REQUIRED",
  "CATALOG_APPROVED",
  "CLINICALLY_INACTIVE",
] as const;

export type MedicationPilotLifecycleStatus =
  (typeof MEDICATION_PILOT_LIFECYCLE_STATUS_VALUES)[number];

export const MEDICATION_EM_CATEGORY_VALUES = [
  "ANALGESIA",
  "SEDATION",
  "ANTIBIOTIC",
  "CARDIAC",
  "RESUSCITATION",
  "RESPIRATORY",
  "ALLERGY",
  "NEUROLOGIC",
  "ENDOCRINE",
  "ELECTROLYTE",
  "TOXICOLOGY",
  "THROMBOLYTIC",
  "GI",
  "PROCEDURAL",
  "FLUID",
  "OTHER",
] as const;

export type MedicationEmCategory = (typeof MEDICATION_EM_CATEGORY_VALUES)[number];

export const MEDICATION_PILOT_REVIEW_ACTION_VALUES = [
  "LINK_TO_EXISTING",
  "APPROVE_NEW_RECORD",
  "CONFIRM_DISTINCT",
  "REJECT_DUPLICATE",
  "DEFER",
  "REQUEST_CLARIFICATION",
] as const;

export type MedicationPilotReviewAction =
  (typeof MEDICATION_PILOT_REVIEW_ACTION_VALUES)[number];

/** Pilot governance: clinical activation and auto-verify remain forbidden. */
export function assertPilotClinicalActivationDisabled(clinicalActivationAllowed: boolean): void {
  if (clinicalActivationAllowed) {
    throw new Error("Phase 6.5 forbids clinicalActivationAllowed=true.");
  }
}

export function assertNoAutomaticDuplicateMerge(
  classification: MedicationDuplicateClassification
): void {
  if (
    classification === "PROBABLE_DUPLICATE" ||
    classification === "POSSIBLE_DUPLICATE"
  ) {
    throw new Error(
      `Automatic merge forbidden for ${classification}; requiresHumanReview must remain true.`
    );
  }
}

export function assertNoBulkRealMappingApproval(action: string): void {
  const normalized = action.trim().toUpperCase();
  if (normalized === "BULK_APPROVE" || normalized === "BULK_VERIFY" || normalized === "BULK_MAPPING_APPROVE") {
    throw new Error("Bulk approval of real RxNorm mappings is forbidden in Phase 6.5.");
  }
}

export type PilotMedicationIdentityInput = {
  genericName: string;
  brandName?: string | null;
  saltOrEster?: string | null;
  strengthDisplay?: string | null;
  concentrationText?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  releaseType?: string | null;
  packageQuantity?: string | null;
  packageUnit?: string | null;
  containerType?: string | null;
  singleOrMultiDose?: string | null;
  ndc?: string | null;
  rxcui?: string | null;
};

const UNIT_EQUIVALENCE: Record<string, { unit: string; factor: number }> = {
  g: { unit: "mg", factor: 1000 },
  mg: { unit: "mg", factor: 1 },
  mcg: { unit: "mg", factor: 0.001 },
  ug: { unit: "mg", factor: 0.001 },
  ml: { unit: "ml", factor: 1 },
  l: { unit: "ml", factor: 1000 },
};

export function normalizePilotText(value: string | null | undefined): string {
  const nfkc = (value ?? "").normalize("NFKC");
  return normalizeUnitTokens(nfkc).replace(/\s+/g, " ").trim().toLowerCase();
}

export function normalizePilotIngredientSet(ingredients: string[]): string {
  return ingredients
    .map((part) => normalizeMedicationIdentityToken(part))
    .filter(Boolean)
    .sort()
    .join("+");
}

/**
 * Normalize strength for comparison. Converts g↔mg when unambiguous single quantity.
 * Does not equate concentration (mg/mL) with total dose (mg).
 */
export function normalizePilotStrength(value: string | null | undefined): string {
  const raw = normalizePilotText(value);
  if (!raw) return "";

  // Concentration pattern: keep as concentration key (do not collapse to total dose).
  const concentration = raw.match(
    /^(\d+(?:\.\d+)?)\s*(mg|mcg|ug|g|ml|l)\s*(?:\/|per)\s*(\d+(?:\.\d+)?)?\s*(ml|l|mg)?$/i
  );
  if (concentration) {
    const num = Number(concentration[1]);
    const numUnit = concentration[2].toLowerCase();
    const den = concentration[3] ? Number(concentration[3]) : 1;
    const denUnit = (concentration[4] ?? "ml").toLowerCase();
    const n = UNIT_EQUIVALENCE[numUnit] ?? { unit: numUnit, factor: 1 };
    const d = UNIT_EQUIVALENCE[denUnit] ?? { unit: denUnit, factor: 1 };
    return `conc:${num * n.factor}${n.unit}/${den * d.factor}${d.unit}`;
  }

  const simple = raw.match(/^(\d+(?:\.\d+)?)\s*(mg|mcg|ug|g)$/i);
  if (simple) {
    const amount = Number(simple[1]);
    const unit = simple[2].toLowerCase();
    const n = UNIT_EQUIVALENCE[unit] ?? { unit, factor: 1 };
    return `qty:${amount * n.factor}${n.unit}`;
  }

  return normalizeMedicationIdentityToken(raw);
}

export function normalizePilotRoute(value: string | null | undefined): string {
  const route = normalizeMedicationIdentityToken(value);
  if (!route) return "";
  if (route === "po" || route.includes("oral")) return "oral";
  if (route === "iv" || route.includes("intravenous") || route.includes("iv_push") || route.includes("iv_infusion")) {
    return "intravenous";
  }
  if (route === "im" || route.includes("intramuscular")) return "intramuscular";
  if (route.includes("subcut") || route === "sq" || route === "sc") return "subcutaneous";
  if (route.includes("inhal") || route.includes("nebul")) return "inhalation";
  if (route.includes("topical") || route.includes("cutaneous")) return "topical";
  if (route.includes("intranasal") || route === "in") return "intranasal";
  return route;
}

export function normalizePilotDosageForm(value: string | null | undefined): string {
  const form = normalizeMedicationIdentityToken(value);
  if (!form) return "";
  if (form.includes("tablet") || form.includes("tab") || form.includes("comprim")) return "tablet";
  if (form.includes("capsule") || form.includes("gelule")) return "capsule";
  if (form.includes("injection") || form.includes("injectable") || form.includes("solution_for_injection")) {
    return "injection";
  }
  if (form.includes("infusion") || form.includes("iv_solution")) return "infusion";
  if (form.includes("suspension")) return "suspension";
  if (form.includes("syrup") || form.includes("oral_solution")) return "oral_liquid";
  if (form.includes("nebul") || form.includes("inhal")) return "inhalation";
  if (form.includes("autoinjector") || form.includes("auto_injector")) return "autoinjector";
  if (form.includes("cream") || form.includes("ointment") || form.includes("gel")) return "topical";
  return form;
}

export function buildConceptIdentityKey(input: PilotMedicationIdentityInput): string {
  const ingredients = normalizePilotIngredientSet(
    (input.genericName ?? "")
      .split(/[+\/]/)
      .map((part) => part.trim())
      .filter(Boolean)
  );
  const salt = normalizeMedicationIdentityToken(input.saltOrEster);
  return ["concept", ingredients, salt || "base"].join("|");
}

export function buildProductIdentityKey(input: PilotMedicationIdentityInput): string {
  return [
    "product",
    buildConceptIdentityKey(input),
    normalizePilotStrength(input.strengthDisplay),
    normalizePilotStrength(input.concentrationText),
    normalizePilotDosageForm(input.dosageForm),
    normalizeMedicationIdentityToken(input.releaseType) || "ir",
    normalizePilotRoute(input.route),
    normalizeMedicationIdentityToken(input.brandName) || "generic",
  ].join("|");
}

export function buildPackageIdentityKey(input: PilotMedicationIdentityInput): string {
  return [
    "package",
    buildProductIdentityKey(input),
    normalizeMedicationIdentityToken(input.ndc) || "no_ndc",
    normalizeMedicationIdentityToken(input.packageQuantity),
    normalizeMedicationIdentityToken(input.packageUnit),
    normalizeMedicationIdentityToken(input.containerType) || "unspecified",
    normalizeMedicationIdentityToken(input.singleOrMultiDose) || "unspecified",
  ].join("|");
}

export type DuplicateAssessmentInput = {
  source: PilotMedicationIdentityInput & { itemCode: string };
  matched?: (PilotMedicationIdentityInput & { entityId: string; entityType: string }) | null;
  sameSourceRow?: boolean;
  synonymCollision?: boolean;
  mappingCollision?: boolean;
};

export type DuplicateAssessmentResult = {
  duplicateClassification: MedicationDuplicateClassification;
  confidenceScore: number;
  matchedEntityId: string | null;
  matchedEntityType: string | null;
  identityKeyMatch: boolean;
  RxCuiMatch: boolean;
  NdcMatch: boolean;
  ingredientMatch: boolean;
  strengthMatch: boolean;
  formMatch: boolean;
  routeMatch: boolean;
  packageMatch: boolean;
  evidence: Record<string, unknown>;
  recommendedAction: MedicationPilotReuseDecision;
  requiresHumanReview: boolean;
};

export function assessMedicationDuplicate(input: DuplicateAssessmentInput): DuplicateAssessmentResult {
  const sourceProductKey = buildProductIdentityKey(input.source);
  const sourceConceptKey = buildConceptIdentityKey(input.source);
  const sourcePackageKey = buildPackageIdentityKey(input.source);

  if (input.sameSourceRow) {
    return {
      duplicateClassification: "SOURCE_DUPLICATE",
      confidenceScore: 1,
      matchedEntityId: input.matched?.entityId ?? null,
      matchedEntityType: input.matched?.entityType ?? "SOURCE_ROW",
      identityKeyMatch: true,
      RxCuiMatch: false,
      NdcMatch: false,
      ingredientMatch: true,
      strengthMatch: true,
      formMatch: true,
      routeMatch: true,
      packageMatch: true,
      evidence: { reason: "Identical source row within pilot manifest" },
      recommendedAction: "BLOCK_FOR_REVIEW",
      requiresHumanReview: true,
    };
  }

  if (input.synonymCollision) {
    return {
      duplicateClassification: "SYNONYM_DUPLICATE",
      confidenceScore: 0.9,
      matchedEntityId: input.matched?.entityId ?? null,
      matchedEntityType: input.matched?.entityType ?? "SYNONYM",
      identityKeyMatch: false,
      RxCuiMatch: false,
      NdcMatch: false,
      ingredientMatch: true,
      strengthMatch: false,
      formMatch: false,
      routeMatch: false,
      packageMatch: false,
      evidence: { reason: "Language-aware synonym collision after normalization" },
      recommendedAction: "BLOCK_FOR_REVIEW",
      requiresHumanReview: true,
    };
  }

  if (input.mappingCollision) {
    return {
      duplicateClassification: "MAPPING_DUPLICATE",
      confidenceScore: 1,
      matchedEntityId: input.matched?.entityId ?? null,
      matchedEntityType: input.matched?.entityType ?? "VERIFIED_MAPPING",
      identityKeyMatch: false,
      RxCuiMatch: true,
      NdcMatch: false,
      ingredientMatch: false,
      strengthMatch: false,
      formMatch: false,
      routeMatch: false,
      packageMatch: false,
      evidence: { reason: "Active verified mapping collision" },
      recommendedAction: "BLOCK_FOR_REVIEW",
      requiresHumanReview: true,
    };
  }

  if (!input.matched) {
    return {
      duplicateClassification: "NO_DUPLICATE",
      confidenceScore: 1,
      matchedEntityId: null,
      matchedEntityType: null,
      identityKeyMatch: false,
      RxCuiMatch: false,
      NdcMatch: false,
      ingredientMatch: false,
      strengthMatch: false,
      formMatch: false,
      routeMatch: false,
      packageMatch: false,
      evidence: { sourceProductKey, sourceConceptKey, sourcePackageKey },
      recommendedAction: "CREATE_NEW_CONCEPT",
      requiresHumanReview: true,
    };
  }

  const matched = input.matched;
  const matchedProductKey = buildProductIdentityKey(matched);
  const matchedConceptKey = buildConceptIdentityKey(matched);
  const matchedPackageKey = buildPackageIdentityKey(matched);

  const ingredientMatch = sourceConceptKey === matchedConceptKey;
  const strengthMatch =
    normalizePilotStrength(input.source.strengthDisplay) ===
      normalizePilotStrength(matched.strengthDisplay) &&
    normalizePilotStrength(input.source.concentrationText) ===
      normalizePilotStrength(matched.concentrationText);
  const formMatch =
    normalizePilotDosageForm(input.source.dosageForm) === normalizePilotDosageForm(matched.dosageForm);
  const routeMatch =
    normalizePilotRoute(input.source.route) === normalizePilotRoute(matched.route);
  const packageMatch = sourcePackageKey === matchedPackageKey;
  const identityKeyMatch = sourceProductKey === matchedProductKey;
  const RxCuiMatch = Boolean(
    input.source.rxcui &&
      matched.rxcui &&
      input.source.rxcui.trim() === matched.rxcui.trim()
  );
  const NdcMatch = Boolean(
    input.source.ndc && matched.ndc && input.source.ndc.trim() === matched.ndc.trim()
  );

  if (packageMatch && NdcMatch) {
    return {
      duplicateClassification: "PACKAGE_DUPLICATE",
      confidenceScore: 1,
      matchedEntityId: matched.entityId,
      matchedEntityType: matched.entityType,
      identityKeyMatch,
      RxCuiMatch,
      NdcMatch,
      ingredientMatch,
      strengthMatch,
      formMatch,
      routeMatch,
      packageMatch,
      evidence: { sourcePackageKey, matchedPackageKey },
      recommendedAction: "REUSE_EXISTING_PACKAGE",
      requiresHumanReview: true,
    };
  }

  if (identityKeyMatch) {
    return {
      duplicateClassification: "EXACT_DUPLICATE",
      confidenceScore: 1,
      matchedEntityId: matched.entityId,
      matchedEntityType: matched.entityType,
      identityKeyMatch,
      RxCuiMatch,
      NdcMatch,
      ingredientMatch,
      strengthMatch,
      formMatch,
      routeMatch,
      packageMatch,
      evidence: { sourceProductKey, matchedProductKey },
      recommendedAction: "REUSE_EXISTING_PRODUCT",
      requiresHumanReview: true,
    };
  }

  if (ingredientMatch && strengthMatch && formMatch && routeMatch) {
    return {
      duplicateClassification: "NORMALIZED_DUPLICATE",
      confidenceScore: 0.95,
      matchedEntityId: matched.entityId,
      matchedEntityType: matched.entityType,
      identityKeyMatch: false,
      RxCuiMatch,
      NdcMatch,
      ingredientMatch,
      strengthMatch,
      formMatch,
      routeMatch,
      packageMatch,
      evidence: { sourceProductKey, matchedProductKey, note: "Normalized fields match" },
      recommendedAction: "REUSE_EXISTING_PRODUCT",
      requiresHumanReview: true,
    };
  }

  if (ingredientMatch && (strengthMatch || formMatch)) {
    return {
      duplicateClassification: "PROBABLE_DUPLICATE",
      confidenceScore: 0.75,
      matchedEntityId: matched.entityId,
      matchedEntityType: matched.entityType,
      identityKeyMatch: false,
      RxCuiMatch,
      NdcMatch,
      ingredientMatch,
      strengthMatch,
      formMatch,
      routeMatch,
      packageMatch,
      evidence: { sourceProductKey, matchedProductKey },
      recommendedAction: "BLOCK_FOR_REVIEW",
      requiresHumanReview: true,
    };
  }

  if (ingredientMatch) {
    return {
      duplicateClassification: "POSSIBLE_DUPLICATE",
      confidenceScore: 0.55,
      matchedEntityId: matched.entityId,
      matchedEntityType: matched.entityType,
      identityKeyMatch: false,
      RxCuiMatch,
      NdcMatch,
      ingredientMatch,
      strengthMatch,
      formMatch,
      routeMatch,
      packageMatch,
      evidence: {
        sourceProductKey,
        matchedProductKey,
        note: "Same ingredient family; clinically distinct product likely",
      },
      recommendedAction: "BLOCK_FOR_REVIEW",
      requiresHumanReview: true,
    };
  }

  return {
    duplicateClassification: "CLINICALLY_DISTINCT",
    confidenceScore: 0.9,
    matchedEntityId: matched.entityId,
    matchedEntityType: matched.entityType,
    identityKeyMatch: false,
    RxCuiMatch,
    NdcMatch,
    ingredientMatch,
    strengthMatch,
    formMatch,
    routeMatch,
    packageMatch,
    evidence: { sourceConceptKey, matchedConceptKey },
    recommendedAction: "CREATE_NEW_CONCEPT",
    requiresHumanReview: true,
  };
}

export function canAutoCreateFromClassification(
  classification: MedicationDuplicateClassification
): boolean {
  return classification === "NO_DUPLICATE" || classification === "CLINICALLY_DISTINCT";
}

/**
 * Staging is blocked only for hard collisions that cannot safely reuse an existing entity.
 * EXACT_DUPLICATE / PACKAGE_DUPLICATE against an existing catalog row is a reuse path, not a block.
 */
export function unresolvedExactDuplicatesBlockStaging(
  classifications: MedicationDuplicateClassification[]
): boolean {
  return classifications.some(
    (c) => c === "MAPPING_DUPLICATE" || c === "SOURCE_DUPLICATE"
  );
}
