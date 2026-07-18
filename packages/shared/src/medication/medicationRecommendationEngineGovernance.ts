/**
 * Phase 16 — Controlled Shadow Recommendation Engine governance.
 * Extends Phase 15 knowledge governance. Does not replace Phase 15.
 * Shadow-only activation ceiling for this phase; Pilot/Enterprise Active blocked.
 */

import { PHASE15_WAVE_FAMILY_NAMES } from "./medicationAuthoritativeSourceAcquisitionGovernance.js";

export const PHASE16_RECOMMENDATION_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  clinicalActivationEnabled: false,
  activeCdsModeAvailable: false,
  knowledgeControlsPatientCare: false,
  orderingChanged: false,
  dispensingChanged: false,
  administrationChanged: false,
  marChanged: false,
  billingChanged: false,
  medicationReconciliationChanged: false,
  orderFromRecommendationAllowed: false,
  fabricateRecommendations: false,
  expandBeyondWave1: false,
  resolveAcetaminophenIdentity: false,
  shadowRecommendationAllowed: true,
  controlledPilotAllowed: false,
  enterpriseActiveAllowed: false,
  shadowImpliesProduction: false,
  shadowImpliesControlledPilot: false,
} as const;

export const PHASE16_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_16_CONTROLLED_ACTIVATION_ENTERPRISE_MEDICATION_RECOMMENDATION_ENGINE";

export const PHASE16_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_16_SHADOW_RECOMMENDATION_ENGINE";

export const PHASE16_PROGRAM_KEY = "EM_WAVE1_SHADOW_RECOMMENDATION_ENGINE_V1";
export const PHASE16_PROGRAM_VERSION = "1.0.0";

export const PHASE16_CERTIFICATION_DECISION_VALUES = [
  "MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED",
  "MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED_SHADOW_ONLY",
  "MEDICATION_INTELLIGENCE_PHASE_16_NOT_CERTIFIED",
] as const;

export type Phase16CertificationDecision =
  (typeof PHASE16_CERTIFICATION_DECISION_VALUES)[number];

/** Truthful Phase 16 outcome while Pilot/Active remain constitutionally blocked. */
export const PHASE16_EXPECTED_CERTIFICATION_DECISION =
  "MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED_SHADOW_ONLY";

export const PHASE16_WAVE_FAMILY_NAMES = PHASE15_WAVE_FAMILY_NAMES;

export const PHASE16_RECOMMENDATION_LIFECYCLE_VALUES = [
  "DRAFT",
  "EVIDENCE_COMPLETE",
  "EXPERT_REVIEW",
  "APPROVED",
  "SHADOW_RECOMMENDATION",
  "CONTROLLED_PILOT",
  "ENTERPRISE_ACTIVE",
  "RETIRED",
] as const;

export type Phase16RecommendationLifecycle =
  (typeof PHASE16_RECOMMENDATION_LIFECYCLE_VALUES)[number];

/** Hard ceiling for Phase 16 runtime transitions. */
export const PHASE16_ACTIVATION_CEILING: Phase16RecommendationLifecycle =
  "SHADOW_RECOMMENDATION";

export const PHASE16_RECOMMENDATION_KIND_VALUES = [
  "FIRST_LINE",
  "ALTERNATIVE_THERAPY",
  "CONTRAINDICATED",
  "ALLERGY_SUBSTITUTION",
  "PREGNANCY_SUBSTITUTION",
  "RENAL_ADJUSTMENT",
  "HEPATIC_ADJUSTMENT",
  "PEDIATRIC",
  "GERIATRIC",
  "FORMULARY_ALTERNATIVE",
] as const;

export type Phase16RecommendationKind =
  (typeof PHASE16_RECOMMENDATION_KIND_VALUES)[number];

export const PHASE16_FEEDBACK_TYPE_VALUES = [
  "ACKNOWLEDGED",
  "ACCEPTED_AS_INFORMATION",
  "REJECTED",
  "OVERRIDE_DOCUMENTED",
] as const;

export type Phase16FeedbackType =
  (typeof PHASE16_FEEDBACK_TYPE_VALUES)[number];

export const PHASE16_PROGRAM_STATUS_VALUES = [
  "PLANNED",
  "SEEDING",
  "IN_REVIEW",
  "SHADOW_READY",
  "COMPLETED",
  "BLOCKED",
] as const;

export type Phase16ProgramStatus =
  (typeof PHASE16_PROGRAM_STATUS_VALUES)[number];

/**
 * Allowed lifecycle edges. CONTROLLED_PILOT / ENTERPRISE_ACTIVE are listed
 * for future phases but Phase 16 runtime must refuse them via asserts.
 */
export function canTransitionRecommendationLifecycle(
  from: Phase16RecommendationLifecycle,
  to: Phase16RecommendationLifecycle
): boolean {
  if (from === to) return false;
  const edges: Record<
    Phase16RecommendationLifecycle,
    Phase16RecommendationLifecycle[]
  > = {
    DRAFT: ["EVIDENCE_COMPLETE", "RETIRED"],
    EVIDENCE_COMPLETE: ["EXPERT_REVIEW", "DRAFT", "RETIRED"],
    EXPERT_REVIEW: ["APPROVED", "EVIDENCE_COMPLETE", "RETIRED"],
    APPROVED: ["SHADOW_RECOMMENDATION", "EXPERT_REVIEW", "RETIRED"],
    SHADOW_RECOMMENDATION: [
      "CONTROLLED_PILOT",
      "APPROVED",
      "RETIRED",
    ],
    CONTROLLED_PILOT: ["ENTERPRISE_ACTIVE", "SHADOW_RECOMMENDATION", "RETIRED"],
    ENTERPRISE_ACTIVE: ["RETIRED", "CONTROLLED_PILOT"],
    RETIRED: [],
  };
  return edges[from]?.includes(to) ?? false;
}

/** Phase 16 refuses Pilot/Active even if graph edge exists. */
export function isPhase16LifecycleTransitionAllowed(
  from: Phase16RecommendationLifecycle,
  to: Phase16RecommendationLifecycle
): boolean {
  if (!canTransitionRecommendationLifecycle(from, to)) return false;
  if (to === "CONTROLLED_PILOT" || to === "ENTERPRISE_ACTIVE") return false;
  if (from === "CONTROLLED_PILOT" || from === "ENTERPRISE_ACTIVE") return false;
  return true;
}

export function isRecommendationExposableToProviders(
  status: Phase16RecommendationLifecycle
): boolean {
  return status === "SHADOW_RECOMMENDATION";
}

export function assertPhase16NoWorkflowControl(enabled: boolean): void {
  if (enabled) {
    throw new Error(
      "Phase 16 forbids Medication Intelligence controlling patient-care workflows."
    );
  }
}

export function assertPhase16NoClinicalActivation(enabled: boolean): void {
  if (enabled) {
    throw new Error("Phase 16 forbids clinicalActivationEnabled=true.");
  }
}

export function assertPhase16NoOrderFromRecommendation(allowed: boolean): void {
  if (allowed) {
    throw new Error(
      "Phase 16 forbids ordering directly from medication recommendations."
    );
  }
}

export function assertPhase16NoFabricatedRecommendations(
  fabricate: boolean
): void {
  if (fabricate) {
    throw new Error(
      "Phase 16 forbids fabricating or inferring unsupported medication recommendations."
    );
  }
}

export function assertPhase16Wave1Only(expandBeyondWave1: boolean): void {
  if (expandBeyondWave1) {
    throw new Error(
      "Phase 16 forbids expanding recommendation catalog beyond Wave 1 families."
    );
  }
}

export function assertPhase16NoAcetaminophenResolution(resolve: boolean): void {
  if (resolve) {
    throw new Error(
      "Phase 16 forbids resolving acetaminophen identity; it remains IDENTITY_BLOCKED."
    );
  }
}

export function assertPhase16NoControlledPilot(allowed: boolean): void {
  if (allowed) {
    throw new Error(
      "Phase 16 blocks CONTROLLED_PILOT; reserved for a later activation phase."
    );
  }
}

export function assertPhase16NoEnterpriseActive(allowed: boolean): void {
  if (allowed) {
    throw new Error(
      "Phase 16 blocks ENTERPRISE_ACTIVE; reserved for a later activation phase."
    );
  }
}

export function assertPhase16SafetyDefaults(): void {
  assertPhase16NoWorkflowControl(
    PHASE16_RECOMMENDATION_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase16NoClinicalActivation(
    PHASE16_RECOMMENDATION_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase16NoOrderFromRecommendation(
    PHASE16_RECOMMENDATION_DEFAULTS.orderFromRecommendationAllowed
  );
  assertPhase16NoFabricatedRecommendations(
    PHASE16_RECOMMENDATION_DEFAULTS.fabricateRecommendations
  );
  assertPhase16Wave1Only(PHASE16_RECOMMENDATION_DEFAULTS.expandBeyondWave1);
  assertPhase16NoAcetaminophenResolution(
    PHASE16_RECOMMENDATION_DEFAULTS.resolveAcetaminophenIdentity
  );
  assertPhase16NoControlledPilot(
    PHASE16_RECOMMENDATION_DEFAULTS.controlledPilotAllowed
  );
  assertPhase16NoEnterpriseActive(
    PHASE16_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed
  );
}

export function isWave1RecommendationFamily(familyKeyOrName: string): boolean {
  const raw = familyKeyOrName.trim().toLowerCase();
  if (/acetaminophen|paracetamol/.test(raw)) return false;
  return PHASE16_WAVE_FAMILY_NAMES.some(
    (n) =>
      raw === n.toLowerCase() ||
      raw === `em_fam_${n.toLowerCase()}` ||
      raw.includes(n.toLowerCase())
  );
}

/**
 * Confidence 0–100. Empty fields do not inflate the score.
 * Requires provenance + approval signals for high confidence.
 */
export function calculateRecommendationConfidence(input: {
  hasAuthoritativeSource: boolean;
  hasEvidenceLink: boolean;
  evidenceCompletenessPercent: number;
  approvedByReviewer: boolean;
  missingReferenceCount: number;
  unresolvedConflict: boolean;
  validationStatus:
    | "VALIDATED"
    | "PARTIAL"
    | "UNVALIDATED"
    | "BLOCKED";
}): {
  confidenceScore: number;
  evidenceCompleteness: number;
  validationStatus: string;
} {
  if (input.unresolvedConflict || input.validationStatus === "BLOCKED") {
    return {
      confidenceScore: 0,
      evidenceCompleteness: Math.max(
        0,
        Math.min(100, input.evidenceCompletenessPercent)
      ),
      validationStatus: input.unresolvedConflict
        ? "BLOCKED_CONFLICT"
        : input.validationStatus,
    };
  }

  let score = 0;
  if (input.hasAuthoritativeSource) score += 25;
  if (input.hasEvidenceLink) score += 20;
  if (input.approvedByReviewer) score += 25;
  const completeness = Math.max(
    0,
    Math.min(100, input.evidenceCompletenessPercent)
  );
  score += Math.round(completeness * 0.25);
  if (input.validationStatus === "VALIDATED") score += 5;
  else if (input.validationStatus === "PARTIAL") score += 2;

  score -= Math.min(30, input.missingReferenceCount * 5);
  score = Math.max(0, Math.min(100, score));

  return {
    confidenceScore: score,
    evidenceCompleteness: completeness,
    validationStatus: input.validationStatus,
  };
}
