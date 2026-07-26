/**
 * MEDUI.D4B.7 — Enterprise Case Management, Social Work, Utilization Review,
 * and Discharge Planning (care-coordination platform).
 *
 * ONE governed coordination domain on D4B.1 lifecycle. Reuses D4B.6 care plans
 * as projections only — never rewrites them. CM / SW / UR remain distinct.
 * Planning/recommendation ≠ discharge authorization ≠ POE ≠ MAR ≠ diagnosis ≠
 * final disposition ≠ admission-status mutation. Assignment ≠ authorization.
 * InterQual/MCG = placeholders only. Readmission risk = transparent rules only
 * (no predictive AI). Sensitive SW content minimized on broad dashboards.
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentDiscipline,
  EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import { actorSnapshot } from "./enterpriseClinicalDocumentAuthorshipD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";

export const ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING.D4B7" as const;

export const ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING_CONTRACT_VERSION =
  "D4B.7" as const;

/* -------------------------------------------------------------------------- */
/* Hard authority invariants                                                  */
/* -------------------------------------------------------------------------- */

export const CARE_COORDINATION_AUTHORITY_INVARIANTS = {
  authorizesDischarge: false,
  mutatesFinalDisposition: false,
  createsProviderOrders: false,
  mutatesMar: false,
  mutatesDiagnosis: false,
  mutatesProblemList: false,
  mutatesAdmissionStatus: false,
  assignmentEqualsAuthorization: false,
  usesProprietaryInterQualOrMcg: false,
  usesPredictiveAi: false,
  rewritesD4b6CarePlans: false,
  independentSignatureEngine: false,
  usesD4b1DocumentLifecycle: true,
} as const;

export const CARE_COORDINATION_PROHIBITED_CAPABILITIES = [
  "discharge_authorize",
  "final_disposition_mutate",
  "provider_order_create",
  "provider_order_mutate",
  "mar_alter",
  "provider_diagnosis_author",
  "problem_list_mutate",
  "admission_status_mutate",
  "proprietary_interqual_mcg",
  "predictive_ai_readmission",
  "rewrite_d4b6_care_plan",
  "independent_signature_engine",
  "claims_billing_submit",
  "expose_full_sw_narrative_on_dashboard",
] as const;

export type CareCoordinationProhibitedCapability =
  (typeof CARE_COORDINATION_PROHIBITED_CAPABILITIES)[number];

export function isCareCoordinationCapabilityProhibited(capability: string): boolean {
  return (CARE_COORDINATION_PROHIBITED_CAPABILITIES as readonly string[]).includes(capability);
}

/* -------------------------------------------------------------------------- */
/* Role profiles (designations ≠ Prisma RoleCodes; assignment ≠ auth)         */
/* -------------------------------------------------------------------------- */

export type CareCoordinationRoleProfile =
  | "CASE_MANAGER"
  | "SOCIAL_WORKER"
  | "UTILIZATION_REVIEWER"
  | "NURSE_COORDINATION_LIMITED"
  | "PROVIDER_REVIEW_ONLY"
  | "SUPPORT_READ_ONLY";

export type CareCoordinationDiscipline =
  | "CASE_MANAGEMENT"
  | "SOCIAL_WORK"
  | "UTILIZATION_REVIEW"
  | "NURSING"
  | "PROVIDER"
  | "SHARED";

export type EnterpriseCareCoordinationCapabilityId =
  | "view_dashboard"
  | "open_episode"
  | "update_episode_status"
  | "document_cm_note"
  | "document_sw_note"
  | "document_ur_review"
  | "manage_barriers"
  | "plan_destination"
  | "track_referral_placement"
  | "plan_transition"
  | "plan_follow_up"
  | "record_family_participation"
  | "view_los_avoidable_delay"
  | "track_payer_authorization"
  | "assess_readmission_risk_rules"
  | "project_d4b6_readiness"
  | "view_discipline_projections"
  | "view_legacy_ops";

export type EnterpriseCareCoordinationCapabilityDefinition = {
  id: EnterpriseCareCoordinationCapabilityId;
  titleKey: string;
  defaultRoleProfiles: ReadonlyArray<CareCoordinationRoleProfile>;
  disciplineAttribution: CareCoordinationDiscipline;
  requiresFacilityPolicy: boolean;
  assignmentGrantsCapability: false;
  authorizesDischarge: false;
  createsProviderOrders: false;
};

function ccCap(
  id: EnterpriseCareCoordinationCapabilityId,
  titleKey: string,
  defaultRoleProfiles: ReadonlyArray<CareCoordinationRoleProfile>,
  disciplineAttribution: CareCoordinationDiscipline
): EnterpriseCareCoordinationCapabilityDefinition {
  return {
    id,
    titleKey,
    defaultRoleProfiles,
    disciplineAttribution,
    requiresFacilityPolicy: false,
    assignmentGrantsCapability: false,
    authorizesDischarge: false,
    createsProviderOrders: false,
  };
}

const ALL_PROFILES: CareCoordinationRoleProfile[] = [
  "CASE_MANAGER",
  "SOCIAL_WORKER",
  "UTILIZATION_REVIEWER",
  "NURSE_COORDINATION_LIMITED",
  "PROVIDER_REVIEW_ONLY",
  "SUPPORT_READ_ONLY",
];
const CM_SW: CareCoordinationRoleProfile[] = ["CASE_MANAGER", "SOCIAL_WORKER"];
const CM_ONLY: CareCoordinationRoleProfile[] = ["CASE_MANAGER"];
const SW_ONLY: CareCoordinationRoleProfile[] = ["SOCIAL_WORKER"];
const UR_ONLY: CareCoordinationRoleProfile[] = ["UTILIZATION_REVIEWER"];
const CM_SW_UR: CareCoordinationRoleProfile[] = [
  "CASE_MANAGER",
  "SOCIAL_WORKER",
  "UTILIZATION_REVIEWER",
];
const COORD_WRITE: CareCoordinationRoleProfile[] = [
  "CASE_MANAGER",
  "SOCIAL_WORKER",
  "UTILIZATION_REVIEWER",
  "NURSE_COORDINATION_LIMITED",
];

export const ENTERPRISE_CARE_COORDINATION_CAPABILITY_REGISTRY: ReadonlyArray<EnterpriseCareCoordinationCapabilityDefinition> =
  [
    ccCap(
      "view_dashboard",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.viewDashboard",
      ALL_PROFILES,
      "SHARED"
    ),
    ccCap(
      "open_episode",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.openEpisode",
      CM_SW_UR,
      "SHARED"
    ),
    ccCap(
      "update_episode_status",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.updateEpisode",
      CM_SW_UR,
      "SHARED"
    ),
    ccCap(
      "document_cm_note",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.documentCm",
      CM_ONLY,
      "CASE_MANAGEMENT"
    ),
    ccCap(
      "document_sw_note",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.documentSw",
      SW_ONLY,
      "SOCIAL_WORK"
    ),
    ccCap(
      "document_ur_review",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.documentUr",
      UR_ONLY,
      "UTILIZATION_REVIEW"
    ),
    ccCap(
      "manage_barriers",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.manageBarriers",
      CM_SW,
      "SHARED"
    ),
    ccCap(
      "plan_destination",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.planDestination",
      CM_SW,
      "CASE_MANAGEMENT"
    ),
    ccCap(
      "track_referral_placement",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.trackReferral",
      CM_SW,
      "CASE_MANAGEMENT"
    ),
    ccCap(
      "plan_transition",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.planTransition",
      CM_SW,
      "CASE_MANAGEMENT"
    ),
    ccCap(
      "plan_follow_up",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.planFollowUp",
      COORD_WRITE,
      "SHARED"
    ),
    ccCap(
      "record_family_participation",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.familyParticipation",
      CM_SW,
      "SOCIAL_WORK"
    ),
    ccCap(
      "view_los_avoidable_delay",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.viewLos",
      [...CM_SW_UR, "PROVIDER_REVIEW_ONLY", "NURSE_COORDINATION_LIMITED"],
      "UTILIZATION_REVIEW"
    ),
    ccCap(
      "track_payer_authorization",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.trackPayerAuth",
      [...UR_ONLY, "CASE_MANAGER"],
      "UTILIZATION_REVIEW"
    ),
    ccCap(
      "assess_readmission_risk_rules",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.assessRisk",
      COORD_WRITE,
      "CASE_MANAGEMENT"
    ),
    ccCap(
      "project_d4b6_readiness",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.projectD4b6",
      ALL_PROFILES,
      "SHARED"
    ),
    ccCap(
      "view_discipline_projections",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.viewProjections",
      ALL_PROFILES,
      "SHARED"
    ),
    ccCap(
      "view_legacy_ops",
      "enterpriseCaseManagementDischargePlanningD4b7.capabilities.viewLegacy",
      ALL_PROFILES,
      "SHARED"
    ),
  ];

export function isCareCoordinationCapabilityAllowedForProfile(
  capabilityId: EnterpriseCareCoordinationCapabilityId,
  roleProfile: CareCoordinationRoleProfile
): boolean {
  const def = ENTERPRISE_CARE_COORDINATION_CAPABILITY_REGISTRY.find((c) => c.id === capabilityId);
  if (!def) return false;
  return def.defaultRoleProfiles.includes(roleProfile);
}

/** Distinct CM / SW / UR capability profile snapshots (do not collapse attribution). */
export type DisciplineCapabilityProfile = {
  discipline: "CASE_MANAGEMENT" | "SOCIAL_WORK" | "UTILIZATION_REVIEW";
  roleProfile: CareCoordinationRoleProfile;
  allowedCapabilityIds: ReadonlyArray<EnterpriseCareCoordinationCapabilityId>;
  authorizesDischarge: false;
  createsProviderOrders: false;
  assignmentEqualsAuthorization: false;
};

export function buildDisciplineCapabilityProfiles(): ReadonlyArray<DisciplineCapabilityProfile> {
  const rows: Array<{
    discipline: DisciplineCapabilityProfile["discipline"];
    roleProfile: CareCoordinationRoleProfile;
  }> = [
    { discipline: "CASE_MANAGEMENT", roleProfile: "CASE_MANAGER" },
    { discipline: "SOCIAL_WORK", roleProfile: "SOCIAL_WORKER" },
    { discipline: "UTILIZATION_REVIEW", roleProfile: "UTILIZATION_REVIEWER" },
  ];
  return rows.map((r) => ({
    discipline: r.discipline,
    roleProfile: r.roleProfile,
    allowedCapabilityIds: ENTERPRISE_CARE_COORDINATION_CAPABILITY_REGISTRY.filter((c) =>
      c.defaultRoleProfiles.includes(r.roleProfile)
    ).map((c) => c.id),
    authorizesDischarge: false,
    createsProviderOrders: false,
    assignmentEqualsAuthorization: false,
  }));
}

export function resolveCareCoordinationRoleProfile(
  roleCodes: readonly string[] | null | undefined
): CareCoordinationRoleProfile {
  const codes = (roleCodes ?? []).map((c) => String(c).toUpperCase());
  if (codes.some((c) => c === "CM" || c === "CASE_MANAGER" || c.includes("CASE_MANAG"))) {
    return "CASE_MANAGER";
  }
  if (codes.some((c) => c === "SW" || c === "SOCIAL_WORK" || c.includes("SOCIAL"))) {
    return "SOCIAL_WORKER";
  }
  if (codes.some((c) => c === "UR" || c === "UTILIZATION" || c.includes("UTILIZATION"))) {
    return "UTILIZATION_REVIEWER";
  }
  if (codes.some((c) => c === "MD" || c === "DO" || c === "NP" || c === "PA" || c === "PROVIDER")) {
    return "PROVIDER_REVIEW_ONLY";
  }
  if (codes.some((c) => c === "RN" || c === "LPN" || c === "NURSE" || c === "ADMIN")) {
    return "NURSE_COORDINATION_LIMITED";
  }
  return "SUPPORT_READ_ONLY";
}

export function disciplineForRoleProfile(
  roleProfile: CareCoordinationRoleProfile
): CareCoordinationDiscipline {
  switch (roleProfile) {
    case "CASE_MANAGER":
      return "CASE_MANAGEMENT";
    case "SOCIAL_WORKER":
      return "SOCIAL_WORK";
    case "UTILIZATION_REVIEWER":
      return "UTILIZATION_REVIEW";
    case "NURSE_COORDINATION_LIMITED":
      return "NURSING";
    case "PROVIDER_REVIEW_ONLY":
      return "PROVIDER";
    default:
      return "SHARED";
  }
}

/* -------------------------------------------------------------------------- */
/* Taxonomies (curated MVP — not every enterprise feature)                    */
/* -------------------------------------------------------------------------- */

export const CARE_COORDINATION_BARRIER_IDS = [
  "housing_instability",
  "transportation",
  "caregiver_unavailable",
  "financial_coverage",
  "placement_delay",
  "durable_medical_equipment_pending",
  "home_health_pending",
  "behavioral_safety",
  "language_communication",
  "pending_consult",
  "pending_test_result",
  "patient_decline",
] as const;

export type CareCoordinationBarrierId = (typeof CARE_COORDINATION_BARRIER_IDS)[number];

export type CareCoordinationBarrierDefinition = {
  barrierId: CareCoordinationBarrierId;
  titleKey: string;
  typicalDisciplines: ReadonlyArray<"CASE_MANAGEMENT" | "SOCIAL_WORK" | "SHARED">;
  selectedInD4b7: true;
};

export const CARE_COORDINATION_BARRIER_REGISTRY: ReadonlyArray<CareCoordinationBarrierDefinition> =
  CARE_COORDINATION_BARRIER_IDS.map((barrierId) => ({
    barrierId,
    titleKey: `enterpriseCaseManagementDischargePlanningD4b7.barriers.${barrierId}`,
    typicalDisciplines:
      barrierId === "housing_instability" ||
      barrierId === "behavioral_safety" ||
      barrierId === "language_communication" ||
      barrierId === "caregiver_unavailable"
        ? (["SOCIAL_WORK", "SHARED"] as const)
        : (["CASE_MANAGEMENT", "SHARED"] as const),
    selectedInD4b7: true,
  }));

export const CARE_COORDINATION_DESTINATION_IDS = [
  "home",
  "home_with_home_health",
  "skilled_nursing_facility",
  "acute_rehab",
  "long_term_acute_care",
  "assisted_living",
  "shelter_or_temporary",
  "against_medical_advice_planning",
  "transfer_other_facility",
  "hospice_community",
  "undetermined",
] as const;

export type CareCoordinationDestinationId =
  (typeof CARE_COORDINATION_DESTINATION_IDS)[number];

export type CareCoordinationDestinationDefinition = {
  destinationId: CareCoordinationDestinationId;
  titleKey: string;
  isRecommendationNotAuthorization: true;
  selectedInD4b7: true;
};

export const CARE_COORDINATION_DESTINATION_REGISTRY: ReadonlyArray<CareCoordinationDestinationDefinition> =
  CARE_COORDINATION_DESTINATION_IDS.map((destinationId) => ({
    destinationId,
    titleKey: `enterpriseCaseManagementDischargePlanningD4b7.destinations.${destinationId}`,
    isRecommendationNotAuthorization: true,
    selectedInD4b7: true,
  }));

export const READMISSION_RISK_FACTOR_IDS = [
  "prior_admission_30d",
  "polypharmacy_flag",
  "incomplete_follow_up_plan",
  "unresolved_high_barrier",
  "limited_caregiver_support",
  "unstable_housing",
] as const;

export type ReadmissionRiskFactorId = (typeof READMISSION_RISK_FACTOR_IDS)[number];

export type ReadmissionRiskFactorDefinition = {
  factorId: ReadmissionRiskFactorId;
  titleKey: string;
  weight: number;
  transparentRule: true;
  usesPredictiveAi: false;
};

export const READMISSION_RISK_FACTOR_REGISTRY: ReadonlyArray<ReadmissionRiskFactorDefinition> = [
  {
    factorId: "prior_admission_30d",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.riskFactors.priorAdmission30d",
    weight: 3,
    transparentRule: true,
    usesPredictiveAi: false,
  },
  {
    factorId: "polypharmacy_flag",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.riskFactors.polypharmacyFlag",
    weight: 2,
    transparentRule: true,
    usesPredictiveAi: false,
  },
  {
    factorId: "incomplete_follow_up_plan",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.riskFactors.incompleteFollowUp",
    weight: 2,
    transparentRule: true,
    usesPredictiveAi: false,
  },
  {
    factorId: "unresolved_high_barrier",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.riskFactors.unresolvedBarrier",
    weight: 3,
    transparentRule: true,
    usesPredictiveAi: false,
  },
  {
    factorId: "limited_caregiver_support",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.riskFactors.limitedCaregiver",
    weight: 2,
    transparentRule: true,
    usesPredictiveAi: false,
  },
  {
    factorId: "unstable_housing",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.riskFactors.unstableHousing",
    weight: 2,
    transparentRule: true,
    usesPredictiveAi: false,
  },
];

export type ReadmissionRiskBand = "LOW" | "MODERATE" | "HIGH";

export type ReadmissionRiskAssessment = {
  kind: "READMISSION_RISK_RULES";
  activeFactorIds: ReadmissionRiskFactorId[];
  score: number;
  band: ReadmissionRiskBand;
  usesPredictiveAi: false;
  transparentRulesOnly: true;
  explanationKeys: string[];
};

export function assessReadmissionRiskRules(input: {
  activeFactorIds?: ReadonlyArray<ReadmissionRiskFactorId | string> | null;
}): ReadmissionRiskAssessment {
  const allowed = new Set<string>(READMISSION_RISK_FACTOR_IDS);
  const active = [...new Set((input.activeFactorIds ?? []).map(String))].filter((id) =>
    allowed.has(id)
  ) as ReadmissionRiskFactorId[];
  const score = active.reduce((sum, id) => {
    const def = READMISSION_RISK_FACTOR_REGISTRY.find((f) => f.factorId === id);
    return sum + (def?.weight ?? 0);
  }, 0);
  const band: ReadmissionRiskBand = score >= 6 ? "HIGH" : score >= 3 ? "MODERATE" : "LOW";
  return {
    kind: "READMISSION_RISK_RULES",
    activeFactorIds: active,
    score,
    band,
    usesPredictiveAi: false,
    transparentRulesOnly: true,
    explanationKeys: active.map(
      (id) => READMISSION_RISK_FACTOR_REGISTRY.find((f) => f.factorId === id)!.titleKey
    ),
  };
}

export const UR_CRITERIA_SOURCE_IDS = [
  "FACILITY_POLICY",
  "CLINICAL_DOCUMENTATION_REVIEW",
  "PLACEHOLDER_CRITERIA_LIBRARY",
] as const;

export type UrCriteriaSourceId = (typeof UR_CRITERIA_SOURCE_IDS)[number];

export type UrCriteriaSourceDefinition = {
  sourceId: UrCriteriaSourceId;
  titleKey: string;
  isProprietaryInterQualOrMcg: false;
  isPlaceholder: boolean;
};

export const UR_CRITERIA_SOURCE_REGISTRY: ReadonlyArray<UrCriteriaSourceDefinition> = [
  {
    sourceId: "FACILITY_POLICY",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.urCriteria.facilityPolicy",
    isProprietaryInterQualOrMcg: false,
    isPlaceholder: false,
  },
  {
    sourceId: "CLINICAL_DOCUMENTATION_REVIEW",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.urCriteria.clinicalDocumentation",
    isProprietaryInterQualOrMcg: false,
    isPlaceholder: false,
  },
  {
    sourceId: "PLACEHOLDER_CRITERIA_LIBRARY",
    titleKey: "enterpriseCaseManagementDischargePlanningD4b7.urCriteria.placeholderLibrary",
    isProprietaryInterQualOrMcg: false,
    isPlaceholder: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Care-coordination episode adapter                                          */
/* -------------------------------------------------------------------------- */

export const CARE_COORDINATION_EPISODE_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_PLACEMENT",
  "PENDING_AUTHORIZATION",
  "READY_FOR_TRANSITION_REVIEW",
  "CLOSED_COORDINATION",
  "ENTERED_IN_ERROR",
] as const;

export type CareCoordinationEpisodeStatus =
  (typeof CARE_COORDINATION_EPISODE_STATUSES)[number];

export type CareCoordinationBarrierInstance = {
  instanceId: string;
  barrierId: CareCoordinationBarrierId;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DEFERRED";
  owningDiscipline: "CASE_MANAGEMENT" | "SOCIAL_WORK" | "SHARED";
  notesSummary: string | null;
  /** Full narrative never placed on broad dashboards. */
  sensitiveDetailSuppressed: true;
  updatedAt: string;
};

export type CareCoordinationDestinationPlan = {
  destinationId: CareCoordinationDestinationId;
  status: "PROPOSED" | "IN_PROGRESS" | "CONFIRMED_PLAN" | "CHANGED";
  isRecommendationNotAuthorization: true;
  authorizesDischarge: false;
  notesSummary: string | null;
  updatedAt: string;
};

export type CareCoordinationReferralPlacement = {
  referralId: string;
  destinationId: CareCoordinationDestinationId | null;
  facilityName: string | null;
  status: "REQUESTED" | "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  isNotFinalDisposition: true;
  updatedAt: string;
};

export type CareCoordinationTransitionPlan = {
  summary: string | null;
  followUpNeeded: boolean;
  caregiverInvolved: boolean;
  isNotDischargeAuthorization: true;
  updatedAt: string;
};

export type CareCoordinationFollowUpPlan = {
  summary: string | null;
  scheduledHint: string | null;
  isNotProviderOrder: true;
  updatedAt: string;
};

export type CareCoordinationFamilyParticipation = {
  participantsSummary: string | null;
  educationProvided: boolean;
  consentOrPreferenceNoted: boolean;
  sensitiveDetailSuppressed: true;
  updatedAt: string;
};

export type PayerAuthorizationTracking = {
  trackingId: string;
  payerLabel: string | null;
  authStatus: "NOT_STARTED" | "PENDING" | "APPROVED" | "DENIED" | "NOT_APPLICABLE";
  criteriaSourceId: UrCriteriaSourceId;
  usesProprietaryInterQualOrMcg: false;
  isNotClaimsSubmission: true;
  notesSummary: string | null;
  updatedAt: string;
};

export type LosAvoidableDelayView = {
  kind: "LOS_AVOIDABLE_DELAY_VIEW";
  encounterOpenedAt: string | null;
  elapsedHours: number | null;
  /** Never invent expected LOS when unknown. */
  expectedLosHours: null;
  expectedLosInvented: false;
  avoidableDelayBarrierIds: CareCoordinationBarrierId[];
  notesSummary: string | null;
};

export type CareCoordinationEpisode = {
  episodeId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  status: CareCoordinationEpisodeStatus;
  openedAt: string;
  openedByUserId: string;
  primaryDiscipline: "CASE_MANAGEMENT" | "SOCIAL_WORK" | "UTILIZATION_REVIEW" | "SHARED";
  assignedCaseManagerUserId: string | null;
  assignedSocialWorkerUserId: string | null;
  assignedUrReviewerUserId: string | null;
  assignmentEqualsAuthorization: false;
  authorizesDischarge: false;
  mutatesFinalDisposition: false;
  createsProviderOrders: false;
  mutatesMar: false;
  mutatesDiagnosis: false;
  mutatesProblemList: false;
  mutatesAdmissionStatus: false;
  usesProprietaryInterQualOrMcg: false;
  usesPredictiveAi: false;
  rewritesD4b6CarePlans: false;
  barriers: CareCoordinationBarrierInstance[];
  destinationPlan: CareCoordinationDestinationPlan | null;
  referrals: CareCoordinationReferralPlacement[];
  transitionPlan: CareCoordinationTransitionPlan | null;
  followUpPlan: CareCoordinationFollowUpPlan | null;
  familyParticipation: CareCoordinationFamilyParticipation | null;
  payerAuthTracking: PayerAuthorizationTracking[];
  losView: LosAvoidableDelayView | null;
  readmissionRisk: ReadmissionRiskAssessment | null;
  usesD4b1DocumentLifecycle: true;
};

export function openCareCoordinationEpisode(input: {
  episodeId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  openedByUserId: string;
  openedAt: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile: CareCoordinationRoleProfile;
  primaryDiscipline?: CareCoordinationEpisode["primaryDiscipline"];
}): { accepted: boolean; reason: string; episode: CareCoordinationEpisode | null } {
  if (input.careSetting === "EMERGENCY") {
    return { accepted: false, reason: "ED_LIMITED", episode: null };
  }
  if (
    !isCareCoordinationCapabilityAllowedForProfile("open_episode", input.roleProfile)
  ) {
    return { accepted: false, reason: "CAPABILITY_DENIED", episode: null };
  }
  const resolved = input.primaryDiscipline ?? disciplineForRoleProfile(input.roleProfile);
  const primary: CareCoordinationEpisode["primaryDiscipline"] =
    resolved === "CASE_MANAGEMENT" ||
    resolved === "SOCIAL_WORK" ||
    resolved === "UTILIZATION_REVIEW" ||
    resolved === "SHARED"
      ? resolved === "SHARED"
        ? "CASE_MANAGEMENT"
        : resolved
      : "SHARED";
  const episode: CareCoordinationEpisode = {
    episodeId: input.episodeId,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    status: "OPEN",
    openedAt: input.openedAt,
    openedByUserId: input.openedByUserId,
    primaryDiscipline: primary,
    assignedCaseManagerUserId:
      input.roleProfile === "CASE_MANAGER" ? input.openedByUserId : null,
    assignedSocialWorkerUserId:
      input.roleProfile === "SOCIAL_WORKER" ? input.openedByUserId : null,
    assignedUrReviewerUserId:
      input.roleProfile === "UTILIZATION_REVIEWER" ? input.openedByUserId : null,
    assignmentEqualsAuthorization: false,
    authorizesDischarge: false,
    mutatesFinalDisposition: false,
    createsProviderOrders: false,
    mutatesMar: false,
    mutatesDiagnosis: false,
    mutatesProblemList: false,
    mutatesAdmissionStatus: false,
    usesProprietaryInterQualOrMcg: false,
    usesPredictiveAi: false,
    rewritesD4b6CarePlans: false,
    barriers: [],
    destinationPlan: null,
    referrals: [],
    transitionPlan: null,
    followUpPlan: null,
    familyParticipation: null,
    payerAuthTracking: [],
    losView: null,
    readmissionRisk: null,
    usesD4b1DocumentLifecycle: true,
  };
  return { accepted: true, reason: "OK", episode };
}

export function upsertBarrierOnEpisode(input: {
  episode: CareCoordinationEpisode;
  instanceId: string;
  barrierId: CareCoordinationBarrierId;
  status: CareCoordinationBarrierInstance["status"];
  owningDiscipline: CareCoordinationBarrierInstance["owningDiscipline"];
  notesSummary?: string | null;
  updatedAt: string;
  roleProfile: CareCoordinationRoleProfile;
}): { accepted: boolean; reason: string; episode: CareCoordinationEpisode | null } {
  if (!isCareCoordinationCapabilityAllowedForProfile("manage_barriers", input.roleProfile)) {
    return { accepted: false, reason: "CAPABILITY_DENIED", episode: null };
  }
  if (!CARE_COORDINATION_BARRIER_IDS.includes(input.barrierId)) {
    return { accepted: false, reason: "UNKNOWN_BARRIER", episode: null };
  }
  const next: CareCoordinationBarrierInstance = {
    instanceId: input.instanceId,
    barrierId: input.barrierId,
    status: input.status,
    owningDiscipline: input.owningDiscipline,
    notesSummary: input.notesSummary ?? null,
    sensitiveDetailSuppressed: true,
    updatedAt: input.updatedAt,
  };
  const others = input.episode.barriers.filter((b) => b.instanceId !== input.instanceId);
  return {
    accepted: true,
    reason: "OK",
    episode: { ...input.episode, barriers: [...others, next], status: "IN_PROGRESS" },
  };
}

export function planDestinationOnEpisode(input: {
  episode: CareCoordinationEpisode;
  destinationId: CareCoordinationDestinationId;
  status?: CareCoordinationDestinationPlan["status"];
  notesSummary?: string | null;
  updatedAt: string;
  roleProfile: CareCoordinationRoleProfile;
  /** Must never flip true via this adapter. */
  authorizeDischarge?: boolean;
}): { accepted: boolean; reason: string; episode: CareCoordinationEpisode | null } {
  if (!isCareCoordinationCapabilityAllowedForProfile("plan_destination", input.roleProfile)) {
    return { accepted: false, reason: "CAPABILITY_DENIED", episode: null };
  }
  if (input.authorizeDischarge === true) {
    return { accepted: false, reason: "DISCHARGE_AUTH_FORBIDDEN", episode: null };
  }
  if (!CARE_COORDINATION_DESTINATION_IDS.includes(input.destinationId)) {
    return { accepted: false, reason: "UNKNOWN_DESTINATION", episode: null };
  }
  return {
    accepted: true,
    reason: "OK",
    episode: {
      ...input.episode,
      status: "IN_PROGRESS",
      destinationPlan: {
        destinationId: input.destinationId,
        status: input.status ?? "PROPOSED",
        isRecommendationNotAuthorization: true,
        authorizesDischarge: false,
        notesSummary: input.notesSummary ?? null,
        updatedAt: input.updatedAt,
      },
    },
  };
}

export function buildLosAvoidableDelayView(input: {
  encounterOpenedAt?: string | null;
  nowIso?: string | null;
  openBarrierIds?: ReadonlyArray<CareCoordinationBarrierId>;
  notesSummary?: string | null;
  /** Reject invented expected LOS. */
  inventedExpectedLosHours?: number | null;
}): LosAvoidableDelayView {
  void input.inventedExpectedLosHours;
  let elapsedHours: number | null = null;
  if (input.encounterOpenedAt && input.nowIso) {
    const opened = Date.parse(input.encounterOpenedAt);
    const now = Date.parse(input.nowIso);
    if (Number.isFinite(opened) && Number.isFinite(now) && now >= opened) {
      elapsedHours = Math.round(((now - opened) / 36e5) * 10) / 10;
    }
  }
  return {
    kind: "LOS_AVOIDABLE_DELAY_VIEW",
    encounterOpenedAt: input.encounterOpenedAt ?? null,
    elapsedHours,
    expectedLosHours: null,
    expectedLosInvented: false,
    avoidableDelayBarrierIds: [...(input.openBarrierIds ?? [])],
    notesSummary: input.notesSummary ?? null,
  };
}

export function trackPayerAuthorization(input: {
  trackingId: string;
  payerLabel?: string | null;
  authStatus: PayerAuthorizationTracking["authStatus"];
  criteriaSourceId: UrCriteriaSourceId;
  notesSummary?: string | null;
  updatedAt: string;
  /** Reject proprietary engines. */
  usesProprietaryInterQualOrMcg?: boolean;
}): { accepted: boolean; reason: string; tracking: PayerAuthorizationTracking | null } {
  if (input.usesProprietaryInterQualOrMcg === true) {
    return { accepted: false, reason: "PROPRIETARY_CRITERIA_FORBIDDEN", tracking: null };
  }
  if (!UR_CRITERIA_SOURCE_IDS.includes(input.criteriaSourceId)) {
    return { accepted: false, reason: "UNKNOWN_CRITERIA_SOURCE", tracking: null };
  }
  return {
    accepted: true,
    reason: "OK",
    tracking: {
      trackingId: input.trackingId,
      payerLabel: input.payerLabel ?? null,
      authStatus: input.authStatus,
      criteriaSourceId: input.criteriaSourceId,
      usesProprietaryInterQualOrMcg: false,
      isNotClaimsSubmission: true,
      notesSummary: input.notesSummary ?? null,
      updatedAt: input.updatedAt,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Workspace sections                                                         */
/* -------------------------------------------------------------------------- */

export type EnterpriseCareCoordinationWorkspaceSectionId =
  | "overview"
  | "episode"
  | "caseManagement"
  | "socialWork"
  | "utilizationReview"
  | "barriers"
  | "destinationPlanning"
  | "referralsPlacement"
  | "transitionPlanning"
  | "followUp"
  | "familyParticipation"
  | "losAvoidableDelay"
  | "payerAuthorization"
  | "readmissionRisk"
  | "interdisciplinaryReadiness"
  | "nursingProjection"
  | "rtProjection"
  | "rehabProjection"
  | "techProjection"
  | "carePlanProjection"
  | "legacyOps"
  | "deferredBoundaries";

export type CareCoordinationSectionMode =
  | "WORKFLOW"
  | "PROJECTION"
  | "LEGACY"
  | "DEFERRED"
  | "ED_LIMITED";

export type EnterpriseCareCoordinationWorkspaceSectionDefinition = {
  id: EnterpriseCareCoordinationWorkspaceSectionId;
  titleKey: string;
  mode: CareCoordinationSectionMode;
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  requiredCapability: EnterpriseCareCoordinationCapabilityId | null;
  /** SW sections never dump full narratives on dashboards. */
  suppressesSensitiveNarratives: boolean;
};

export const ENTERPRISE_CARE_COORDINATION_WORKSPACE_SECTIONS: ReadonlyArray<EnterpriseCareCoordinationWorkspaceSectionDefinition> =
  [
    {
      id: "overview",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.overview",
      mode: "WORKFLOW",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: null,
      suppressesSensitiveNarratives: true,
    },
    {
      id: "episode",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.episode",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "open_episode",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "caseManagement",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.caseManagement",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "document_cm_note",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "socialWork",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.socialWork",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "document_sw_note",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "utilizationReview",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.utilizationReview",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "document_ur_review",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "barriers",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.barriers",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "manage_barriers",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "destinationPlanning",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.destinationPlanning",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "plan_destination",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "referralsPlacement",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.referralsPlacement",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "track_referral_placement",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "transitionPlanning",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.transitionPlanning",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "plan_transition",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "followUp",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.followUp",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "plan_follow_up",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "familyParticipation",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.familyParticipation",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "record_family_participation",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "losAvoidableDelay",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.losAvoidableDelay",
      mode: "WORKFLOW",
      allowedCareSettings: ["INPATIENT", "OBSERVATION"],
      requiredCapability: "view_los_avoidable_delay",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "payerAuthorization",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.payerAuthorization",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "track_payer_authorization",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "readmissionRisk",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.readmissionRisk",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "assess_readmission_risk_rules",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "interdisciplinaryReadiness",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.interdisciplinaryReadiness",
      mode: "PROJECTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: "project_d4b6_readiness",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "nursingProjection",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.nursingProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: "view_discipline_projections",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "rtProjection",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.rtProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: "view_discipline_projections",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "rehabProjection",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.rehabProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: "view_discipline_projections",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "techProjection",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.techProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "view_discipline_projections",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "carePlanProjection",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.carePlanProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: "project_d4b6_readiness",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "legacyOps",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.legacyOps",
      mode: "LEGACY",
      allowedCareSettings: ["INPATIENT"],
      requiredCapability: "view_legacy_ops",
      suppressesSensitiveNarratives: true,
    },
    {
      id: "deferredBoundaries",
      titleKey: "enterpriseCaseManagementDischargePlanningD4b7.sections.deferredBoundaries",
      mode: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: null,
      suppressesSensitiveNarratives: true,
    },
  ];

export function resolveCareCoordinationWorkspaceSection(
  id: string
): EnterpriseCareCoordinationWorkspaceSectionId | null {
  const hit = ENTERPRISE_CARE_COORDINATION_WORKSPACE_SECTIONS.find((s) => s.id === id);
  return hit?.id ?? null;
}

export function careCoordinationWorkspaceSectionsForCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT",
  opts?: { roleProfile?: CareCoordinationRoleProfile; includeDeferred?: boolean }
): EnterpriseCareCoordinationWorkspaceSectionDefinition[] {
  const roleProfile = opts?.roleProfile ?? "CASE_MANAGER";
  const includeDeferred = opts?.includeDeferred ?? true;
  return ENTERPRISE_CARE_COORDINATION_WORKSPACE_SECTIONS.filter((s) => {
    if (!s.allowedCareSettings.includes(careSetting)) return false;
    if (s.mode === "DEFERRED" && !includeDeferred) return false;
    if (
      careSetting === "EMERGENCY" &&
      s.mode === "WORKFLOW" &&
      s.id !== "overview"
    ) {
      return false;
    }
    if (
      s.requiredCapability &&
      !isCareCoordinationCapabilityAllowedForProfile(s.requiredCapability, roleProfile)
    ) {
      return roleProfile === "SUPPORT_READ_ONLY" || roleProfile === "PROVIDER_REVIEW_ONLY"
        ? s.mode === "PROJECTION" || s.id === "overview" || s.id === "interdisciplinaryReadiness"
        : s.mode === "PROJECTION" || s.id === "overview";
    }
    return true;
  }).map((s) =>
    careSetting === "EMERGENCY" &&
    (s.id === "overview" ||
      s.id === "interdisciplinaryReadiness" ||
      s.id === "carePlanProjection" ||
      s.mode === "PROJECTION")
      ? { ...s, mode: "ED_LIMITED" as const }
      : s
  );
}

export function classifyEncounterTypeToCareCoordinationCareSetting(
  encounterType: string | null | undefined
): "EMERGENCY" | "OBSERVATION" | "INPATIENT" {
  const t = String(encounterType ?? "").toUpperCase();
  if (t === "ER" || t === "ED" || t === "EMERGENCY") return "EMERGENCY";
  if (t === "OBSERVATION" || t === "OBS") return "OBSERVATION";
  return "INPATIENT";
}

/* -------------------------------------------------------------------------- */
/* Projections (D4B.2–6 + legacy) — compose, never overwrite                  */
/* -------------------------------------------------------------------------- */

export type NursingCoordinationProjection = {
  kind: "NURSING_COORDINATION_PROJECTION";
  encounterId: string;
  readinessSummary: string | null;
  authorUserId: string | null;
  recordedAt: string | null;
  isNursingAuthored: true;
  careCoordinationMustNotOverwrite: true;
  isNotDischargeAuthorization: true;
};

export function projectNursingCoordination(input: {
  encounterId: string;
  entries?: ReadonlyArray<{
    readinessSummary?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
}): NursingCoordinationProjection[] {
  return (input.entries ?? []).map((e) => ({
    kind: "NURSING_COORDINATION_PROJECTION" as const,
    encounterId: input.encounterId,
    readinessSummary: e.readinessSummary ?? null,
    authorUserId: e.authorUserId ?? null,
    recordedAt: e.recordedAt ?? null,
    isNursingAuthored: true,
    careCoordinationMustNotOverwrite: true,
    isNotDischargeAuthorization: true,
  }));
}

export type RtCoordinationProjection = {
  kind: "RT_COORDINATION_PROJECTION";
  encounterId: string;
  documentTypeId: string | null;
  summaryText: string | null;
  authorUserId: string | null;
  recordedAt: string | null;
  isRtAuthored: true;
  recommendationIsNotAuthorization: true;
  careCoordinationMustNotOverwrite: true;
};

export function projectRtCoordination(input: {
  encounterId: string;
  entries?: ReadonlyArray<{
    documentTypeId?: string | null;
    summaryText?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
}): RtCoordinationProjection[] {
  return (input.entries ?? []).map((e) => ({
    kind: "RT_COORDINATION_PROJECTION" as const,
    encounterId: input.encounterId,
    documentTypeId: e.documentTypeId ?? "rt.discharge_recommendation",
    summaryText: e.summaryText ?? null,
    authorUserId: e.authorUserId ?? null,
    recordedAt: e.recordedAt ?? null,
    isRtAuthored: true,
    recommendationIsNotAuthorization: true,
    careCoordinationMustNotOverwrite: true,
  }));
}

export type RehabCoordinationProjection = {
  kind: "REHAB_COORDINATION_PROJECTION";
  encounterId: string;
  discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
  documentTypeId: string | null;
  summaryText: string | null;
  authorUserId: string | null;
  recordedAt: string | null;
  recommendationIsNotAuthorization: true;
  careCoordinationMustNotOverwrite: true;
};

export function projectRehabCoordination(input: {
  encounterId: string;
  entries?: ReadonlyArray<{
    discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
    documentTypeId?: string | null;
    summaryText?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
}): RehabCoordinationProjection[] {
  return (input.entries ?? []).map((e) => ({
    kind: "REHAB_COORDINATION_PROJECTION" as const,
    encounterId: input.encounterId,
    discipline: e.discipline,
    documentTypeId: e.documentTypeId ?? null,
    summaryText: e.summaryText ?? null,
    authorUserId: e.authorUserId ?? null,
    recordedAt: e.recordedAt ?? null,
    recommendationIsNotAuthorization: true,
    careCoordinationMustNotOverwrite: true,
  }));
}

export type TechCoordinationProjection = {
  kind: "TECH_COORDINATION_PROJECTION";
  encounterId: string;
  activityId: string | null;
  performerUserId: string | null;
  completedAt: string | null;
  isTechnicianAuthored: true;
  careCoordinationMustNotOverwrite: true;
};

export function projectTechCoordination(input: {
  encounterId: string;
  tasks?: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    completedAt?: string | null;
  }>;
}): TechCoordinationProjection[] {
  return (input.tasks ?? []).map((t) => ({
    kind: "TECH_COORDINATION_PROJECTION" as const,
    encounterId: input.encounterId,
    activityId: t.activityId ?? null,
    performerUserId: t.performerUserId ?? null,
    completedAt: t.completedAt ?? null,
    isTechnicianAuthored: true,
    careCoordinationMustNotOverwrite: true,
  }));
}

export type D4b6CarePlanCoordinationProjection = {
  kind: "D4B6_CARE_PLAN_COORDINATION_PROJECTION";
  encounterId: string;
  planId: string | null;
  templateId: string | null;
  lifecycleState: string | null;
  readinessHint: string | null;
  rewritesD4b6CarePlans: false;
  isProjectionOnly: true;
  readinessIsNotAuthorization: true;
};

export function projectD4b6CarePlanCoordination(input: {
  encounterId: string;
  plans?: ReadonlyArray<{
    planId?: string | null;
    templateId?: string | null;
    lifecycleState?: string | null;
    readinessHint?: string | null;
  }>;
}): D4b6CarePlanCoordinationProjection[] {
  return (input.plans ?? []).map((p) => ({
    kind: "D4B6_CARE_PLAN_COORDINATION_PROJECTION" as const,
    encounterId: input.encounterId,
    planId: p.planId ?? null,
    templateId: p.templateId ?? null,
    lifecycleState: p.lifecycleState ?? null,
    readinessHint: p.readinessHint ?? null,
    rewritesD4b6CarePlans: false,
    isProjectionOnly: true,
    readinessIsNotAuthorization: true,
  }));
}

export type LegacyDischargeOpsProjection = {
  kind: "LEGACY_DISCHARGE_OPS_PROJECTION";
  encounterId: string;
  workflowState: string | null;
  destination: string | null;
  barriersText: string | null;
  anticipatedDischargeDate: string | null;
  isLegacyStub: true;
  isNotAuthoritativeCoordinationEngine: true;
  authorizesDischarge: false;
};

export function projectLegacyDischargeOps(input: {
  encounterId: string;
  ops?: {
    workflowState?: string | null;
    destination?: string | null;
    barriers?: string | null;
    anticipatedDischargeDate?: string | null;
  } | null;
}): LegacyDischargeOpsProjection[] {
  if (!input.ops) return [];
  return [
    {
      kind: "LEGACY_DISCHARGE_OPS_PROJECTION" as const,
      encounterId: input.encounterId,
      workflowState: input.ops.workflowState ?? null,
      destination: input.ops.destination ?? null,
      barriersText: input.ops.barriers ?? null,
      anticipatedDischargeDate: input.ops.anticipatedDischargeDate ?? null,
      isLegacyStub: true,
      isNotAuthoritativeCoordinationEngine: true,
      authorizesDischarge: false,
    },
  ];
}

export type InterdisciplinaryReadinessProjection = {
  kind: "INTERDISCIPLINARY_READINESS_PROJECTION";
  encounterId: string;
  nursingReadyHint: boolean;
  rtRecommendationPresent: boolean;
  rehabRecommendationPresent: boolean;
  carePlanDischargeReadinessPresent: boolean;
  openBarrierCount: number;
  destinationProposed: boolean;
  readinessIsNotAuthorization: true;
  authorizesDischarge: false;
};

export function projectInterdisciplinaryReadiness(input: {
  encounterId: string;
  nursingCount?: number;
  rtCount?: number;
  rehabCount?: number;
  carePlanReadinessCount?: number;
  openBarrierCount?: number;
  destinationProposed?: boolean;
}): InterdisciplinaryReadinessProjection {
  return {
    kind: "INTERDISCIPLINARY_READINESS_PROJECTION",
    encounterId: input.encounterId,
    nursingReadyHint: (input.nursingCount ?? 0) > 0,
    rtRecommendationPresent: (input.rtCount ?? 0) > 0,
    rehabRecommendationPresent: (input.rehabCount ?? 0) > 0,
    carePlanDischargeReadinessPresent: (input.carePlanReadinessCount ?? 0) > 0,
    openBarrierCount: input.openBarrierCount ?? 0,
    destinationProposed: !!input.destinationProposed,
    readinessIsNotAuthorization: true,
    authorizesDischarge: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Boundary helpers                                                           */
/* -------------------------------------------------------------------------- */

export function distinguishPlanningFromDischargeAuthorization(input: {
  destinationProposed?: boolean;
  dischargeAuthorized?: boolean;
}): {
  planningIsNotAuthorization: true;
  authorizesDischarge: false;
  dischargeAuthorizedElsewhere: boolean;
} {
  return {
    planningIsNotAuthorization: true,
    authorizesDischarge: false,
    dischargeAuthorizedElsewhere: !!input.dischargeAuthorized,
  };
}

export function distinguishAssignmentFromAuthorization(input: {
  assignedUserId?: string | null;
}): {
  assignmentEqualsAuthorization: false;
  hasAssignee: boolean;
} {
  return {
    assignmentEqualsAuthorization: false,
    hasAssignee: !!String(input.assignedUserId ?? "").trim(),
  };
}

export function distinguishUrPlaceholderFromProprietaryCriteria(input: {
  criteriaSourceId?: UrCriteriaSourceId | string | null;
}): {
  usesProprietaryInterQualOrMcg: false;
  isPlaceholderLibrary: boolean;
} {
  return {
    usesProprietaryInterQualOrMcg: false,
    isPlaceholderLibrary: input.criteriaSourceId === "PLACEHOLDER_CRITERIA_LIBRARY",
  };
}

export function suppressSensitiveSocialWorkOnDashboard(input: {
  fullNarrative?: string | null;
  statusLabel?: string | null;
  barrierCodes?: ReadonlyArray<string>;
}): {
  dashboardSafe: { statusLabel: string | null; barrierCodes: string[] };
  fullNarrativeExposed: false;
  sensitiveDetailSuppressed: true;
} {
  void input.fullNarrative;
  return {
    dashboardSafe: {
      statusLabel: input.statusLabel ?? null,
      barrierCodes: [...(input.barrierCodes ?? [])],
    },
    fullNarrativeExposed: false,
    sensitiveDetailSuppressed: true,
  };
}

export function d4b6CarePlansNotRewrittenByCoordination(input: {
  sourcePlanLifecycleState: string;
  coordinationEditorUserId: string;
  storedPlanLifecycleState: string;
}): boolean {
  void input.coordinationEditorUserId;
  return input.storedPlanLifecycleState === input.sourcePlanLifecycleState;
}

/* -------------------------------------------------------------------------- */
/* D4B.1 virtual document adapters                                            */
/* -------------------------------------------------------------------------- */

export const CARE_COORDINATION_DOCUMENT_TYPE_IDS = [
  "cm.initial_assessment",
  "cm.progress_note",
  "cm.discharge_planning_note",
  "sw.psychosocial_assessment",
  "sw.progress_note",
  "sw.barrier_note",
  "ur.admission_review",
  "ur.continued_stay_review",
  "ur.medical_necessity_documentation",
  "care_coord.transition_plan",
  "care_coord.readiness_projection",
] as const;

export type CareCoordinationDocumentTypeId =
  (typeof CARE_COORDINATION_DOCUMENT_TYPE_IDS)[number];

const SENSITIVE_SW_TYPES = new Set<string>([
  "sw.psychosocial_assessment",
  "sw.progress_note",
]);

export function adaptCareCoordinationVirtualDocument(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  documentId: string;
  documentTypeId: CareCoordinationDocumentTypeId | string;
  body: string;
  authorUserId: string;
  authorDisplayName?: string | null;
  createdAt: string;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  discipline?: EnterpriseClinicalDocumentDiscipline;
  structuredPayload?: Record<string, unknown>;
}): EnterpriseClinicalDocument {
  const discipline: EnterpriseClinicalDocumentDiscipline =
    input.discipline ??
    (String(input.documentTypeId).startsWith("sw.")
      ? "SOCIAL_WORK"
      : String(input.documentTypeId).startsWith("ur.")
        ? "UTILIZATION_REVIEW"
        : String(input.documentTypeId).startsWith("cm.")
          ? "CASE_MANAGEMENT"
          : "CASE_MANAGEMENT");
  const author = actorSnapshot(input.authorUserId, input.authorDisplayName, discipline);
  const sensitive = SENSITIVE_SW_TYPES.has(String(input.documentTypeId));
  const lifecycleState: EnterpriseClinicalDocumentLifecycleState = "SIGNED";
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: input.documentId,
    sourceArchitecture: "REFERENCE_VIRTUAL",
    patientId: input.patientId,
    encounterId: input.encounterId,
    hospitalEpisodeId: null,
    facilityId: input.facilityId,
    careSetting: input.careSetting ?? "UNKNOWN",
    discipline,
    documentTypeId: input.documentTypeId,
    templateVersion: "D4B.7",
    creator: author,
    author,
    responsibleSigner: author,
    cosigner: null,
    currentAssignedClinicianUserId: null,
    createdAt: input.createdAt,
    serviceAt: input.createdAt,
    lastEditedAt: input.createdAt,
    signedAt: input.createdAt,
    amendedAt: null,
    lifecycleState,
    structured: {
      schemaId: input.documentTypeId,
      schemaVersion: "D4B.7",
      payload: {
        ...CARE_COORDINATION_AUTHORITY_INVARIANTS,
        sensitiveSocialWorkContent: sensitive,
        suppressFullNarrativeOnDashboard: sensitive,
        ...(input.structuredPayload ?? {}),
      },
    },
    narrative: {
      sections: [
        {
          key: "body",
          title: "Note",
          text: sensitive ? "[SENSITIVE — full narrative restricted on dashboards]" : input.body,
          lateEntry: false,
        },
      ],
    },
    validation: { fieldValid: true, issues: [] },
    completeness: {
      clinicallyComplete: true,
      signatureReady: true,
      missingIndicators: [],
      acknowledgedExceptions: [],
    },
    lineage: {
      priorVersionId: null,
      currentVersionId: input.documentId,
      supersedesId: null,
      amendedFromId: null,
      amendmentReason: null,
      correctionReason: null,
      lateEntryLabeled: false,
    },
    legalRecordVisible: !sensitive,
    printExportEligible: !sensitive,
    enteredInError: false,
    voided: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Workspace summary                                                          */
/* -------------------------------------------------------------------------- */

export type EnterpriseCaseManagementDischargePlanningSummary = {
  certificationId: typeof ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING_CERTIFICATION_ID;
  contractVersion: typeof ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING_CONTRACT_VERSION;
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile: CareCoordinationRoleProfile;
  authorizesDischarge: false;
  mutatesFinalDisposition: false;
  createsProviderOrders: false;
  mutatesMar: false;
  mutatesDiagnosis: false;
  mutatesProblemList: false;
  mutatesAdmissionStatus: false;
  assignmentEqualsAuthorization: false;
  usesProprietaryInterQualOrMcg: false;
  usesPredictiveAi: false;
  rewritesD4b6CarePlans: false;
  usesD4b1Lifecycle: true;
  independentSignatureEngine: false;
  disciplineProfiles: ReadonlyArray<DisciplineCapabilityProfile>;
  sections: EnterpriseCareCoordinationWorkspaceSectionDefinition[];
  barrierCatalog: ReadonlyArray<CareCoordinationBarrierDefinition>;
  destinationCatalog: ReadonlyArray<CareCoordinationDestinationDefinition>;
  riskFactorCatalog: ReadonlyArray<ReadmissionRiskFactorDefinition>;
  urCriteriaSources: ReadonlyArray<UrCriteriaSourceDefinition>;
  episodes: CareCoordinationEpisode[];
  documents: EnterpriseClinicalDocument[];
  nursingProjections: NursingCoordinationProjection[];
  rtProjections: RtCoordinationProjection[];
  rehabProjections: RehabCoordinationProjection[];
  techProjections: TechCoordinationProjection[];
  carePlanProjections: D4b6CarePlanCoordinationProjection[];
  legacyOpsProjections: LegacyDischargeOpsProjection[];
  interdisciplinaryReadiness: InterdisciplinaryReadinessProjection;
};

export function buildEnterpriseCaseManagementDischargePlanningSummary(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile?: CareCoordinationRoleProfile;
  episodes?: ReadonlyArray<CareCoordinationEpisode>;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  nursingEntries?: Parameters<typeof projectNursingCoordination>[0]["entries"];
  rtEntries?: Parameters<typeof projectRtCoordination>[0]["entries"];
  rehabEntries?: Parameters<typeof projectRehabCoordination>[0]["entries"];
  techTasks?: Parameters<typeof projectTechCoordination>[0]["tasks"];
  carePlanEntries?: Parameters<typeof projectD4b6CarePlanCoordination>[0]["plans"];
  legacyOps?: Parameters<typeof projectLegacyDischargeOps>[0]["ops"];
}): EnterpriseCaseManagementDischargePlanningSummary {
  const roleProfile = input.roleProfile ?? "CASE_MANAGER";
  const sections = careCoordinationWorkspaceSectionsForCareSetting(input.careSetting, {
    roleProfile,
  });
  const episodes = [...(input.episodes ?? [])];
  const nursingProjections = projectNursingCoordination({
    encounterId: input.encounterId,
    entries: input.nursingEntries,
  });
  const rtProjections = projectRtCoordination({
    encounterId: input.encounterId,
    entries: input.rtEntries,
  });
  const rehabProjections = projectRehabCoordination({
    encounterId: input.encounterId,
    entries: input.rehabEntries,
  });
  const techProjections = projectTechCoordination({
    encounterId: input.encounterId,
    tasks: input.techTasks,
  });
  const carePlanProjections = projectD4b6CarePlanCoordination({
    encounterId: input.encounterId,
    plans: input.carePlanEntries,
  });
  const openBarrierCount = episodes.reduce(
    (n, e) => n + e.barriers.filter((b) => b.status === "OPEN" || b.status === "IN_PROGRESS").length,
    0
  );
  return {
    certificationId: ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING_CERTIFICATION_ID,
    contractVersion: ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING_CONTRACT_VERSION,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting,
    roleProfile,
    authorizesDischarge: false,
    mutatesFinalDisposition: false,
    createsProviderOrders: false,
    mutatesMar: false,
    mutatesDiagnosis: false,
    mutatesProblemList: false,
    mutatesAdmissionStatus: false,
    assignmentEqualsAuthorization: false,
    usesProprietaryInterQualOrMcg: false,
    usesPredictiveAi: false,
    rewritesD4b6CarePlans: false,
    usesD4b1Lifecycle: true,
    independentSignatureEngine: false,
    disciplineProfiles: buildDisciplineCapabilityProfiles(),
    sections,
    barrierCatalog: CARE_COORDINATION_BARRIER_REGISTRY,
    destinationCatalog: CARE_COORDINATION_DESTINATION_REGISTRY,
    riskFactorCatalog: READMISSION_RISK_FACTOR_REGISTRY,
    urCriteriaSources: UR_CRITERIA_SOURCE_REGISTRY,
    episodes,
    documents: [...(input.documents ?? [])],
    nursingProjections,
    rtProjections,
    rehabProjections,
    techProjections,
    carePlanProjections,
    legacyOpsProjections: projectLegacyDischargeOps({
      encounterId: input.encounterId,
      ops: input.legacyOps,
    }),
    interdisciplinaryReadiness: projectInterdisciplinaryReadiness({
      encounterId: input.encounterId,
      nursingCount: nursingProjections.length,
      rtCount: rtProjections.length,
      rehabCount: rehabProjections.length,
      carePlanReadinessCount: carePlanProjections.filter(
        (p) => p.templateId === "discharge_readiness" || !!p.readinessHint
      ).length,
      openBarrierCount,
      destinationProposed: episodes.some((e) => !!e.destinationPlan),
    }),
  };
}
