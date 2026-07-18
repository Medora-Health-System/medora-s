/**
 * Phase 9 — medication safety knowledge foundation (storage/governance only).
 * No patient-specific evaluation, order blocking, or clinical alerts.
 */

export const MEDICATION_SAFETY_KNOWLEDGE_LIFECYCLE_VALUES = [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "SUPERSEDED",
  "RETIRED",
  "REJECTED",
] as const;

export type MedicationSafetyKnowledgeLifecycle =
  (typeof MEDICATION_SAFETY_KNOWLEDGE_LIFECYCLE_VALUES)[number];

export const MEDICATION_SAFETY_KNOWLEDGE_LIFECYCLE_TRANSITIONS: Record<
  MedicationSafetyKnowledgeLifecycle,
  readonly MedicationSafetyKnowledgeLifecycle[]
> = {
  DRAFT: ["UNDER_REVIEW", "RETIRED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "DRAFT", "RETIRED", "REJECTED"],
  APPROVED: ["SUPERSEDED", "RETIRED"],
  SUPERSEDED: ["RETIRED"],
  RETIRED: [],
  REJECTED: ["DRAFT", "RETIRED"],
};

export const MEDICATION_SAFETY_SOURCE_TYPE_VALUES = [
  "INTERNAL_CURATED",
  "FDA",
  "NLM",
  "RXNORM",
  "DAILYMED",
  "MANUFACTURER_LABEL",
  "PEER_REVIEWED_LITERATURE",
  "CLINICAL_GUIDELINE",
  "PHARMACY_REFERENCE",
  "OTHER",
] as const;

export type MedicationSafetySourceType =
  (typeof MEDICATION_SAFETY_SOURCE_TYPE_VALUES)[number];

export const MEDICATION_INTERACTION_SCOPE_VALUES = [
  "CONCEPT_TO_CONCEPT",
  "PRODUCT_TO_PRODUCT",
  "CONCEPT_TO_PRODUCT",
  "INGREDIENT_TO_INGREDIENT",
] as const;

export type MedicationInteractionScope =
  (typeof MEDICATION_INTERACTION_SCOPE_VALUES)[number];

export const MEDICATION_INTERACTION_TYPE_VALUES = [
  "PHARMACOKINETIC",
  "PHARMACODYNAMIC",
  "ABSORPTION",
  "METABOLISM_INDUCTION",
  "METABOLISM_INHIBITION",
  "ELIMINATION",
  "PROTEIN_BINDING",
  "QT_PROLONGATION",
  "CNS_DEPRESSION",
  "RESPIRATORY_DEPRESSION",
  "SEROTONERGIC",
  "BLEEDING_RISK",
  "HYPOTENSION",
  "HYPERKALEMIA",
  "NEPHROTOXICITY",
  "HEPATOTOXICITY",
  "SEIZURE_THRESHOLD",
  "GLUCOSE_EFFECT",
  "ELECTROLYTE_EFFECT",
  "THERAPEUTIC_ANTAGONISM",
  "THERAPEUTIC_DUPLICATION",
  "OTHER",
] as const;

export type MedicationInteractionType =
  (typeof MEDICATION_INTERACTION_TYPE_VALUES)[number];

export const MEDICATION_SAFETY_SEVERITY_VALUES = [
  "INFORMATIONAL",
  "MINOR",
  "MODERATE",
  "MAJOR",
  "SEVERE",
  "CONTRAINDICATED",
  "UNKNOWN",
] as const;

export type MedicationSafetySeverity =
  (typeof MEDICATION_SAFETY_SEVERITY_VALUES)[number];

export const MEDICATION_SAFETY_CLINICAL_SIGNIFICANCE_VALUES = [
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
  "UNKNOWN",
] as const;

export type MedicationSafetyClinicalSignificance =
  (typeof MEDICATION_SAFETY_CLINICAL_SIGNIFICANCE_VALUES)[number];

export const MEDICATION_SAFETY_EVIDENCE_LEVEL_VALUES = [
  "CONSENSUS_GUIDELINE",
  "REGULATORY_LABEL",
  "SYSTEMATIC_REVIEW",
  "RANDOMIZED_TRIAL",
  "OBSERVATIONAL_STUDY",
  "CASE_SERIES",
  "CASE_REPORT",
  "PHARMACOLOGIC_RATIONALE",
  "EXPERT_CONSENSUS",
  "INSUFFICIENT",
  "UNKNOWN",
] as const;

export type MedicationSafetyEvidenceLevel =
  (typeof MEDICATION_SAFETY_EVIDENCE_LEVEL_VALUES)[number];

export const MEDICATION_INTERACTION_ONSET_VALUES = [
  "IMMEDIATE",
  "RAPID",
  "DELAYED",
  "VARIABLE",
  "UNKNOWN",
] as const;

export type MedicationInteractionOnset =
  (typeof MEDICATION_INTERACTION_ONSET_VALUES)[number];

export const MEDICATION_CLASS_MEMBERSHIP_TYPE_VALUES = [
  "PRIMARY",
  "SECONDARY",
  "PHARMACOLOGIC",
  "THERAPEUTIC",
  "CHEMICAL",
  "SAFETY_GROUP",
  "DUPLICATE_THERAPY_GROUP",
] as const;

export type MedicationClassMembershipType =
  (typeof MEDICATION_CLASS_MEMBERSHIP_TYPE_VALUES)[number];

export const MEDICATION_ALLERGEN_TYPE_VALUES = [
  "MEDICATION_INGREDIENT",
  "MEDICATION_CLASS",
  "EXCIPIENT",
  "FOOD",
  "BIOLOGIC",
  "ENVIRONMENTAL",
  "OTHER",
] as const;

export type MedicationAllergenType = (typeof MEDICATION_ALLERGEN_TYPE_VALUES)[number];

export const MEDICATION_ALLERGEN_RELATIONSHIP_TYPE_VALUES = [
  "DIRECT_INGREDIENT",
  "SAME_ACTIVE_INGREDIENT",
  "SAME_THERAPEUTIC_CLASS",
  "STRUCTURAL_SIMILARITY",
  "KNOWN_CROSS_REACTIVITY",
  "POSSIBLE_CROSS_REACTIVITY",
  "EXCIPIENT_RELATED",
  "NO_EXPECTED_CROSS_REACTIVITY",
] as const;

export type MedicationAllergenRelationshipType =
  (typeof MEDICATION_ALLERGEN_RELATIONSHIP_TYPE_VALUES)[number];

export const MEDICATION_CROSS_REACTIVITY_RISK_VALUES = [
  "NONE_EXPECTED",
  "LOW",
  "POSSIBLE",
  "MODERATE",
  "HIGH",
  "CONTRAINDICATED",
  "UNKNOWN",
] as const;

export type MedicationCrossReactivityRisk =
  (typeof MEDICATION_CROSS_REACTIVITY_RISK_VALUES)[number];

export const MEDICATION_DUPLICATE_THERAPY_MEMBERSHIP_ROLE_VALUES = [
  "PRIMARY",
  "CONTRIBUTING",
  "COMBINATION_COMPONENT",
  "CONDITIONAL",
] as const;

export type MedicationDuplicateTherapyMembershipRole =
  (typeof MEDICATION_DUPLICATE_THERAPY_MEMBERSHIP_ROLE_VALUES)[number];

export const MEDICATION_SAFETY_DUPLICATE_CLASSIFICATION_VALUES = [
  "EXACT_DUPLICATE",
  "REVERSED_PAIR_DUPLICATE",
  "SOURCE_VERSION_DUPLICATE",
  "SEMANTIC_DUPLICATE",
  "DIRECTIONALLY_DISTINCT",
  "SEVERITY_CONFLICT",
  "EVIDENCE_CONFLICT",
  "MANAGEMENT_RECOMMENDATION_CONFLICT",
  "POSSIBLE_DUPLICATE",
  "NOT_DUPLICATE",
  "UNRESOLVED_IDENTITY",
] as const;

export type MedicationSafetyDuplicateClassification =
  (typeof MEDICATION_SAFETY_DUPLICATE_CLASSIFICATION_VALUES)[number];

export const MEDICATION_SAFETY_EMERGENCY_CONTEXT_VALUES = [
  "ACLS",
  "PALS",
  "RSI",
  "PROCEDURAL_SEDATION",
  "STROKE",
  "SEPSIS",
  "TRAUMA",
  "TOXICOLOGY",
  "ANAPHYLAXIS",
  "STATUS_EPILEPTICUS",
  "HYPERTENSIVE_EMERGENCY",
  "OBSTETRIC_EMERGENCY",
  "PAIN_MANAGEMENT",
  "BEHAVIORAL_EMERGENCY",
  "SHOCK",
  "CARDIAC_ARREST",
] as const;

export type MedicationSafetyEmergencyContext =
  (typeof MEDICATION_SAFETY_EMERGENCY_CONTEXT_VALUES)[number];

export const MEDICATION_REACTION_KIND_VALUES = [
  "TRUE_IMMUNE_ALLERGY",
  "NONIMMUNE_HYPERSENSITIVITY",
  "INTOLERANCE",
  "EXPECTED_ADVERSE_EFFECT",
  "CONTRAINDICATION",
  "CROSS_REACTIVITY_CONCERN",
  "UNKNOWN_REACTION",
] as const;

export type MedicationReactionKind = (typeof MEDICATION_REACTION_KIND_VALUES)[number];

/** Phase 9 never enables patient-facing safety evaluation or alerts. */
export const PHASE9_SAFETY_KNOWLEDGE_DEFAULTS = {
  automaticClinicalActivationEnabled: false,
  patientSpecificEvaluationEnabled: false,
  interactionAlertsEnabled: false,
  allergyAlertsEnabled: false,
  duplicateTherapyAlertsEnabled: false,
  orderBlockingEnabled: false,
  clinicalDecisionSupportEnabled: false,
} as const;

export function assertSafetyKnowledgeActivationDisabled(
  clinicalActivationAllowed: boolean
): void {
  if (clinicalActivationAllowed) {
    throw new Error("Phase 9 forbids clinicalActivationAllowed=true.");
  }
}

export function assertLegalSafetyKnowledgeLifecycleTransition(
  from: MedicationSafetyKnowledgeLifecycle,
  to: MedicationSafetyKnowledgeLifecycle
): void {
  const allowed = MEDICATION_SAFETY_KNOWLEDGE_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal safety knowledge lifecycle transition ${from} → ${to}.`);
  }
}

export function assertApprovedSafetyKnowledgeImmutable(lifecycleStatus: string): void {
  if (lifecycleStatus === "APPROVED") {
    throw new Error(
      "Approved safety knowledge cannot be modified in place; create a new version."
    );
  }
}

export function assertOnlyAdminMayApproveSafetyKnowledge(roles: string[]): void {
  const ok =
    roles.includes("MEDICATION_ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");
  if (!ok) {
    throw new Error("Only MEDICATION_ADMIN may approve safety knowledge.");
  }
}

export function isSafetyKnowledgeEligibleForFutureCds(
  lifecycleStatus: MedicationSafetyKnowledgeLifecycle,
  futureAlertEligible: boolean
): boolean {
  return lifecycleStatus === "APPROVED" && futureAlertEligible;
}

/**
 * Deterministic symmetric pair key:
 * lowerCanonicalId|higherCanonicalId|scope|sourceVersionId
 */
export function buildSymmetricInteractionPairKey(input: {
  leftMedicationId: string;
  rightMedicationId: string;
  interactionScope: string;
  sourceVersionId: string;
}): string {
  const a = input.leftMedicationId.trim().toLowerCase();
  const b = input.rightMedicationId.trim().toLowerCase();
  if (!a || !b) {
    throw new Error("Symmetric pair key requires two medication identities.");
  }
  if (a === b) {
    throw new Error("Symmetric interaction pair cannot reference the same identity twice.");
  }
  const [lower, higher] = a < b ? [a, b] : [b, a];
  return [
    lower,
    higher,
    input.interactionScope.trim().toUpperCase(),
    input.sourceVersionId.trim().toLowerCase(),
  ].join("|");
}

/** Directional identity key preserves subject → object order. */
export function buildDirectionalInteractionIdentityKey(input: {
  subjectMedicationId: string;
  objectMedicationId: string;
  interactionScope: string;
  sourceVersionId: string;
}): string {
  const subject = input.subjectMedicationId.trim().toLowerCase();
  const object = input.objectMedicationId.trim().toLowerCase();
  if (!subject || !object) {
    throw new Error("Directional identity key requires subject and object identities.");
  }
  return [
    "DIR",
    subject,
    object,
    input.interactionScope.trim().toUpperCase(),
    input.sourceVersionId.trim().toLowerCase(),
  ].join("|");
}

export function classifySymmetricPairDuplicate(input: {
  existingNormalizedPairKey: string;
  candidateNormalizedPairKey: string;
  existingDirectional: boolean;
  candidateDirectional: boolean;
}): MedicationSafetyDuplicateClassification {
  if (input.existingDirectional || input.candidateDirectional) {
    if (
      !input.existingDirectional &&
      !input.candidateDirectional &&
      input.existingNormalizedPairKey === input.candidateNormalizedPairKey
    ) {
      return "EXACT_DUPLICATE";
    }
    if (input.existingDirectional !== input.candidateDirectional) {
      return "DIRECTIONALLY_DISTINCT";
    }
  }
  if (input.existingNormalizedPairKey === input.candidateNormalizedPairKey) {
    if (!input.existingDirectional && !input.candidateDirectional) {
      return "EXACT_DUPLICATE";
    }
    return "SOURCE_VERSION_DUPLICATE";
  }
  return "NOT_DUPLICATE";
}

export function classifyReversedSymmetricPair(input: {
  leftId: string;
  rightId: string;
  existingPairKey: string;
  interactionScope: string;
  sourceVersionId: string;
}): MedicationSafetyDuplicateClassification {
  const forward = buildSymmetricInteractionPairKey({
    leftMedicationId: input.leftId,
    rightMedicationId: input.rightId,
    interactionScope: input.interactionScope,
    sourceVersionId: input.sourceVersionId,
  });
  const reversed = buildSymmetricInteractionPairKey({
    leftMedicationId: input.rightId,
    rightMedicationId: input.leftId,
    interactionScope: input.interactionScope,
    sourceVersionId: input.sourceVersionId,
  });
  if (forward !== reversed) {
    throw new Error("Symmetric pair key must be order-independent.");
  }
  if (forward === input.existingPairKey) {
    return "REVERSED_PAIR_DUPLICATE";
  }
  return "NOT_DUPLICATE";
}
