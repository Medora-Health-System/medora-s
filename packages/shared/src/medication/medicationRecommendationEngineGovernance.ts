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

// ---------------------------------------------------------------------------
// Phase 17 — Controlled Pilot Qualification & Limited Clinical Advisory
// Extends Phase 16. Enterprise Active remains blocked. Defaults fail closed.
// ---------------------------------------------------------------------------

export const PHASE17_RECOMMENDATION_DEFAULTS = {
  ...PHASE16_RECOMMENDATION_DEFAULTS,
  clinicalActivationEnabled: false,
  enterpriseActiveAllowed: false,
  controlledPilotAllowed: false,
  shadowRecommendationAllowed: true,
  productionCdsEnabled: false,
  providerAlertsEnabled: false,
  orderBlockingEnabled: false,
  orderFromRecommendationEnabled: false,
  autoOrderEnabled: false,
  autoSelectEnabled: false,
} as const;

export const PHASE17_CERTIFICATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_17_CONTROLLED_PILOT_QUALIFICATION_SAFETY_MONITORING_LIMITED_CLINICAL_ADVISORY";

export const PHASE17_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_INTELLIGENCE_PHASE_17_CONTROLLED_PILOT_GOVERNANCE";

export const PHASE17_PROGRAM_KEY_PREFIX = "EM_WAVE1_CONTROLLED_PILOT";

export const PHASE17_CERTIFICATION_DECISION_VALUES = [
  "MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_CONTROLLED_PILOT",
  "MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_PILOT_READY_NOT_ACTIVATED",
  "MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_CONTINUE_SHADOW_ONLY",
  "MEDICATION_INTELLIGENCE_PHASE_17_NOT_CERTIFIED",
] as const;

export type Phase17CertificationDecision =
  (typeof PHASE17_CERTIFICATION_DECISION_VALUES)[number];

export const PHASE17_PILOT_STATUS_VALUES = [
  "DRAFT",
  "SHADOW_EVIDENCE_REVIEW",
  "PILOT_ELIGIBLE",
  "PENDING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "SUSPENDED",
  "COMPLETED",
  "REVOKED",
  "EXPIRED",
] as const;

export type Phase17PilotStatus = (typeof PHASE17_PILOT_STATUS_VALUES)[number];

export const PHASE17_QUALIFICATION_DECISION_VALUES = [
  "PILOT_ELIGIBLE",
  "PILOT_ELIGIBLE_WITH_LIMITATIONS",
  "CONTINUE_SHADOW_ONLY",
  "NOT_ELIGIBLE",
] as const;

export type Phase17QualificationDecision =
  (typeof PHASE17_QUALIFICATION_DECISION_VALUES)[number];

/** Conservative governed qualification thresholds (documented). */
export const PHASE17_QUALIFICATION_THRESHOLDS = {
  minShadowEvaluationCount: 1,
  minConfidenceScore: 40,
  minEvidenceCompleteness: 20,
  maxUnresolvedConflictCount: 0,
  maxConstitutionalViolationCount: 0,
  maxOrderMutationCount: 0,
  maxMarMutationCount: 0,
  maxChartMutationCount: 0,
  requireLifecycleShadow: true,
  requireProvenance: true,
  requireExpertApproval: true,
  requireWave1Family: true,
} as const;

export function canTransitionPilotAuthorization(
  from: Phase17PilotStatus,
  to: Phase17PilotStatus
): boolean {
  if (from === to) return false;
  const edges: Record<Phase17PilotStatus, Phase17PilotStatus[]> = {
    DRAFT: ["SHADOW_EVIDENCE_REVIEW", "REVOKED"],
    SHADOW_EVIDENCE_REVIEW: ["PILOT_ELIGIBLE", "DRAFT", "REVOKED"],
    PILOT_ELIGIBLE: ["PENDING_APPROVAL", "SHADOW_EVIDENCE_REVIEW", "REVOKED"],
    PENDING_APPROVAL: ["APPROVED", "PILOT_ELIGIBLE", "REVOKED"],
    APPROVED: ["SCHEDULED", "ACTIVE", "REVOKED"],
    SCHEDULED: ["ACTIVE", "APPROVED", "REVOKED", "EXPIRED"],
    ACTIVE: ["PAUSED", "SUSPENDED", "COMPLETED", "REVOKED", "EXPIRED"],
    PAUSED: ["ACTIVE", "SUSPENDED", "REVOKED", "COMPLETED"],
    SUSPENDED: ["PAUSED", "REVOKED", "COMPLETED"],
    COMPLETED: [],
    REVOKED: [],
    EXPIRED: ["REVOKED"],
  };
  return edges[from]?.includes(to) ?? false;
}

/** Phase 17 may move SHADOW → CONTROLLED_PILOT; ENTERPRISE_ACTIVE always blocked. */
export function isPhase17LifecycleTransitionAllowed(
  from: Phase16RecommendationLifecycle,
  to: Phase16RecommendationLifecycle,
  opts?: { explicitPilotAuthorization: boolean }
): boolean {
  if (!canTransitionRecommendationLifecycle(from, to)) return false;
  if (to === "ENTERPRISE_ACTIVE" || from === "ENTERPRISE_ACTIVE") return false;
  if (to === "CONTROLLED_PILOT") {
    return opts?.explicitPilotAuthorization === true;
  }
  return true;
}

export function assertEnterpriseActivationBlocked(allowed: boolean): void {
  if (allowed) {
    throw new Error(
      "Phase 17 blocks ENTERPRISE_ACTIVE; reserved for a future phase."
    );
  }
}

export function assertControlledPilotBoundary(input: {
  controlledPilotAllowed: boolean;
  hasExplicitPilotAuthorization: boolean;
}): void {
  if (
    input.controlledPilotAllowed &&
    !input.hasExplicitPilotAuthorization
  ) {
    throw new Error(
      "controlledPilotAllowed requires an explicit, scoped pilot authorization record."
    );
  }
}

export function assertNoOrderMutation(count: number): void {
  if (count > 0) {
    throw new Error("Phase 17 forbids order mutations from recommendations.");
  }
}

export function assertNoMarMutation(count: number): void {
  if (count > 0) {
    throw new Error("Phase 17 forbids MAR mutations from recommendations.");
  }
}

export function assertNoChartMutation(count: number): void {
  if (count > 0) {
    throw new Error("Phase 17 forbids chart mutations from recommendations.");
  }
}

export function assertNoBlockingBehavior(enabled: boolean): void {
  if (enabled) {
    throw new Error("Phase 17 forbids order-blocking recommendation behavior.");
  }
}

export function assertPilotScopeValid(input: {
  facilityId: string | null | undefined;
  definitionIds: string[];
  providerIds: string[];
}): void {
  if (!input.facilityId?.trim()) {
    throw new Error("Pilot requires a facility scope.");
  }
  if (input.definitionIds.length < 1) {
    throw new Error("Pilot requires at least one recommendation definition.");
  }
  if (input.providerIds.length < 1) {
    throw new Error("Pilot requires at least one authorized provider.");
  }
}

export function assertPilotTimeWindowValid(input: {
  startAt: Date | string | null | undefined;
  endAt: Date | string | null | undefined;
  now?: Date;
}): void {
  if (!input.startAt || !input.endAt) {
    throw new Error("Pilot requires startAt and endAt.");
  }
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (!(start < end)) {
    throw new Error("Pilot startAt must be before endAt.");
  }
  const now = input.now ?? new Date();
  if (now < start || now > end) {
    throw new Error("Current time is outside the pilot authorization window.");
  }
}

export function assertPilotProviderCohortValid(input: {
  providerId: string;
  authorizedProviderIds: string[];
  trainingCompleted: boolean;
  acknowledgementCompleted: boolean;
  authorizationStatus: string;
}): void {
  if (!input.authorizedProviderIds.includes(input.providerId)) {
    throw new Error("Provider is not in the authorized pilot cohort.");
  }
  if (input.authorizationStatus !== "AUTHORIZED") {
    throw new Error("Provider pilot authorization is not active.");
  }
  if (!input.trainingCompleted) {
    throw new Error("Provider has not completed pilot training.");
  }
  if (!input.acknowledgementCompleted) {
    throw new Error("Provider has not acknowledged pilot terms.");
  }
}

export function assertPilotDefinitionsQualified(input: {
  decisions: Phase17QualificationDecision[];
}): void {
  const ok = input.decisions.every(
    (d) => d === "PILOT_ELIGIBLE" || d === "PILOT_ELIGIBLE_WITH_LIMITATIONS"
  );
  if (!ok || input.decisions.length < 1) {
    throw new Error("One or more pilot definitions are not qualified.");
  }
}

export function assertPilotCanBeImmediatelySuspended(
  suspensionMechanismOperational: boolean
): void {
  if (!suspensionMechanismOperational) {
    throw new Error("Pilot suspension mechanism must be operational.");
  }
}

export function calculatePilotQualification(input: {
  lifecycleStatus: string;
  familyKey: string;
  hasProvenance: boolean;
  expertApproved: boolean;
  unresolvedConflictCount: number;
  shadowEvaluationCount: number;
  confidenceScore: number;
  evidenceCompleteness: number;
  constitutionalViolationCount: number;
  orderMutationCount: number;
  marMutationCount: number;
  chartMutationCount: number;
  evidenceStale: boolean;
  thresholds?: Partial<typeof PHASE17_QUALIFICATION_THRESHOLDS>;
}): {
  decision: Phase17QualificationDecision;
  limitations: string[];
  blockers: string[];
} {
  const t = { ...PHASE17_QUALIFICATION_THRESHOLDS, ...input.thresholds };
  const blockers: string[] = [];
  const limitations: string[] = [];

  if (t.requireLifecycleShadow && input.lifecycleStatus !== "SHADOW_RECOMMENDATION") {
    blockers.push("LIFECYCLE_NOT_SHADOW");
  }
  if (t.requireWave1Family && !isWave1RecommendationFamily(input.familyKey)) {
    blockers.push("NOT_WAVE1_OR_ACETAMINOPHEN");
  }
  if (t.requireProvenance && !input.hasProvenance) {
    blockers.push("MISSING_PROVENANCE");
  }
  if (t.requireExpertApproval && !input.expertApproved) {
    blockers.push("MISSING_EXPERT_APPROVAL");
  }
  if (input.unresolvedConflictCount > t.maxUnresolvedConflictCount) {
    blockers.push("UNRESOLVED_CONFLICTS");
  }
  if (input.shadowEvaluationCount < t.minShadowEvaluationCount) {
    blockers.push("INSUFFICIENT_SHADOW_EVALUATIONS");
  }
  if (input.confidenceScore < t.minConfidenceScore) {
    blockers.push("CONFIDENCE_BELOW_THRESHOLD");
  }
  if (input.evidenceCompleteness < t.minEvidenceCompleteness) {
    limitations.push("EVIDENCE_COMPLETENESS_LIMITED");
  }
  if (input.constitutionalViolationCount > t.maxConstitutionalViolationCount) {
    blockers.push("CONSTITUTIONAL_VIOLATIONS");
  }
  if (input.orderMutationCount > t.maxOrderMutationCount) {
    blockers.push("ORDER_MUTATIONS");
  }
  if (input.marMutationCount > t.maxMarMutationCount) {
    blockers.push("MAR_MUTATIONS");
  }
  if (input.chartMutationCount > t.maxChartMutationCount) {
    blockers.push("CHART_MUTATIONS");
  }
  if (input.evidenceStale) {
    blockers.push("STALE_EVIDENCE");
  }

  if (blockers.length > 0) {
    return {
      decision:
        blockers.includes("NOT_WAVE1_OR_ACETAMINOPHEN") ||
        blockers.includes("ORDER_MUTATIONS") ||
        blockers.includes("MAR_MUTATIONS") ||
        blockers.includes("CHART_MUTATIONS")
          ? "NOT_ELIGIBLE"
          : "CONTINUE_SHADOW_ONLY",
      limitations,
      blockers,
    };
  }

  if (limitations.length > 0) {
    return {
      decision: "PILOT_ELIGIBLE_WITH_LIMITATIONS",
      limitations,
      blockers,
    };
  }

  return { decision: "PILOT_ELIGIBLE", limitations, blockers };
}

export function assertPhase17SafetyDefaults(): void {
  assertPhase16NoWorkflowControl(
    PHASE17_RECOMMENDATION_DEFAULTS.knowledgeControlsPatientCare
  );
  assertPhase16NoClinicalActivation(
    PHASE17_RECOMMENDATION_DEFAULTS.clinicalActivationEnabled
  );
  assertPhase16NoOrderFromRecommendation(
    PHASE17_RECOMMENDATION_DEFAULTS.orderFromRecommendationEnabled
  );
  assertEnterpriseActivationBlocked(
    PHASE17_RECOMMENDATION_DEFAULTS.enterpriseActiveAllowed
  );
  assertNoBlockingBehavior(PHASE17_RECOMMENDATION_DEFAULTS.orderBlockingEnabled);
  assertPilotCanBeImmediatelySuspended(true);
  if (PHASE17_RECOMMENDATION_DEFAULTS.autoOrderEnabled) {
    throw new Error("Phase 17 forbids autoOrderEnabled.");
  }
  if (PHASE17_RECOMMENDATION_DEFAULTS.autoSelectEnabled) {
    throw new Error("Phase 17 forbids autoSelectEnabled.");
  }
}
