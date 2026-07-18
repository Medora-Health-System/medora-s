/**
 * Phase 11 — shadow validation, coverage analytics, pharmacist review, activation readiness.
 * No provider alerts, order blocking, overrides, or clinical activation.
 */

export const PHASE11_SAFETY_VALIDATION_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  providerOverrideWorkflowEnabled: false,
  clinicalActivationEnabled: false,
  activeCdsModeAvailable: false,
  automaticMedicationIdentityCreationEnabled: false,
  automaticKnowledgeApprovalEnabled: false,
} as const;

export const MEDICATION_FAMILY_COVERAGE_STATUS_VALUES = [
  "NOT_STARTED",
  "IDENTITY_ONLY",
  "PARTIAL_CLINICAL_KNOWLEDGE",
  "PARTIAL_SAFETY_KNOWLEDGE",
  "SHADOW_EVALUABLE",
  "VALIDATION_IN_PROGRESS",
  "VALIDATED",
  "ACTIVATION_CANDIDATE",
  "BLOCKED",
] as const;

export type MedicationFamilyCoverageStatus =
  (typeof MEDICATION_FAMILY_COVERAGE_STATUS_VALUES)[number];

export const MEDICATION_COVERAGE_DOMAIN_VALUES = [
  "IDENTITY",
  "PRODUCT",
  "PACKAGE",
  "CATALOG",
  "THERAPEUTIC_CLASS",
  "CLINICAL_PROFILE",
  "ADULT_DOSING",
  "PEDIATRIC_DOSING",
  "WEIGHT_BASED_DOSING",
  "RENAL",
  "HEPATIC",
  "PREGNANCY",
  "LACTATION",
  "ADMINISTRATION",
  "INFUSION",
  "MONITORING",
  "CONTRAINDICATION",
  "BLACK_BOX_WARNING",
  "DRUG_INTERACTION",
  "ALLERGY_MAPPING",
  "CROSS_REACTIVITY",
  "DUPLICATE_THERAPY",
  "EMERGENCY_CONTEXT",
  "SHADOW_EVALUATION",
  "PHARMACIST_VALIDATION",
] as const;

export type MedicationCoverageDomain =
  (typeof MEDICATION_COVERAGE_DOMAIN_VALUES)[number];

/** Weights for explainable scoring (critical domains weigh more). */
export const MEDICATION_COVERAGE_DOMAIN_WEIGHTS: Record<
  MedicationCoverageDomain,
  number
> = {
  IDENTITY: 1.5,
  PRODUCT: 1.0,
  PACKAGE: 0.5,
  CATALOG: 0.5,
  THERAPEUTIC_CLASS: 1.0,
  CLINICAL_PROFILE: 1.2,
  ADULT_DOSING: 0.8,
  PEDIATRIC_DOSING: 0.8,
  WEIGHT_BASED_DOSING: 0.7,
  RENAL: 1.2,
  HEPATIC: 1.0,
  PREGNANCY: 1.0,
  LACTATION: 0.8,
  ADMINISTRATION: 0.7,
  INFUSION: 0.6,
  MONITORING: 0.8,
  CONTRAINDICATION: 1.2,
  BLACK_BOX_WARNING: 0.8,
  DRUG_INTERACTION: 1.5,
  ALLERGY_MAPPING: 1.5,
  CROSS_REACTIVITY: 1.2,
  DUPLICATE_THERAPY: 1.3,
  EMERGENCY_CONTEXT: 0.8,
  SHADOW_EVALUATION: 1.0,
  PHARMACIST_VALIDATION: 1.2,
};

export const MEDICATION_CRITICAL_COVERAGE_GATE_VALUES = [
  "CanonicalIdentityResolved",
  "ActiveProductsResolved",
  "TherapeuticClassAssigned",
  "ClinicalProfileApproved",
  "SafetyKnowledgeApproved",
  "DuplicateTherapyMembershipReviewed",
  "AllergyMappingReviewed",
  "ShadowEvaluationSuccessful",
  "PharmacistValidationCompleted",
  "NoCriticalKnowledgeConflict",
  "NoUnresolvedIdentityBlocker",
] as const;

export type MedicationCriticalCoverageGate =
  (typeof MEDICATION_CRITICAL_COVERAGE_GATE_VALUES)[number];

export const MEDICATION_VALIDATION_CASE_STATUS_VALUES = [
  "UNASSIGNED",
  "ASSIGNED",
  "IN_REVIEW",
  "AWAITING_SECOND_REVIEW",
  "AWAITING_ADJUDICATION",
  "VALIDATED",
  "CLOSED",
  "DEFERRED",
  "EXCLUDED",
] as const;

export type MedicationValidationCaseStatus =
  (typeof MEDICATION_VALIDATION_CASE_STATUS_VALUES)[number];

export const MEDICATION_VALIDATION_CLASSIFICATION_VALUES = [
  "TRUE_POSITIVE",
  "LIKELY_TRUE_POSITIVE",
  "FALSE_POSITIVE",
  "LIKELY_FALSE_POSITIVE",
  "CLINICALLY_INTENTIONAL",
  "CONTEXTUALLY_EXPECTED",
  "INSUFFICIENT_PATIENT_CONTEXT",
  "KNOWLEDGE_ERROR",
  "KNOWLEDGE_GAP",
  "IDENTITY_ERROR",
  "IDENTITY_GAP",
  "ENGINE_ERROR",
  "SEVERITY_TOO_HIGH",
  "SEVERITY_TOO_LOW",
  "DUPLICATE_FINDING",
  "SUPPRESSION_NEEDED",
  "SUPPRESSION_INCORRECT",
  "NOT_CLINICALLY_RELEVANT",
  "NEEDS_ADDITIONAL_REVIEW",
  "UNREVIEWED",
] as const;

export type MedicationValidationClassification =
  (typeof MEDICATION_VALIDATION_CLASSIFICATION_VALUES)[number];

export const MEDICATION_READINESS_RESULT_VALUES = [
  "NOT_ASSESSED",
  "NOT_READY",
  "REMEDIATION_REQUIRED",
  "READY_FOR_ADDITIONAL_VALIDATION",
  "READY_FOR_GOVERNANCE_REVIEW",
] as const;

export type MedicationReadinessResult =
  (typeof MEDICATION_READINESS_RESULT_VALUES)[number];

export const MEDICATION_ACTIVATION_CANDIDATE_STATUS_VALUES = [
  "NOT_READY",
  "REMEDIATION_REQUIRED",
  "READY_FOR_FURTHER_VALIDATION",
  "READY_FOR_GOVERNANCE_REVIEW",
  "APPROVED_FOR_FUTURE_PILOT_DESIGN",
  "REJECTED",
  "RETIRED",
] as const;

export type MedicationActivationCandidateStatus =
  (typeof MEDICATION_ACTIVATION_CANDIDATE_STATUS_VALUES)[number];

/** Forbidden activation statuses — must never exist. */
export const MEDICATION_FORBIDDEN_ACTIVATION_STATUS_VALUES = [
  "ACTIVE",
  "ENABLED",
  "LIVE",
  "PRODUCTION_ALERTING",
  "READY_FOR_ACTIVATION",
] as const;

export type Phase11ReadinessThresholds = {
  minimumReviewedCases: number;
  minimumDualReviewedCriticalCases: number;
  minimumTruePositiveRate: number;
  maximumFalsePositiveRate: number;
  minimumEstimatedRecall: number;
  maximumCriticalMisses: number;
  maximumUnresolvedIdentityRate: number;
  maximumEvaluationFailureRate: number;
  minimumCriticalSeverityAgreement: number;
  minimumKnowledgeCoverage: number;
  providerFacingAlertsAllowed: boolean;
  orderBlockingAllowed: boolean;
};

export const PHASE11_DEFAULT_READINESS_THRESHOLDS: Phase11ReadinessThresholds = {
  minimumReviewedCases: 200,
  minimumDualReviewedCriticalCases: 50,
  minimumTruePositiveRate: 0.9,
  maximumFalsePositiveRate: 0.1,
  minimumEstimatedRecall: 0.95,
  maximumCriticalMisses: 0,
  maximumUnresolvedIdentityRate: 0.01,
  maximumEvaluationFailureRate: 0.005,
  minimumCriticalSeverityAgreement: 0.95,
  minimumKnowledgeCoverage: 0.95,
  providerFacingAlertsAllowed: false,
  orderBlockingAllowed: false,
};

export const PHASE11_COVERAGE_CALCULATION_VERSION = "phase11-coverage-1.0.0";

export function assertPhase11ClinicalActivationDisabled(
  clinicalActivationEnabled: boolean
): void {
  if (clinicalActivationEnabled) {
    throw new Error("Phase 11 forbids clinicalActivationEnabled=true.");
  }
}

export function assertPhase11NoProviderFacingAlerts(enabled: boolean): void {
  if (enabled) throw new Error("Phase 11 forbids provider-facing alerts.");
}

export function assertPhase11NoOrderBlocking(enabled: boolean): void {
  if (enabled) throw new Error("Phase 11 forbids order blocking.");
}

export function assertApprovedPolicyImmutable(status: string): void {
  if (status === "APPROVED") {
    throw new Error("Approved readiness policies are immutable; create a new version.");
  }
}

export function assertAttestationImmutable(): void {
  throw new Error("Readiness attestations are immutable.");
}

export function assertOnlyAdminMayApproveReadiness(roles: string[]): void {
  const ok =
    roles.includes("MEDICATION_ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");
  if (!ok) {
    throw new Error("Only MEDICATION_ADMIN may approve readiness policies/attestations.");
  }
}

export function assertForbiddenActivationStatus(status: string): void {
  if (
    (MEDICATION_FORBIDDEN_ACTIVATION_STATUS_VALUES as readonly string[]).includes(
      status
    )
  ) {
    throw new Error(`Forbidden activation status: ${status}`);
  }
}

export function computeWeightedCoverageScore(
  domains: Array<{ domain: MedicationCoverageDomain; percentage: number }>
): { weightedScore: number; totalWeight: number } {
  let weighted = 0;
  let totalWeight = 0;
  for (const row of domains) {
    const w = MEDICATION_COVERAGE_DOMAIN_WEIGHTS[row.domain] ?? 1;
    const pct = Math.max(0, Math.min(100, row.percentage));
    weighted += (pct / 100) * w;
    totalWeight += w;
  }
  return {
    weightedScore: totalWeight === 0 ? 0 : Number((weighted / totalWeight).toFixed(4)),
    totalWeight,
  };
}

export function evaluateCriticalCoverageGates(input: {
  hasCanonicalIdentity: boolean;
  hasActiveProducts: boolean;
  hasTherapeuticClass: boolean;
  hasApprovedClinicalProfile: boolean;
  hasApprovedSafetyKnowledge: boolean;
  hasDuplicateTherapyMembership: boolean;
  hasAllergyMapping: boolean;
  shadowEvaluationSuccessful: boolean;
  pharmacistValidationCompleted: boolean;
  hasCriticalKnowledgeConflict: boolean;
  hasUnresolvedIdentityBlocker: boolean;
}): Record<MedicationCriticalCoverageGate, boolean> {
  return {
    CanonicalIdentityResolved: input.hasCanonicalIdentity,
    ActiveProductsResolved: input.hasActiveProducts,
    TherapeuticClassAssigned: input.hasTherapeuticClass,
    ClinicalProfileApproved: input.hasApprovedClinicalProfile,
    SafetyKnowledgeApproved: input.hasApprovedSafetyKnowledge,
    DuplicateTherapyMembershipReviewed: input.hasDuplicateTherapyMembership,
    AllergyMappingReviewed: input.hasAllergyMapping,
    ShadowEvaluationSuccessful: input.shadowEvaluationSuccessful,
    PharmacistValidationCompleted: input.pharmacistValidationCompleted,
    NoCriticalKnowledgeConflict: !input.hasCriticalKnowledgeConflict,
    NoUnresolvedIdentityBlocker: !input.hasUnresolvedIdentityBlocker,
  };
}

export function allCriticalGatesPass(
  gates: Record<MedicationCriticalCoverageGate, boolean>
): boolean {
  return Object.values(gates).every(Boolean);
}

export function assessReadinessResult(input: {
  reviewedCases: number;
  dualReviewedCriticalCases: number;
  truePositiveRate: number | null;
  falsePositiveRate: number | null;
  estimatedRecall: number | null;
  criticalMisses: number;
  unresolvedIdentityRate: number;
  evaluationFailureRate: number;
  knowledgeCoverage: number;
  thresholds?: Partial<Phase11ReadinessThresholds>;
}): {
  result: MedicationReadinessResult;
  blockingCriteriaFailed: string[];
  blockingCriteriaPassed: string[];
} {
  const t: Phase11ReadinessThresholds = {
    ...PHASE11_DEFAULT_READINESS_THRESHOLDS,
    ...input.thresholds,
  };
  const failed: string[] = [];
  const passed: string[] = [];

  const check = (name: string, ok: boolean) => {
    if (ok) passed.push(name);
    else failed.push(name);
  };

  check("minimumReviewedCases", input.reviewedCases >= t.minimumReviewedCases);
  check(
    "minimumDualReviewedCriticalCases",
    input.dualReviewedCriticalCases >= t.minimumDualReviewedCriticalCases
  );
  check(
    "minimumTruePositiveRate",
    input.truePositiveRate != null && input.truePositiveRate >= t.minimumTruePositiveRate
  );
  check(
    "maximumFalsePositiveRate",
    input.falsePositiveRate != null &&
      input.falsePositiveRate <= t.maximumFalsePositiveRate
  );
  check(
    "minimumEstimatedRecall",
    input.estimatedRecall != null && input.estimatedRecall >= t.minimumEstimatedRecall
  );
  check("maximumCriticalMisses", input.criticalMisses <= t.maximumCriticalMisses);
  check(
    "maximumUnresolvedIdentityRate",
    input.unresolvedIdentityRate <= t.maximumUnresolvedIdentityRate
  );
  check(
    "maximumEvaluationFailureRate",
    input.evaluationFailureRate <= t.maximumEvaluationFailureRate
  );
  check(
    "minimumKnowledgeCoverage",
    input.knowledgeCoverage >= t.minimumKnowledgeCoverage
  );
  check("providerFacingAlertsAllowed", t.providerFacingAlertsAllowed === false);
  check("orderBlockingAllowed", t.orderBlockingAllowed === false);

  if (input.reviewedCases === 0) {
    return {
      result: "NOT_ASSESSED",
      blockingCriteriaFailed: failed,
      blockingCriteriaPassed: passed,
    };
  }
  if (failed.length === 0) {
    return {
      result: "READY_FOR_GOVERNANCE_REVIEW",
      blockingCriteriaFailed: failed,
      blockingCriteriaPassed: passed,
    };
  }
  if (input.criticalMisses > 0 || input.unresolvedIdentityRate > t.maximumUnresolvedIdentityRate) {
    return {
      result: "REMEDIATION_REQUIRED",
      blockingCriteriaFailed: failed,
      blockingCriteriaPassed: passed,
    };
  }
  if (input.reviewedCases < t.minimumReviewedCases) {
    return {
      result: "READY_FOR_ADDITIONAL_VALIDATION",
      blockingCriteriaFailed: failed,
      blockingCriteriaPassed: passed,
    };
  }
  return {
    result: "NOT_READY",
    blockingCriteriaFailed: failed,
    blockingCriteriaPassed: passed,
  };
}

export function isPhase11FixtureMarker(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toUpperCase();
  return (
    v.includes("PHASE11_VALIDATION_FIXTURE") ||
    v.includes("MEDICATION_SAFETY_REFERENCE_FIXTURE")
  );
}
