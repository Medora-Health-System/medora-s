/**
 * Phase 10 — patient-specific medication safety evaluation (SHADOW mode only).
 * No provider alerts, order blocking, overrides, or automatic clinical changes.
 */

export const MEDICATION_SAFETY_EVALUATION_MODE_VALUES = ["DISABLED", "SHADOW"] as const;

export type MedicationSafetyEvaluationMode =
  (typeof MEDICATION_SAFETY_EVALUATION_MODE_VALUES)[number];

/** Rejected modes — must never be accepted by configuration. */
export const MEDICATION_SAFETY_EVALUATION_FORBIDDEN_MODE_VALUES = [
  "PASSIVE_PROVIDER",
  "ACTIVE_ALERT",
  "SOFT_STOP",
  "HARD_STOP",
  "ACTIVE",
  "LIVE",
] as const;

export const MEDICATION_SAFETY_EVALUATION_RUN_STATUS_VALUES = [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "COMPLETED_WITH_WARNINGS",
  "FAILED",
  "CANCELLED",
] as const;

export type MedicationSafetyEvaluationRunStatus =
  (typeof MEDICATION_SAFETY_EVALUATION_RUN_STATUS_VALUES)[number];

export const MEDICATION_SAFETY_EVALUATION_TRIGGER_VALUES = [
  "MANUAL_ADMIN_TEST",
  "ORDER_DRAFT_SHADOW",
  "ORDER_SIGN_SHADOW",
  "MEDICATION_RECONCILIATION_SHADOW",
  "ALLERGY_UPDATE_SHADOW",
  "LAB_RESULT_SHADOW",
  "PATIENT_CONTEXT_REFRESH",
  "BATCH_VALIDATION",
] as const;

export type MedicationSafetyEvaluationTrigger =
  (typeof MEDICATION_SAFETY_EVALUATION_TRIGGER_VALUES)[number];

export const MEDICATION_SAFETY_FINDING_TYPE_VALUES = [
  "DRUG_DRUG_INTERACTION",
  "DRUG_CLASS_INTERACTION",
  "CLASS_CLASS_INTERACTION",
  "DIRECT_ALLERGY_MATCH",
  "ACTIVE_INGREDIENT_ALLERGY_MATCH",
  "THERAPEUTIC_CLASS_ALLERGY_MATCH",
  "KNOWN_CROSS_REACTIVITY",
  "POSSIBLE_CROSS_REACTIVITY",
  "EXACT_DUPLICATE_INGREDIENT",
  "COMBINATION_PRODUCT_DUPLICATE_INGREDIENT",
  "THERAPEUTIC_CLASS_DUPLICATION",
  "ADDITIVE_TOXICITY",
  "RENAL_CONTRAINDICATION",
  "RENAL_DOSE_REVIEW",
  "HEPATIC_CONTRAINDICATION",
  "HEPATIC_DOSE_REVIEW",
  "PREGNANCY_CONSIDERATION",
  "LACTATION_CONSIDERATION",
  "AGE_RELATED_CONSIDERATION",
  "WEIGHT_RELATED_CONSIDERATION",
  "MAXIMUM_DOSE_REVIEW",
  "CUMULATIVE_DOSE_REVIEW",
  "ROUTE_SPECIFIC_CONCERN",
  "MONITORING_REQUIRED",
  "LABORATORY_DEPENDENT_CONCERN",
  "DIAGNOSIS_DEPENDENT_CONTRAINDICATION",
  "INSUFFICIENT_PATIENT_CONTEXT",
  "UNRESOLVED_MEDICATION_IDENTITY",
  "UNRESOLVED_KNOWLEDGE_CONFLICT",
] as const;

export type MedicationSafetyFindingType =
  (typeof MEDICATION_SAFETY_FINDING_TYPE_VALUES)[number];

export const MEDICATION_SAFETY_SUPPRESSION_REASON_VALUES = [
  "APPROVED_EMERGENCY_PROTOCOL",
  "SEQUENTIAL_THERAPY",
  "ROUTE_SPECIFIC_EXCEPTION",
  "SINGLE_ADMINISTRATION_EXCEPTION",
  "COMBINATION_PRODUCT_DEDUPLICATION",
  "SAME_ORDER_DUPLICATION",
  "REVERSED_PAIR_DUPLICATION",
  "KNOWN_FALSE_POSITIVE",
  "INSUFFICIENT_CONTEXT",
  "TEST_FIXTURE",
  "OTHER",
] as const;

export type MedicationSafetySuppressionReason =
  (typeof MEDICATION_SAFETY_SUPPRESSION_REASON_VALUES)[number];

export const MEDICATION_SAFETY_FINDING_VALIDATION_VALUES = [
  "TRUE_POSITIVE",
  "LIKELY_TRUE_POSITIVE",
  "FALSE_POSITIVE",
  "LIKELY_FALSE_POSITIVE",
  "CLINICALLY_INTENTIONAL",
  "INSUFFICIENT_CONTEXT",
  "KNOWLEDGE_ERROR",
  "IDENTITY_ERROR",
  "ENGINE_ERROR",
  "NEEDS_PHARMACIST_REVIEW",
  "UNREVIEWED",
] as const;

export type MedicationSafetyFindingValidationClassification =
  (typeof MEDICATION_SAFETY_FINDING_VALIDATION_VALUES)[number];

export const PHASE10_SAFETY_EVALUATION_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  overrideWorkflowEnabled: false,
  automaticDoseModificationEnabled: false,
  automaticAllergyModificationEnabled: false,
  clinicalNotificationsEnabled: false,
  activeCdsModeAvailable: false,
  shadowOnlyRequired: true,
} as const;

export const PHASE10_ENGINE_VERSION = "phase10-shadow-1.0.0";

/**
 * Parse MEDICATION_SAFETY_EVALUATION_MODE.
 * Missing/invalid/forbidden values fail closed to DISABLED.
 */
export function resolveMedicationSafetyEvaluationMode(
  raw: string | undefined | null
): MedicationSafetyEvaluationMode {
  if (raw == null || String(raw).trim() === "") return "DISABLED";
  const normalized = String(raw).trim().toUpperCase();
  if (
    (MEDICATION_SAFETY_EVALUATION_FORBIDDEN_MODE_VALUES as readonly string[]).includes(
      normalized
    )
  ) {
    return "DISABLED";
  }
  if (normalized === "DISABLED" || normalized === "SHADOW") return normalized;
  return "DISABLED";
}

export function assertShadowOnlyFinding(shadowOnly: boolean): void {
  if (!shadowOnly) {
    throw new Error("Phase 10 forbids shadowOnly=false on safety findings.");
  }
}

export function assertNoProviderFacingAlerts(enabled: boolean): void {
  if (enabled) {
    throw new Error("Phase 10 forbids provider-facing medication alerts.");
  }
}

export function assertNoOrderBlocking(enabled: boolean): void {
  if (enabled) {
    throw new Error("Phase 10 forbids order blocking.");
  }
}

export function assertApprovedSuppressionImmutable(status: string): void {
  if (status === "APPROVED") {
    throw new Error(
      "Approved suppression rules cannot be modified in place; create a new version."
    );
  }
}

export function assertOnlyAdminMayApproveSuppression(roles: string[]): void {
  const ok =
    roles.includes("MEDICATION_ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");
  if (!ok) {
    throw new Error("Only MEDICATION_ADMIN may approve suppression rules.");
  }
}

/**
 * Deterministic finding deduplication key.
 */
export function buildSafetyFindingDeduplicationKey(input: {
  patientId: string;
  encounterId?: string | null;
  candidateMedicationIdentity: string;
  relatedMedicationIdentity?: string | null;
  findingType: string;
  normalizedRuleIdentity: string;
  knowledgeVersion?: string | null;
  clinicalContextHash?: string | null;
}): string {
  return [
    input.patientId.trim().toLowerCase(),
    (input.encounterId ?? "").trim().toLowerCase(),
    input.candidateMedicationIdentity.trim().toLowerCase(),
    (input.relatedMedicationIdentity ?? "").trim().toLowerCase(),
    input.findingType.trim().toUpperCase(),
    input.normalizedRuleIdentity.trim().toLowerCase(),
    (input.knowledgeVersion ?? "").trim().toLowerCase(),
    (input.clinicalContextHash ?? "").trim().toLowerCase(),
  ].join("|");
}

export function isFixtureSafetyEvaluationMarker(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toUpperCase();
  return (
    v.includes("PHASE10_SHADOW_FIXTURE") ||
    v.includes("MEDICATION_SAFETY_EVALUATION_FIXTURE")
  );
}
