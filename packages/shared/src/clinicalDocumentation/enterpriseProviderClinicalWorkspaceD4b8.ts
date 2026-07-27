/**
 * MEDUI.D4B.8 — Enterprise Provider Clinical Workspace (composition layer v2).
 *
 * EXTENDS existing Medora architecture — does NOT invent a parallel provider
 * documentation / signature / persistence engine.
 *
 * Composes:
 * - D4B.1 EnterpriseClinicalDocument contract / lifecycle / registry / adapters
 * - ProviderDocumentationWorkspace (web editor — host/compose, never fork)
 * - inpatientProviderWorkspaceD4a26 (Obs/IP provider workflow JSON)
 * - EncounterNote + Provider Documentation Shell as durable legal records
 * - Existing sign-provider-documentation / EncounterNote sign|cosign|amend|EIE
 *
 * This module owns: additive provider.* REFERENCE_VIRTUAL registry catalog,
 * capability / section / census / projection / authority-boundary helpers, and
 * thin adapters that WRAP existing durable engines. Mutation and signature
 * remain on pre-existing APIs only.
 *
 * Hard boundaries: createsProviderOrders=false; recommendation≠order;
 * assessment≠diagnosis; projection≠mutation; assignment≠authorization;
 * provider review ≠ CM/nursing/rehab/RT/care-plan ownership.
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import { actorSnapshot } from "./enterpriseClinicalDocumentAuthorshipD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";
import {
  adaptEncounterNoteToEnterpriseClinicalDocument,
  adaptProviderDocumentationShellToEnterpriseClinicalDocument,
  type EncounterNoteAdapterInput,
  type ProviderDocumentationShellAdapterInput,
} from "./enterpriseClinicalDocumentAdaptersD4b1.js";
import {
  INPATIENT_PROVIDER_WORKSPACE_CERTIFICATION_ID,
  INPATIENT_PROVIDER_WORKSPACE_KEY,
} from "../encounters/inpatientProviderWorkspaceD4a26.js";

export const ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE.D4B8" as const;

export const ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CONTRACT_VERSION =
  "D4B.8" as const;

/* -------------------------------------------------------------------------- */
/* Hard authority invariants                                                  */
/* -------------------------------------------------------------------------- */

export const PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS = {
  createsProviderOrders: false,
  mutatesDiagnosis: false,
  mutatesProblemList: false,
  mutatesMar: false,
  performsMedicationReconciliation: false,
  acknowledgesResultsViaNote: false,
  authorizesDischarge: false,
  mutatesFinalDisposition: false,
  isDischargeSummary: false,
  isProcedureOrOperativeNote: false,
  rewritesD4b6CarePlans: false,
  rewritesD4b7Coordination: false,
  assignmentEqualsAuthorization: false,
  attestationReplacesAuthorship: false,
  cosignReplacesAuthorship: false,
  allowsSilentFinalizedMutation: false,
  trustsClientControlledIdentity: false,
  autoEmCoding: false,
  usesAmbientAi: false,
  independentSignatureEngine: false,
  usesD4b1DocumentLifecycle: true,
} as const;

export const PROVIDER_WORKSPACE_PROHIBITED_CAPABILITIES = [
  "provider_order_create",
  "provider_order_mutate",
  "diagnosis_mutate",
  "problem_list_mutate",
  "mar_alter",
  "medication_reconciliation",
  "result_acknowledge_via_note",
  "discharge_authorize",
  "final_disposition_mutate",
  "discharge_summary_finalize",
  "procedure_operative_note",
  "anesthesia_note",
  "rewrite_d4b6_care_plan",
  "rewrite_d4b7_coordination",
  "assignment_as_authorization",
  "attestation_as_authorship",
  "silent_finalized_mutation",
  "client_controlled_identity",
  "auto_em_coding",
  "ambient_ai",
  "independent_signature_engine",
  "claims_billing_submit",
] as const;

export type ProviderWorkspaceProhibitedCapability =
  (typeof PROVIDER_WORKSPACE_PROHIBITED_CAPABILITIES)[number];

export function isProviderWorkspaceCapabilityProhibited(capability: string): boolean {
  return (PROVIDER_WORKSPACE_PROHIBITED_CAPABILITIES as readonly string[]).includes(capability);
}

/* -------------------------------------------------------------------------- */
/* Role profiles (designations ≠ Prisma RoleCodes; assignment ≠ auth)         */
/* -------------------------------------------------------------------------- */

export type ProviderClinicalWorkspaceRoleProfile =
  | "ATTENDING_PHYSICIAN"
  | "HOSPITALIST"
  | "CONSULTING_PHYSICIAN"
  | "RESIDENT"
  | "FELLOW"
  | "NURSE_PRACTITIONER"
  | "PHYSICIAN_ASSISTANT"
  | "MEDICAL_STUDENT"
  | "SCRIBE"
  | "TEACHING_PHYSICIAN"
  | "COVERING_PROVIDER"
  | "READ_ONLY_PROVIDER"
  | "SUPPORT_READ_ONLY";

export type EnterpriseProviderWorkspaceCapabilityId =
  | "view_census"
  | "view_patient_workspace"
  | "view_interdisciplinary_projections"
  | "create_hp_draft"
  | "finalize_hp"
  | "create_progress_draft"
  | "finalize_progress"
  | "create_consult_draft"
  | "finalize_consult"
  | "document_assessment_plan"
  | "document_mdm"
  | "amend_own_note"
  | "correct_own_note"
  | "enter_note_in_error"
  | "attest_resident_note"
  | "cosign_app_note"
  | "cosign_student_note"
  | "review_recommendations"
  | "review_care_plan"
  | "review_care_coordination"
  | "view_orders_results_meds"
  | "limited_handoff"
  | "print_export_authorized";

export type EnterpriseProviderWorkspaceCapabilityDefinition = {
  id: EnterpriseProviderWorkspaceCapabilityId;
  titleKey: string;
  defaultRoleProfiles: ReadonlyArray<ProviderClinicalWorkspaceRoleProfile>;
  assignmentGrantsCapability: false;
  createsProviderOrders: false;
  authorizesDischarge: false;
};

function pwCap(
  id: EnterpriseProviderWorkspaceCapabilityId,
  titleKeySuffix: string,
  defaultRoleProfiles: ReadonlyArray<ProviderClinicalWorkspaceRoleProfile>
): EnterpriseProviderWorkspaceCapabilityDefinition {
  return {
    id,
    titleKey: `enterpriseProviderClinicalWorkspaceD4b8.capabilities.${titleKeySuffix}`,
    defaultRoleProfiles,
    assignmentGrantsCapability: false,
    createsProviderOrders: false,
    authorizesDischarge: false,
  };
}

const ALL_PROVIDER_PROFILES: ProviderClinicalWorkspaceRoleProfile[] = [
  "ATTENDING_PHYSICIAN",
  "HOSPITALIST",
  "CONSULTING_PHYSICIAN",
  "RESIDENT",
  "FELLOW",
  "NURSE_PRACTITIONER",
  "PHYSICIAN_ASSISTANT",
  "MEDICAL_STUDENT",
  "SCRIBE",
  "TEACHING_PHYSICIAN",
  "COVERING_PROVIDER",
  "READ_ONLY_PROVIDER",
  "SUPPORT_READ_ONLY",
];

const WRITE_PROVIDER: ProviderClinicalWorkspaceRoleProfile[] = [
  "ATTENDING_PHYSICIAN",
  "HOSPITALIST",
  "CONSULTING_PHYSICIAN",
  "RESIDENT",
  "FELLOW",
  "NURSE_PRACTITIONER",
  "PHYSICIAN_ASSISTANT",
  "COVERING_PROVIDER",
  "TEACHING_PHYSICIAN",
];

const INDEPENDENT_FINALIZE: ProviderClinicalWorkspaceRoleProfile[] = [
  "ATTENDING_PHYSICIAN",
  "HOSPITALIST",
  "CONSULTING_PHYSICIAN",
  "FELLOW",
  "NURSE_PRACTITIONER",
  "PHYSICIAN_ASSISTANT",
  "COVERING_PROVIDER",
  "TEACHING_PHYSICIAN",
];

const ATTEST_COSIGN: ProviderClinicalWorkspaceRoleProfile[] = [
  "ATTENDING_PHYSICIAN",
  "HOSPITALIST",
  "TEACHING_PHYSICIAN",
  "CONSULTING_PHYSICIAN",
];

const VIEW_ALL: ProviderClinicalWorkspaceRoleProfile[] = ALL_PROVIDER_PROFILES;

const DRAFT_WITH_STUDENT: ProviderClinicalWorkspaceRoleProfile[] = [
  ...WRITE_PROVIDER,
  "MEDICAL_STUDENT",
  "SCRIBE",
];

export const ENTERPRISE_PROVIDER_WORKSPACE_CAPABILITY_REGISTRY: ReadonlyArray<EnterpriseProviderWorkspaceCapabilityDefinition> =
  [
    pwCap("view_census", "viewCensus", VIEW_ALL),
    pwCap("view_patient_workspace", "viewPatientWorkspace", VIEW_ALL),
    pwCap("view_interdisciplinary_projections", "viewInterdisciplinaryProjections", VIEW_ALL),
    pwCap("create_hp_draft", "createHpDraft", DRAFT_WITH_STUDENT),
    pwCap("finalize_hp", "finalizeHp", INDEPENDENT_FINALIZE),
    pwCap("create_progress_draft", "createProgressDraft", DRAFT_WITH_STUDENT),
    pwCap("finalize_progress", "finalizeProgress", [...INDEPENDENT_FINALIZE, "RESIDENT"]),
    pwCap("create_consult_draft", "createConsultDraft", DRAFT_WITH_STUDENT),
    pwCap("finalize_consult", "finalizeConsult", [...INDEPENDENT_FINALIZE, "RESIDENT"]),
    pwCap("document_assessment_plan", "documentAssessmentPlan", DRAFT_WITH_STUDENT),
    pwCap("document_mdm", "documentMdm", DRAFT_WITH_STUDENT),
    pwCap("amend_own_note", "amendOwnNote", WRITE_PROVIDER),
    pwCap("correct_own_note", "correctOwnNote", WRITE_PROVIDER),
    pwCap("enter_note_in_error", "enterNoteInError", WRITE_PROVIDER),
    pwCap("attest_resident_note", "attestResidentNote", ATTEST_COSIGN),
    pwCap("cosign_app_note", "cosignAppNote", ATTEST_COSIGN),
    pwCap("cosign_student_note", "cosignStudentNote", ATTEST_COSIGN),
    pwCap("review_recommendations", "reviewRecommendations", VIEW_ALL),
    pwCap("review_care_plan", "reviewCarePlan", VIEW_ALL),
    pwCap("review_care_coordination", "reviewCareCoordination", VIEW_ALL),
    pwCap("view_orders_results_meds", "viewOrdersResultsMeds", VIEW_ALL),
    pwCap("limited_handoff", "limitedHandoff", WRITE_PROVIDER),
    pwCap("print_export_authorized", "printExportAuthorized", [
      ...WRITE_PROVIDER,
      "READ_ONLY_PROVIDER",
      "TEACHING_PHYSICIAN",
    ]),
  ];

export function isProviderWorkspaceCapabilityAllowedForProfile(
  capabilityId: EnterpriseProviderWorkspaceCapabilityId,
  roleProfile: ProviderClinicalWorkspaceRoleProfile
): boolean {
  const def = ENTERPRISE_PROVIDER_WORKSPACE_CAPABILITY_REGISTRY.find((c) => c.id === capabilityId);
  if (!def) return false;
  return def.defaultRoleProfiles.includes(roleProfile);
}

export function resolveProviderRoleProfile(
  roleCodes: readonly string[] | null | undefined
): ProviderClinicalWorkspaceRoleProfile {
  const codes = (roleCodes ?? []).map((c) => String(c).toUpperCase());
  if (codes.some((c) => c === "HOSPITALIST" || c.includes("HOSPITALIST"))) {
    return "HOSPITALIST";
  }
  if (codes.some((c) => c === "FELLOW" || c.includes("FELLOW"))) {
    return "FELLOW";
  }
  if (codes.some((c) => c === "RESIDENT" || c.includes("RESIDENT"))) {
    return "RESIDENT";
  }
  if (codes.some((c) => c === "STUDENT" || c === "MEDICAL_STUDENT" || c.includes("STUDENT"))) {
    return "MEDICAL_STUDENT";
  }
  if (codes.some((c) => c === "SCRIBE" || c.includes("SCRIBE"))) {
    return "SCRIBE";
  }
  if (codes.some((c) => c === "NP" || c === "NURSE_PRACTITIONER" || c.includes("NURSE_PRACT"))) {
    return "NURSE_PRACTITIONER";
  }
  if (codes.some((c) => c === "PA" || c === "PHYSICIAN_ASSISTANT" || c.includes("PHYSICIAN_ASSIST"))) {
    return "PHYSICIAN_ASSISTANT";
  }
  if (codes.some((c) => c === "TEACHING" || c === "TEACHING_PHYSICIAN" || c.includes("TEACHING"))) {
    return "TEACHING_PHYSICIAN";
  }
  if (codes.some((c) => c === "CONSULT" || c === "CONSULTING" || c.includes("CONSULT"))) {
    return "CONSULTING_PHYSICIAN";
  }
  if (codes.some((c) => c === "COVERING" || c.includes("COVER"))) {
    return "COVERING_PROVIDER";
  }
  if (codes.some((c) => c === "MD" || c === "DO" || c === "PROVIDER" || c === "PHYSICIAN" || c === "ATTENDING")) {
    return "ATTENDING_PHYSICIAN";
  }
  if (codes.some((c) => c === "READ_ONLY" || c === "PROVIDER_READ_ONLY")) {
    return "READ_ONLY_PROVIDER";
  }
  return "SUPPORT_READ_ONLY";
}

/* -------------------------------------------------------------------------- */
/* Note type catalog                                                          */
/* -------------------------------------------------------------------------- */

export const PROVIDER_NOTE_TYPE_IDS = [
  "provider.history_and_physical",
  "provider.progress_note",
  "provider.consult_note",
  "provider.assessment_plan",
  "provider.cross_cover",
  "provider.event_note",
  "provider.attestation",
  "provider.addendum",
  "provider.amendment",
  "provider.correction",
  "provider.entered_in_error",
] as const;

export type ProviderNoteTypeId = (typeof PROVIDER_NOTE_TYPE_IDS)[number];

/** Explicitly deferred — not registered as implemented in D4B.8. */
export const PROVIDER_NOTE_TYPE_DEFERRED_IDS = [
  "provider.discharge_summary",
  "provider.operative_note",
  "provider.procedure_note",
  "provider.anesthesia_note",
] as const;

export type ProviderNoteTypeDeferredId = (typeof PROVIDER_NOTE_TYPE_DEFERRED_IDS)[number];

export type ProviderNoteRequiredSectionId =
  | "chief_complaint"
  | "history_of_present_illness"
  | "review_of_systems"
  | "physical_exam"
  | "assessment_plan"
  | "medical_decision_making"
  | "consult_question"
  | "recommendations"
  | "interval_events"
  | "attestation_statement"
  | "addendum_body"
  | "amendment_body"
  | "correction_body"
  | "entered_in_error_reason";

export type ProviderNoteTypeDefinition = {
  documentTypeId: ProviderNoteTypeId;
  titleKey: string;
  purpose: string;
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  /** ED may review progress/consult; create workflows remain Obs/IP + existing ED editor. */
  edMode: "FULL" | "REVIEW_ONLY" | "NONE";
  requiredSections: ReadonlyArray<ProviderNoteRequiredSectionId>;
  cosignTypicallyRequired: boolean;
  attestTypicallyRequired: boolean;
  createsOrders: false;
  mutatesProblemList: false;
  isDischargeSummary: false;
  isProcedureNote: false;
  /** Durable owner — D4B.8 never persists notes itself. */
  durableOwner:
    | "PROVIDER_DOCUMENTATION_SHELL"
    | "ENCOUNTER_NOTE"
    | "INPATIENT_PROVIDER_WORKSPACE_V1";
  selectedInD4b8: true;
};

function noteType(
  documentTypeId: ProviderNoteTypeId,
  titleKeySuffix: string,
  purpose: string,
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">,
  edMode: ProviderNoteTypeDefinition["edMode"],
  requiredSections: ReadonlyArray<ProviderNoteRequiredSectionId>,
  durableOwner: ProviderNoteTypeDefinition["durableOwner"],
  cosignTypicallyRequired: boolean,
  attestTypicallyRequired: boolean
): ProviderNoteTypeDefinition {
  return {
    documentTypeId,
    titleKey: `enterpriseClinicalDocumentD4b1.documentTypes.${titleKeySuffix}`,
    purpose,
    allowedCareSettings,
    edMode,
    requiredSections,
    cosignTypicallyRequired,
    attestTypicallyRequired,
    createsOrders: false,
    mutatesProblemList: false,
    isDischargeSummary: false,
    isProcedureNote: false,
    durableOwner,
    selectedInD4b8: true,
  };
}

export const PROVIDER_NOTE_TYPE_REGISTRY: ReadonlyArray<ProviderNoteTypeDefinition> = [
  noteType(
    "provider.history_and_physical",
    "providerHistoryAndPhysical",
    "Admission history and physical — authored via ProviderDocumentationWorkspace / D4A.26 H&P draft",
    ["OBSERVATION", "INPATIENT"],
    "NONE",
    ["chief_complaint", "history_of_present_illness", "review_of_systems", "physical_exam", "assessment_plan", "medical_decision_making"],
    "INPATIENT_PROVIDER_WORKSPACE_V1",
    false,
    false
  ),
  noteType(
    "provider.progress_note",
    "providerProgressNote",
    "Daily or interval progress note — EncounterNote / D4A.26 progress items",
    ["EMERGENCY", "OBSERVATION", "INPATIENT"],
    "REVIEW_ONLY",
    ["interval_events", "assessment_plan", "medical_decision_making"],
    "ENCOUNTER_NOTE",
    false,
    false
  ),
  noteType(
    "provider.consult_note",
    "providerConsultNote",
    "Specialty consult note — EncounterNote durable record",
    ["EMERGENCY", "OBSERVATION", "INPATIENT"],
    "REVIEW_ONLY",
    ["consult_question", "assessment_plan", "recommendations", "medical_decision_making"],
    "ENCOUNTER_NOTE",
    false,
    false
  ),
  noteType(
    "provider.assessment_plan",
    "providerAssessmentPlan",
    "Structured assessment-and-plan projection (note-local; ≠ problem-list mutation)",
    ["OBSERVATION", "INPATIENT"],
    "NONE",
    ["assessment_plan", "medical_decision_making"],
    "INPATIENT_PROVIDER_WORKSPACE_V1",
    false,
    false
  ),
  noteType(
    "provider.cross_cover",
    "providerCrossCover",
    "Cross-coverage / night coverage note",
    ["OBSERVATION", "INPATIENT"],
    "NONE",
    ["interval_events", "assessment_plan"],
    "ENCOUNTER_NOTE",
    false,
    false
  ),
  noteType(
    "provider.event_note",
    "providerEventNote",
    "Significant clinical event note",
    ["OBSERVATION", "INPATIENT"],
    "NONE",
    ["interval_events", "assessment_plan"],
    "ENCOUNTER_NOTE",
    false,
    false
  ),
  noteType(
    "provider.attestation",
    "providerAttestation",
    "Teaching physician attestation (does not replace authorship) — via existing signature APIs",
    ["OBSERVATION", "INPATIENT"],
    "NONE",
    ["attestation_statement"],
    "ENCOUNTER_NOTE",
    false,
    true
  ),
  noteType(
    "provider.addendum",
    "providerAddendum",
    "Governed addendum to a signed provider note — EncounterNote amendment path",
    ["OBSERVATION", "INPATIENT"],
    "NONE",
    ["addendum_body"],
    "ENCOUNTER_NOTE",
    true,
    false
  ),
  noteType(
    "provider.amendment",
    "providerAmendment",
    "Governed amendment record — EncounterNote amendment path",
    ["OBSERVATION", "INPATIENT"],
    "NONE",
    ["amendment_body"],
    "ENCOUNTER_NOTE",
    true,
    false
  ),
  noteType(
    "provider.correction",
    "providerCorrection",
    "Governed correction record — EncounterNote correction path",
    ["OBSERVATION", "INPATIENT"],
    "NONE",
    ["correction_body"],
    "ENCOUNTER_NOTE",
    true,
    false
  ),
  noteType(
    "provider.entered_in_error",
    "providerEnteredInError",
    "Entered-in-error marker — EncounterNote EIE path",
    ["EMERGENCY", "OBSERVATION", "INPATIENT"],
    "REVIEW_ONLY",
    ["entered_in_error_reason"],
    "ENCOUNTER_NOTE",
    false,
    false
  ),
];

export function getProviderNoteTypeDefinition(
  documentTypeId: string
): ProviderNoteTypeDefinition | null {
  return PROVIDER_NOTE_TYPE_REGISTRY.find((d) => d.documentTypeId === documentTypeId) ?? null;
}

export function isProviderNoteTypeDeferred(documentTypeId: string): boolean {
  return (PROVIDER_NOTE_TYPE_DEFERRED_IDS as readonly string[]).includes(documentTypeId);
}

/* -------------------------------------------------------------------------- */
/* Assessment & plan problem entries (≠ problem-list mutation)                */
/* -------------------------------------------------------------------------- */

export const ASSESSMENT_PLAN_PROBLEM_STATUSES = [
  "ACTIVE",
  "IMPROVING",
  "STABLE",
  "WORSENING",
  "RESOLVED",
  "RULED_OUT",
  "CHRONIC_STABLE",
  "CHRONIC_UNCONTROLLED",
  "PENDING_EVALUATION",
] as const;

export type AssessmentPlanProblemStatus = (typeof ASSESSMENT_PLAN_PROBLEM_STATUSES)[number];

export type AssessmentPlanProblemEntry = {
  problemEntryId: string;
  displayName: string;
  status: AssessmentPlanProblemStatus;
  assessmentNarrative: string | null;
  planNarrative: string | null;
  differentialLabels: string[];
  diagnosisRefIds: string[];
  problemListRefIds: string[];
  linkedOrderRefIds: string[];
  linkedMedRefIds: string[];
  linkedResultRefIds: string[];
  linkedConsultRefIds: string[];
  linkedCarePlanGoalIds: string[];
  linkedBarrierIds: string[];
  isNotProblemListMutation: true;
  isNotBillingDiagnosis: true;
  isNotOrderCreate: true;
  authorUserId: string;
  serviceAt: string;
};

export function createAssessmentPlanProblemEntry(input: {
  problemEntryId: string;
  displayName: string;
  status: AssessmentPlanProblemStatus;
  authorUserId: string;
  serviceAt: string;
  assessmentNarrative?: string | null;
  planNarrative?: string | null;
  differentialLabels?: ReadonlyArray<string>;
  diagnosisRefIds?: ReadonlyArray<string>;
  problemListRefIds?: ReadonlyArray<string>;
  linkedOrderRefIds?: ReadonlyArray<string>;
  linkedMedRefIds?: ReadonlyArray<string>;
  linkedResultRefIds?: ReadonlyArray<string>;
  linkedConsultRefIds?: ReadonlyArray<string>;
  linkedCarePlanGoalIds?: ReadonlyArray<string>;
  linkedBarrierIds?: ReadonlyArray<string>;
}): AssessmentPlanProblemEntry {
  return {
    problemEntryId: input.problemEntryId,
    displayName: input.displayName,
    status: input.status,
    assessmentNarrative: input.assessmentNarrative ?? null,
    planNarrative: input.planNarrative ?? null,
    differentialLabels: [...(input.differentialLabels ?? [])],
    diagnosisRefIds: [...(input.diagnosisRefIds ?? [])],
    problemListRefIds: [...(input.problemListRefIds ?? [])],
    linkedOrderRefIds: [...(input.linkedOrderRefIds ?? [])],
    linkedMedRefIds: [...(input.linkedMedRefIds ?? [])],
    linkedResultRefIds: [...(input.linkedResultRefIds ?? [])],
    linkedConsultRefIds: [...(input.linkedConsultRefIds ?? [])],
    linkedCarePlanGoalIds: [...(input.linkedCarePlanGoalIds ?? [])],
    linkedBarrierIds: [...(input.linkedBarrierIds ?? [])],
    isNotProblemListMutation: true,
    isNotBillingDiagnosis: true,
    isNotOrderCreate: true,
    authorUserId: input.authorUserId,
    serviceAt: input.serviceAt,
  };
}

/** Invariant guard — note A&P problem entries never mutate the enterprise problem list. */
export function assertNoteProblemDoesNotMutateProblemList(
  _entry: AssessmentPlanProblemEntry
): true {
  void _entry;
  return true;
}

/* -------------------------------------------------------------------------- */
/* Medical decision making (no auto E/M coding)                               */
/* -------------------------------------------------------------------------- */

export type ProviderMedicalDecisionMaking = {
  problemsAddressed: string[];
  dataReviewedSummary: string | null;
  riskOfManagement: string | null;
  dispositionConsiderations: string | null;
  externalRecordsReviewed: boolean;
  independentInterpretationDocumented: boolean;
  consultantDiscussionDocumented: boolean;
  autoEmLevel: null;
  claimsEmCompliance: false;
};

export function createMedicalDecisionMaking(input: {
  problemsAddressed?: ReadonlyArray<string>;
  dataReviewedSummary?: string | null;
  riskOfManagement?: string | null;
  dispositionConsiderations?: string | null;
  externalRecordsReviewed?: boolean;
  independentInterpretationDocumented?: boolean;
  consultantDiscussionDocumented?: boolean;
  /** Must never be accepted as a coded level — forced null. */
  autoEmLevel?: string | null;
  claimsEmCompliance?: boolean;
}): { accepted: boolean; reason: string; mdm: ProviderMedicalDecisionMaking | null } {
  if (typeof input.autoEmLevel === "string" && input.autoEmLevel.trim().length > 0) {
    return { accepted: false, reason: "AUTO_EM_FORBIDDEN", mdm: null };
  }
  if (input.claimsEmCompliance === true) {
    return { accepted: false, reason: "EM_COMPLIANCE_CLAIM_FORBIDDEN", mdm: null };
  }
  return {
    accepted: true,
    reason: "OK",
    mdm: {
      problemsAddressed: [...(input.problemsAddressed ?? [])],
      dataReviewedSummary: input.dataReviewedSummary ?? null,
      riskOfManagement: input.riskOfManagement ?? null,
      dispositionConsiderations: input.dispositionConsiderations ?? null,
      externalRecordsReviewed: !!input.externalRecordsReviewed,
      independentInterpretationDocumented: !!input.independentInterpretationDocumented,
      consultantDiscussionDocumented: !!input.consultantDiscussionDocumented,
      autoEmLevel: null,
      claimsEmCompliance: false,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Copy-forward safety                                                        */
/* -------------------------------------------------------------------------- */

export type CopyForwardSafetyResult = {
  allowed: boolean;
  reason: string;
  markAsCopiedRequired: true;
  markAsCopied: boolean;
  staleWithoutFreshReview: boolean;
  fabricatesRosExamNegatives: false;
};

export function evaluateCopyForwardSafety(input: {
  sourceDocumentId: string;
  sourceSignedAt: string;
  copyTimestamp: string;
  markAsCopied: boolean;
  freshReviewConfirmed?: boolean;
}): CopyForwardSafetyResult {
  void input.sourceDocumentId;
  if (!input.markAsCopied) {
    return {
      allowed: false,
      reason: "MARK_AS_COPIED_REQUIRED",
      markAsCopiedRequired: true,
      markAsCopied: false,
      staleWithoutFreshReview: false,
      fabricatesRosExamNegatives: false,
    };
  }
  const sourceMs = Date.parse(input.sourceSignedAt);
  const copyMs = Date.parse(input.copyTimestamp);
  const ageMs =
    Number.isFinite(sourceMs) && Number.isFinite(copyMs) ? copyMs - sourceMs : Number.POSITIVE_INFINITY;
  const staleWithoutFreshReview = ageMs > 24 * 36e5 && !input.freshReviewConfirmed;
  if (staleWithoutFreshReview) {
    return {
      allowed: false,
      reason: "STALE_SOURCE_NEEDS_FRESH_REVIEW",
      markAsCopiedRequired: true,
      markAsCopied: true,
      staleWithoutFreshReview: true,
      fabricatesRosExamNegatives: false,
    };
  }
  return {
    allowed: true,
    reason: "OK",
    markAsCopiedRequired: true,
    markAsCopied: true,
    staleWithoutFreshReview: false,
    fabricatesRosExamNegatives: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Limited handoff (assignment ≠ rewrite authorship)                          */
/* -------------------------------------------------------------------------- */

export type ProviderLimitedHandoffProjection = {
  kind: "PROVIDER_LIMITED_HANDOFF";
  encounterId: string;
  fromUserId: string | null;
  toUserId: string | null;
  coverageStartedAt: string | null;
  openUnsignedDraftCount: number;
  pendingCosignCount: number;
  pendingAttestCount: number;
  openBarrierCount: number;
  summaryBullets: string[];
  historicalAuthorUserIdsPreserved: true;
  assignmentEqualsAuthorization: false;
};

export function handoffPreservesHistoricalAttribution(input: {
  originalAuthorUserId: string;
  coveringProviderUserId: string;
  storedAuthorUserId: string;
}): {
  handoffPreservesHistoricalAttribution: true;
  authorUnchanged: boolean;
  assignmentEqualsAuthorization: false;
} {
  return {
    handoffPreservesHistoricalAttribution: true,
    authorUnchanged: input.storedAuthorUserId === input.originalAuthorUserId,
    assignmentEqualsAuthorization: false,
  };
}

export function buildProviderLimitedHandoff(input: {
  encounterId: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  coverageStartedAt?: string | null;
  openUnsignedDraftCount?: number;
  pendingCosignCount?: number;
  pendingAttestCount?: number;
  openBarrierCount?: number;
  summaryBullets?: ReadonlyArray<string>;
}): ProviderLimitedHandoffProjection {
  return {
    kind: "PROVIDER_LIMITED_HANDOFF",
    encounterId: input.encounterId,
    fromUserId: input.fromUserId ?? null,
    toUserId: input.toUserId ?? null,
    coverageStartedAt: input.coverageStartedAt ?? null,
    openUnsignedDraftCount: input.openUnsignedDraftCount ?? 0,
    pendingCosignCount: input.pendingCosignCount ?? 0,
    pendingAttestCount: input.pendingAttestCount ?? 0,
    openBarrierCount: input.openBarrierCount ?? 0,
    summaryBullets: [...(input.summaryBullets ?? [])],
    historicalAuthorUserIdsPreserved: true,
    assignmentEqualsAuthorization: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Census row (bounded projection — no full narratives)                       */
/* -------------------------------------------------------------------------- */

export type ProviderCensusRow = {
  kind: "PROVIDER_CENSUS_ROW";
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  displayName: string | null;
  locationLabel: string | null;
  attendingUserId: string | null;
  coveringUserId: string | null;
  unsignedDraft: boolean;
  cosignNeeded: boolean;
  attestNeeded: boolean;
  openBarrierCount: number;
  lastNoteTypeId: string | null;
  lastNoteAt: string | null;
  /** Full note / SW narratives deliberately omitted. */
  fullNoteNarrative: null;
  fullSocialWorkNarrative: null;
  suppressesFullNarratives: true;
};

export function buildProviderCensusRow(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  displayName?: string | null;
  locationLabel?: string | null;
  attendingUserId?: string | null;
  coveringUserId?: string | null;
  unsignedDraft?: boolean;
  cosignNeeded?: boolean;
  attestNeeded?: boolean;
  openBarrierCount?: number;
  lastNoteTypeId?: string | null;
  lastNoteAt?: string | null;
  /** Rejected if provided — never included on census. */
  fullNoteNarrative?: string | null;
  fullSocialWorkNarrative?: string | null;
}): ProviderCensusRow {
  void input.fullNoteNarrative;
  void input.fullSocialWorkNarrative;
  return {
    kind: "PROVIDER_CENSUS_ROW",
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting,
    displayName: input.displayName ?? null,
    locationLabel: input.locationLabel ?? null,
    attendingUserId: input.attendingUserId ?? null,
    coveringUserId: input.coveringUserId ?? null,
    unsignedDraft: !!input.unsignedDraft,
    cosignNeeded: !!input.cosignNeeded,
    attestNeeded: !!input.attestNeeded,
    openBarrierCount: input.openBarrierCount ?? 0,
    lastNoteTypeId: input.lastNoteTypeId ?? null,
    lastNoteAt: input.lastNoteAt ?? null,
    fullNoteNarrative: null,
    fullSocialWorkNarrative: null,
    suppressesFullNarratives: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Workspace sections                                                         */
/* -------------------------------------------------------------------------- */

export type EnterpriseProviderWorkspaceSectionId =
  | "overview"
  | "census"
  | "documentation"
  | "historyPhysical"
  | "progressNotes"
  | "consultNotes"
  | "assessmentPlan"
  | "medicalDecisionMaking"
  | "clinicalReview"
  | "nursingProjection"
  | "rtProjection"
  | "rehabProjection"
  | "techProjection"
  | "carePlanProjection"
  | "careCoordinationProjection"
  | "ordersResultsMeds"
  | "timeline"
  | "handoff"
  | "deferredBoundaries";

export type ProviderWorkspaceSectionMode =
  | "WORKFLOW"
  | "PROJECTION"
  | "LEGACY"
  | "DEFERRED"
  | "ED_LIMITED";

export type EnterpriseProviderWorkspaceSectionDefinition = {
  id: EnterpriseProviderWorkspaceSectionId;
  titleKey: string;
  mode: ProviderWorkspaceSectionMode;
  allowedCareSettings: ReadonlyArray<"EMERGENCY" | "OBSERVATION" | "INPATIENT">;
  requiredCapability: EnterpriseProviderWorkspaceCapabilityId | null;
};

const ED_LIMITED_SECTION_IDS: ReadonlySet<EnterpriseProviderWorkspaceSectionId> = new Set([
  "overview",
  "clinicalReview",
  "ordersResultsMeds",
  "deferredBoundaries",
]);

export const ENTERPRISE_PROVIDER_WORKSPACE_SECTIONS: ReadonlyArray<EnterpriseProviderWorkspaceSectionDefinition> =
  [
    {
      id: "overview",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.overview",
      mode: "WORKFLOW",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: "view_patient_workspace",
    },
    {
      id: "census",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.census",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "view_census",
    },
    {
      id: "documentation",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.documentation",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "view_patient_workspace",
    },
    {
      id: "historyPhysical",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.historyPhysical",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "create_hp_draft",
    },
    {
      id: "progressNotes",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.progressNotes",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "create_progress_draft",
    },
    {
      id: "consultNotes",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.consultNotes",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "create_consult_draft",
    },
    {
      id: "assessmentPlan",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.assessmentPlan",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "document_assessment_plan",
    },
    {
      id: "medicalDecisionMaking",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.medicalDecisionMaking",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "document_mdm",
    },
    {
      id: "clinicalReview",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.clinicalReview",
      mode: "PROJECTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: "review_recommendations",
    },
    {
      id: "nursingProjection",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.nursingProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "view_interdisciplinary_projections",
    },
    {
      id: "rtProjection",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.rtProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "view_interdisciplinary_projections",
    },
    {
      id: "rehabProjection",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.rehabProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "view_interdisciplinary_projections",
    },
    {
      id: "techProjection",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.techProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "view_interdisciplinary_projections",
    },
    {
      id: "carePlanProjection",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.carePlanProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "review_care_plan",
    },
    {
      id: "careCoordinationProjection",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.careCoordinationProjection",
      mode: "PROJECTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "review_care_coordination",
    },
    {
      id: "ordersResultsMeds",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.ordersResultsMeds",
      mode: "PROJECTION",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: "view_orders_results_meds",
    },
    {
      id: "timeline",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.timeline",
      mode: "PROJECTION",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "view_patient_workspace",
    },
    {
      id: "handoff",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.handoff",
      mode: "WORKFLOW",
      allowedCareSettings: ["OBSERVATION", "INPATIENT"],
      requiredCapability: "limited_handoff",
    },
    {
      id: "deferredBoundaries",
      titleKey: "enterpriseProviderClinicalWorkspaceD4b8.sections.deferredBoundaries",
      mode: "DEFERRED",
      allowedCareSettings: ["EMERGENCY", "OBSERVATION", "INPATIENT"],
      requiredCapability: null,
    },
  ];

export function providerWorkspaceSectionsForCareSetting(
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT",
  opts?: { roleProfile?: ProviderClinicalWorkspaceRoleProfile; includeDeferred?: boolean }
): EnterpriseProviderWorkspaceSectionDefinition[] {
  const roleProfile = opts?.roleProfile ?? "ATTENDING_PHYSICIAN";
  const includeDeferred = opts?.includeDeferred ?? true;
  return ENTERPRISE_PROVIDER_WORKSPACE_SECTIONS.filter((s) => {
    if (!s.allowedCareSettings.includes(careSetting)) return false;
    if (s.mode === "DEFERRED" && !includeDeferred) return false;
    if (careSetting === "EMERGENCY" && !ED_LIMITED_SECTION_IDS.has(s.id)) return false;
    if (
      s.requiredCapability &&
      !isProviderWorkspaceCapabilityAllowedForProfile(s.requiredCapability, roleProfile)
    ) {
      return (
        s.mode === "PROJECTION" ||
        s.id === "overview" ||
        s.id === "deferredBoundaries" ||
        s.id === "clinicalReview" ||
        s.id === "ordersResultsMeds"
      );
    }
    return true;
  }).map((s) =>
    careSetting === "EMERGENCY" ? { ...s, mode: "ED_LIMITED" as const } : s
  );
}

export function classifyEncounterTypeToProviderCareSetting(
  encounterType: string | null | undefined
): "EMERGENCY" | "OBSERVATION" | "INPATIENT" {
  const t = String(encounterType ?? "").toUpperCase();
  if (t === "ER" || t === "ED" || t === "EMERGENCY") return "EMERGENCY";
  if (t === "OBSERVATION" || t === "OBS") return "OBSERVATION";
  return "INPATIENT";
}

/* -------------------------------------------------------------------------- */
/* Composition anchors (reuse — never fork)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Explicit composition contract: D4B.8 hosts / projects; durable write paths stay
 * on existing engines. No ProviderNoteV2 / ProviderDocument / second signature API.
 */
export const PROVIDER_CLINICAL_WORKSPACE_COMPOSITION = {
  certificationId: ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CERTIFICATION_ID,
  contractVersion: ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CONTRACT_VERSION,
  documentLifecycleOwner: "D4B.1",
  webEditor: "ProviderDocumentationWorkspace",
  inpatientObsWorkflowModule: "inpatientProviderWorkspaceD4a26",
  inpatientWorkspaceKey: INPATIENT_PROVIDER_WORKSPACE_KEY,
  inpatientWorkspaceCertificationId: INPATIENT_PROVIDER_WORKSPACE_CERTIFICATION_ID,
  durableLegalRecord: "EncounterNote",
  providerShellDocumentTypeId: "provider.documentation_shell",
  shellAdapter: "adaptProviderDocumentationShellToEnterpriseClinicalDocument",
  encounterNoteAdapter: "adaptEncounterNoteToEnterpriseClinicalDocument",
  signaturePaths: [
    "sign-provider-documentation",
    "EncounterNote.sign",
    "EncounterNote.cosign",
    "EncounterNote.amendment",
    "EncounterNote.correction",
    "EncounterNote.entered_in_error",
  ] as const,
  createsIndependentDocumentationEngine: false,
  createsIndependentSignatureEngine: false,
  replacesProviderDocumentationWorkspace: false,
  replacesInpatientProviderWorkspaceD4a26: false,
  replacesEncounterNote: false,
} as const;

export type ProviderDurableLifecycleOwner =
  | "PROVIDER_DOCUMENTATION_SHELL"
  | "ENCOUNTER_NOTE"
  | "INPATIENT_PROVIDER_WORKSPACE_V1"
  | "DEFERRED";

export function durableLifecycleOwnerForProviderNoteType(
  documentTypeId: string
): ProviderDurableLifecycleOwner {
  if (isProviderNoteTypeDeferred(documentTypeId)) return "DEFERRED";
  return getProviderNoteTypeDefinition(documentTypeId)?.durableOwner ?? "ENCOUNTER_NOTE";
}

/**
 * Compose an existing Provider Documentation Shell into D4B.1 — does not invent
 * a new record. Optional catalogTypeId overlays a curated provider.* type id for
 * registry projection while preserving PROVIDER_DOCUMENTATION_SHELL architecture.
 */
export function composeProviderDocumentationShellDocument(
  shell: ProviderDocumentationShellAdapterInput,
  opts?: { catalogTypeId?: ProviderNoteTypeId | string }
): EnterpriseClinicalDocument {
  const base = adaptProviderDocumentationShellToEnterpriseClinicalDocument(shell);
  const catalogTypeId = opts?.catalogTypeId;
  if (!catalogTypeId) return base;
  return {
    ...base,
    documentTypeId: catalogTypeId,
    templateVersion: "D4B.8",
    structured: {
      schemaId: catalogTypeId,
      schemaVersion: "D4B.8",
      payload: {
        ...PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS,
        composedFrom: "PROVIDER_DOCUMENTATION_SHELL",
        durableOwner: "PROVIDER_DOCUMENTATION_SHELL",
        composition: PROVIDER_CLINICAL_WORKSPACE_COMPOSITION,
      },
    },
  };
}

/**
 * Compose an EncounterNote into D4B.1 — EncounterNote remains the durable legal
 * record. Optional catalogTypeId overlays a curated provider.* type for projection.
 */
export function composeEncounterNoteProviderDocument(
  note: EncounterNoteAdapterInput,
  opts?: { catalogTypeId?: ProviderNoteTypeId | string }
): EnterpriseClinicalDocument {
  const base = adaptEncounterNoteToEnterpriseClinicalDocument(note);
  const catalogTypeId = opts?.catalogTypeId;
  if (!catalogTypeId) return base;
  return {
    ...base,
    documentTypeId: catalogTypeId,
    templateVersion: base.templateVersion,
    structured: {
      schemaId: catalogTypeId,
      schemaVersion: "D4B.8",
      payload: {
        ...PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS,
        composedFrom: "ENCOUNTER_NOTE",
        durableOwner: "ENCOUNTER_NOTE",
        composition: PROVIDER_CLINICAL_WORKSPACE_COMPOSITION,
      },
    },
  };
}

/**
 * REFERENCE_VIRTUAL projection helper for catalog/typed review surfaces only.
 * NOT a persistence or signature engine — prefer compose* helpers for durable rows.
 */
export function projectProviderCatalogVirtualDocument(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  documentId: string;
  documentTypeId: ProviderNoteTypeId | string;
  body: string;
  authorUserId: string;
  authorDisplayName?: string | null;
  createdAt: string;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  lifecycleState?: Extract<EnterpriseClinicalDocumentLifecycleState, "DRAFT" | "SIGNED">;
  structuredPayload?: Record<string, unknown>;
  assessmentPlan?: ReadonlyArray<AssessmentPlanProblemEntry>;
  mdm?: ProviderMedicalDecisionMaking | null;
}): EnterpriseClinicalDocument {
  const author = actorSnapshot(input.authorUserId, input.authorDisplayName, "PROVIDER");
  const lifecycleState: EnterpriseClinicalDocumentLifecycleState = input.lifecycleState ?? "DRAFT";
  const signed = lifecycleState === "SIGNED";
  const durableOwner = durableLifecycleOwnerForProviderNoteType(String(input.documentTypeId));
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: input.documentId,
    sourceArchitecture: "REFERENCE_VIRTUAL",
    patientId: input.patientId,
    encounterId: input.encounterId,
    hospitalEpisodeId: null,
    facilityId: input.facilityId,
    careSetting: input.careSetting ?? "UNKNOWN",
    discipline: "PROVIDER",
    documentTypeId: input.documentTypeId,
    templateVersion: "D4B.8",
    creator: author,
    author,
    responsibleSigner: signed ? author : null,
    cosigner: null,
    currentAssignedClinicianUserId: null,
    createdAt: input.createdAt,
    serviceAt: input.createdAt,
    lastEditedAt: input.createdAt,
    signedAt: signed ? input.createdAt : null,
    amendedAt: null,
    lifecycleState,
    structured: {
      schemaId: input.documentTypeId,
      schemaVersion: "D4B.8",
      payload: {
        ...PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS,
        assessmentPlan: input.assessmentPlan ?? [],
        mdm: input.mdm ?? null,
        durableOwner,
        composition: PROVIDER_CLINICAL_WORKSPACE_COMPOSITION,
        isProjectionOnly: true,
        ...(input.structuredPayload ?? {}),
      },
    },
    narrative: {
      sections: [{ key: "body", title: "Note", text: input.body, lateEntry: false }],
    },
    validation: { fieldValid: true, issues: [] },
    completeness: {
      clinicallyComplete: signed,
      signatureReady: signed,
      missingIndicators: signed ? [] : ["signature"],
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
    legalRecordVisible: signed,
    printExportEligible: signed,
    enteredInError: false,
    voided: false,
  };
}

/** @deprecated Use projectProviderCatalogVirtualDocument — kept as alias for projection-only calls. */
export const adaptProviderVirtualDocument = projectProviderCatalogVirtualDocument;

/**
 * Policy helper only — does NOT mutate documents. Signature remains on existing
 * Provider Documentation / EncounterNote APIs.
 */
export function canIndependentlyFinalizeProviderNote(
  roleProfile: ProviderClinicalWorkspaceRoleProfile
): boolean {
  return (
    roleProfile !== "MEDICAL_STUDENT" &&
    roleProfile !== "SCRIBE" &&
    roleProfile !== "SUPPORT_READ_ONLY" &&
    roleProfile !== "READ_ONLY_PROVIDER"
  );
}

export function providerNoteCreationAllowedInCareSetting(input: {
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  documentTypeId: string;
}): { allowed: boolean; reason: string; usesExistingEditor: true } {
  if (isProviderNoteTypeDeferred(input.documentTypeId)) {
    return { allowed: false, reason: "DEFERRED_NOTE_TYPE", usesExistingEditor: true };
  }
  const def = getProviderNoteTypeDefinition(input.documentTypeId);
  if (!def) {
    return { allowed: false, reason: "UNKNOWN_NOTE_TYPE", usesExistingEditor: true };
  }
  if (input.careSetting === "EMERGENCY") {
    return { allowed: false, reason: "ED_LIMITED", usesExistingEditor: true };
  }
  if (!def.allowedCareSettings.includes(input.careSetting)) {
    return { allowed: false, reason: "CARE_SETTING_DENIED", usesExistingEditor: true };
  }
  return { allowed: true, reason: "OK", usesExistingEditor: true };
}

/* -------------------------------------------------------------------------- */
/* Projections (read-only — never overwrite source domains)                   */
/* -------------------------------------------------------------------------- */

export type ProviderNursingProjection = {
  kind: "PROVIDER_NURSING_PROJECTION";
  encounterId: string;
  summaryText: string | null;
  authorUserId: string | null;
  recordedAt: string | null;
  isNursingAuthored: true;
  providerMustNotOverwrite: true;
};

export function projectNursingForProvider(input: {
  encounterId: string;
  entries?: ReadonlyArray<{
    summaryText?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
}): ProviderNursingProjection[] {
  return (input.entries ?? []).map((e) => ({
    kind: "PROVIDER_NURSING_PROJECTION" as const,
    encounterId: input.encounterId,
    summaryText: e.summaryText ?? null,
    authorUserId: e.authorUserId ?? null,
    recordedAt: e.recordedAt ?? null,
    isNursingAuthored: true,
    providerMustNotOverwrite: true,
  }));
}

export type ProviderRtProjection = {
  kind: "PROVIDER_RT_PROJECTION";
  encounterId: string;
  summaryText: string | null;
  authorUserId: string | null;
  recordedAt: string | null;
  isRtAuthored: true;
  providerMustNotOverwrite: true;
};

export function projectRtForProvider(input: {
  encounterId: string;
  entries?: ReadonlyArray<{
    summaryText?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
}): ProviderRtProjection[] {
  return (input.entries ?? []).map((e) => ({
    kind: "PROVIDER_RT_PROJECTION" as const,
    encounterId: input.encounterId,
    summaryText: e.summaryText ?? null,
    authorUserId: e.authorUserId ?? null,
    recordedAt: e.recordedAt ?? null,
    isRtAuthored: true,
    providerMustNotOverwrite: true,
  }));
}

export type ProviderRehabProjection = {
  kind: "PROVIDER_REHAB_PROJECTION";
  encounterId: string;
  discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
  summaryText: string | null;
  authorUserId: string | null;
  recordedAt: string | null;
  providerMustNotOverwrite: true;
};

export function projectRehabForProvider(input: {
  encounterId: string;
  entries?: ReadonlyArray<{
    discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
    summaryText?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
}): ProviderRehabProjection[] {
  return (input.entries ?? []).map((e) => ({
    kind: "PROVIDER_REHAB_PROJECTION" as const,
    encounterId: input.encounterId,
    discipline: e.discipline,
    summaryText: e.summaryText ?? null,
    authorUserId: e.authorUserId ?? null,
    recordedAt: e.recordedAt ?? null,
    providerMustNotOverwrite: true,
  }));
}

export type ProviderTechProjection = {
  kind: "PROVIDER_TECH_PROJECTION";
  encounterId: string;
  activityId: string | null;
  performerUserId: string | null;
  completedAt: string | null;
  isTechnicianAuthored: true;
  providerMustNotOverwrite: true;
};

export function projectTechForProvider(input: {
  encounterId: string;
  tasks?: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    completedAt?: string | null;
  }>;
}): ProviderTechProjection[] {
  return (input.tasks ?? []).map((t) => ({
    kind: "PROVIDER_TECH_PROJECTION" as const,
    encounterId: input.encounterId,
    activityId: t.activityId ?? null,
    performerUserId: t.performerUserId ?? null,
    completedAt: t.completedAt ?? null,
    isTechnicianAuthored: true,
    providerMustNotOverwrite: true,
  }));
}

export type ProviderCarePlanProjection = {
  kind: "PROVIDER_CARE_PLAN_PROJECTION";
  encounterId: string;
  planId: string | null;
  templateId: string | null;
  lifecycleState: string | null;
  readinessHint: string | null;
  rewritesD4b6: false;
  isProjectionOnly: true;
};

export function projectCarePlanForProvider(input: {
  encounterId: string;
  plans?: ReadonlyArray<{
    planId?: string | null;
    templateId?: string | null;
    lifecycleState?: string | null;
    readinessHint?: string | null;
  }>;
}): ProviderCarePlanProjection[] {
  return (input.plans ?? []).map((p) => ({
    kind: "PROVIDER_CARE_PLAN_PROJECTION" as const,
    encounterId: input.encounterId,
    planId: p.planId ?? null,
    templateId: p.templateId ?? null,
    lifecycleState: p.lifecycleState ?? null,
    readinessHint: p.readinessHint ?? null,
    rewritesD4b6: false,
    isProjectionOnly: true,
  }));
}

export type ProviderCareCoordinationProjection = {
  kind: "PROVIDER_CARE_COORDINATION_PROJECTION";
  encounterId: string;
  episodeId: string | null;
  status: string | null;
  openBarrierCount: number;
  destinationHint: string | null;
  fullSocialWorkNarrative: null;
  rewritesD4b7: false;
  isProjectionOnly: true;
};

export function projectCareCoordinationForProvider(input: {
  encounterId: string;
  episodes?: ReadonlyArray<{
    episodeId?: string | null;
    status?: string | null;
    openBarrierCount?: number;
    destinationHint?: string | null;
    fullSocialWorkNarrative?: string | null;
  }>;
}): ProviderCareCoordinationProjection[] {
  return (input.episodes ?? []).map((e) => {
    void e.fullSocialWorkNarrative;
    return {
      kind: "PROVIDER_CARE_COORDINATION_PROJECTION" as const,
      encounterId: input.encounterId,
      episodeId: e.episodeId ?? null,
      status: e.status ?? null,
      openBarrierCount: e.openBarrierCount ?? 0,
      destinationHint: e.destinationHint ?? null,
      fullSocialWorkNarrative: null,
      rewritesD4b7: false,
      isProjectionOnly: true,
    };
  });
}

export type ProviderOrderProjection = {
  kind: "PROVIDER_ORDER_PROJECTION";
  encounterId: string;
  orderId: string | null;
  status: string | null;
  summaryText: string | null;
  isNotOrderCreate: true;
  createsProviderOrders: false;
};

export function projectOrdersForProvider(input: {
  encounterId: string;
  orders?: ReadonlyArray<{
    orderId?: string | null;
    status?: string | null;
    summaryText?: string | null;
  }>;
}): ProviderOrderProjection[] {
  return (input.orders ?? []).map((o) => ({
    kind: "PROVIDER_ORDER_PROJECTION" as const,
    encounterId: input.encounterId,
    orderId: o.orderId ?? null,
    status: o.status ?? null,
    summaryText: o.summaryText ?? null,
    isNotOrderCreate: true,
    createsProviderOrders: false,
  }));
}

export type ProviderMedicationMarProjection = {
  kind: "PROVIDER_MEDICATION_MAR_PROJECTION";
  encounterId: string;
  medicationId: string | null;
  status: string | null;
  summaryText: string | null;
  isNotReconciliation: true;
  isNotAdministration: true;
  mutatesMar: false;
  performsMedicationReconciliation: false;
};

export function projectMedicationMarForProvider(input: {
  encounterId: string;
  medications?: ReadonlyArray<{
    medicationId?: string | null;
    status?: string | null;
    summaryText?: string | null;
  }>;
}): ProviderMedicationMarProjection[] {
  return (input.medications ?? []).map((m) => ({
    kind: "PROVIDER_MEDICATION_MAR_PROJECTION" as const,
    encounterId: input.encounterId,
    medicationId: m.medicationId ?? null,
    status: m.status ?? null,
    summaryText: m.summaryText ?? null,
    isNotReconciliation: true,
    isNotAdministration: true,
    mutatesMar: false,
    performsMedicationReconciliation: false,
  }));
}

export type ProviderResultProjection = {
  kind: "PROVIDER_RESULT_PROJECTION";
  encounterId: string;
  resultId: string | null;
  status: string | null;
  summaryText: string | null;
  inclusionIsNotAcknowledgment: true;
  acknowledgesResultsViaNote: false;
};

export function projectResultsForProvider(input: {
  encounterId: string;
  results?: ReadonlyArray<{
    resultId?: string | null;
    status?: string | null;
    summaryText?: string | null;
  }>;
}): ProviderResultProjection[] {
  return (input.results ?? []).map((r) => ({
    kind: "PROVIDER_RESULT_PROJECTION" as const,
    encounterId: input.encounterId,
    resultId: r.resultId ?? null,
    status: r.status ?? null,
    summaryText: r.summaryText ?? null,
    inclusionIsNotAcknowledgment: true,
    acknowledgesResultsViaNote: false,
  }));
}

export type ProviderDiagnosisProblemProjection = {
  kind: "PROVIDER_DIAGNOSIS_PROBLEM_PROJECTION";
  encounterId: string;
  diagnosisId: string | null;
  problemListId: string | null;
  displayName: string | null;
  isNotMutation: true;
  mutatesDiagnosis: false;
  mutatesProblemList: false;
  isNotBillingDiagnosis: true;
};

export function projectDiagnosisProblemForProvider(input: {
  encounterId: string;
  entries?: ReadonlyArray<{
    diagnosisId?: string | null;
    problemListId?: string | null;
    displayName?: string | null;
  }>;
}): ProviderDiagnosisProblemProjection[] {
  return (input.entries ?? []).map((e) => ({
    kind: "PROVIDER_DIAGNOSIS_PROBLEM_PROJECTION" as const,
    encounterId: input.encounterId,
    diagnosisId: e.diagnosisId ?? null,
    problemListId: e.problemListId ?? null,
    displayName: e.displayName ?? null,
    isNotMutation: true,
    mutatesDiagnosis: false,
    mutatesProblemList: false,
    isNotBillingDiagnosis: true,
  }));
}

/* -------------------------------------------------------------------------- */
/* Boundary / distinguish helpers                                             */
/* -------------------------------------------------------------------------- */

export function distinguishNoteTextFromOrder(input: {
  noteTextPresent?: boolean;
  orderCreated?: boolean;
}): {
  noteIsNotOrder: true;
  createsProviderOrders: false;
  orderCreatedElsewhere: boolean;
} {
  return {
    noteIsNotOrder: true,
    createsProviderOrders: false,
    orderCreatedElsewhere: !!input.orderCreated,
  };
}

export function distinguishDiagnosisRefFromBilling(input: {
  diagnosisRefId?: string | null;
}): {
  isNotBillingDiagnosis: true;
  hasDiagnosisRef: boolean;
} {
  return {
    isNotBillingDiagnosis: true,
    hasDiagnosisRef: !!String(input.diagnosisRefId ?? "").trim(),
  };
}

export function distinguishNoteProblemFromProblemList(input: {
  noteProblemEntryId?: string | null;
}): {
  isNotProblemListMutation: true;
  mutatesProblemList: false;
  hasNoteProblem: boolean;
} {
  return {
    isNotProblemListMutation: true,
    mutatesProblemList: false,
    hasNoteProblem: !!String(input.noteProblemEntryId ?? "").trim(),
  };
}

export function distinguishResultInclusionFromAcknowledgment(input: {
  resultIncluded?: boolean;
}): {
  inclusionIsNotAcknowledgment: true;
  acknowledgesResultsViaNote: false;
  resultIncluded: boolean;
} {
  return {
    inclusionIsNotAcknowledgment: true,
    acknowledgesResultsViaNote: false,
    resultIncluded: !!input.resultIncluded,
  };
}

export function distinguishMedicationProjectionFromReconciliation(input: {
  medicationProjected?: boolean;
}): {
  isNotReconciliation: true;
  performsMedicationReconciliation: false;
  medicationProjected: boolean;
} {
  return {
    isNotReconciliation: true,
    performsMedicationReconciliation: false,
    medicationProjected: !!input.medicationProjected,
  };
}

export function distinguishMarProjectionFromAdministration(input: {
  marProjected?: boolean;
}): {
  isNotAdministration: true;
  mutatesMar: false;
  marProjected: boolean;
} {
  return {
    isNotAdministration: true,
    mutatesMar: false,
    marProjected: !!input.marProjected,
  };
}

export function distinguishConsultRecFromOrder(input: {
  recommendationPresent?: boolean;
}): {
  recommendationIsNotOrder: true;
  createsProviderOrders: false;
  recommendationPresent: boolean;
} {
  return {
    recommendationIsNotOrder: true,
    createsProviderOrders: false,
    recommendationPresent: !!input.recommendationPresent,
  };
}

export function distinguishCarePlanReviewFromRewrite(input: {
  carePlanReviewed?: boolean;
}): {
  rewritesD4b6CarePlans: false;
  isProjectionOnly: true;
  carePlanReviewed: boolean;
} {
  return {
    rewritesD4b6CarePlans: false,
    isProjectionOnly: true,
    carePlanReviewed: !!input.carePlanReviewed,
  };
}

export function distinguishCoordinationReviewFromRewrite(input: {
  coordinationReviewed?: boolean;
}): {
  rewritesD4b7Coordination: false;
  isProjectionOnly: true;
  coordinationReviewed: boolean;
} {
  return {
    rewritesD4b7Coordination: false,
    isProjectionOnly: true,
    coordinationReviewed: !!input.coordinationReviewed,
  };
}

/** Provider-scoped name — avoids barrel clash with D4B.6 helper of the same stem. */
export function distinguishProviderDischargeReadinessFromAuthorization(input: {
  readinessHintPresent?: boolean;
}): {
  readinessIsNotAuthorization: true;
  authorizesDischarge: false;
  readinessHintPresent: boolean;
} {
  return {
    readinessIsNotAuthorization: true,
    authorizesDischarge: false,
    readinessHintPresent: !!input.readinessHintPresent,
  };
}

export function distinguishProgressNoteFromDischargeSummary(input: {
  documentTypeId?: string | null;
}): {
  isDischargeSummary: false;
  isProgressNote: boolean;
} {
  return {
    isDischargeSummary: false,
    isProgressNote: input.documentTypeId === "provider.progress_note",
  };
}

export function distinguishAttestationFromAuthorship(input: {
  attesterUserId?: string | null;
  authorUserId?: string | null;
}): {
  attestationReplacesAuthorship: false;
  authorPreserved: true;
  hasAttester: boolean;
} {
  void input.authorUserId;
  return {
    attestationReplacesAuthorship: false,
    authorPreserved: true,
    hasAttester: !!String(input.attesterUserId ?? "").trim(),
  };
}

/** Provider-scoped name — avoids barrel clash with D4B.7 helper of the same stem. */
export function distinguishProviderAssignmentFromAuthorization(input: {
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

/* -------------------------------------------------------------------------- */
/* Workspace summary                                                          */
/* -------------------------------------------------------------------------- */

export type EnterpriseProviderClinicalWorkspaceSummary = {
  certificationId: typeof ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CERTIFICATION_ID;
  contractVersion: typeof ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CONTRACT_VERSION;
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile: ProviderClinicalWorkspaceRoleProfile;
  createsProviderOrders: false;
  mutatesDiagnosis: false;
  mutatesProblemList: false;
  mutatesMar: false;
  performsMedicationReconciliation: false;
  acknowledgesResultsViaNote: false;
  authorizesDischarge: false;
  mutatesFinalDisposition: false;
  isDischargeSummary: false;
  isProcedureOrOperativeNote: false;
  rewritesD4b6CarePlans: false;
  rewritesD4b7Coordination: false;
  assignmentEqualsAuthorization: false;
  attestationReplacesAuthorship: false;
  cosignReplacesAuthorship: false;
  allowsSilentFinalizedMutation: false;
  trustsClientControlledIdentity: false;
  autoEmCoding: false;
  usesAmbientAi: false;
  independentSignatureEngine: false;
  usesD4b1Lifecycle: true;
  createsIndependentDocumentationEngine: false;
  replacesProviderDocumentationWorkspace: false;
  replacesInpatientProviderWorkspaceD4a26: false;
  replacesEncounterNote: false;
  composition: typeof PROVIDER_CLINICAL_WORKSPACE_COMPOSITION;
  noteTypeCatalog: ReadonlyArray<ProviderNoteTypeDefinition>;
  deferredNoteTypeIds: ReadonlyArray<ProviderNoteTypeDeferredId>;
  sections: EnterpriseProviderWorkspaceSectionDefinition[];
  documents: EnterpriseClinicalDocument[];
  censusRows: ProviderCensusRow[];
  nursingProjections: ProviderNursingProjection[];
  rtProjections: ProviderRtProjection[];
  rehabProjections: ProviderRehabProjection[];
  techProjections: ProviderTechProjection[];
  carePlanProjections: ProviderCarePlanProjection[];
  careCoordinationProjections: ProviderCareCoordinationProjection[];
  orderProjections: ProviderOrderProjection[];
  medicationMarProjections: ProviderMedicationMarProjection[];
  resultProjections: ProviderResultProjection[];
  diagnosisProblemProjections: ProviderDiagnosisProblemProjection[];
  handoff: ProviderLimitedHandoffProjection | null;
};

export function buildEnterpriseProviderClinicalWorkspaceSummary(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleProfile?: ProviderClinicalWorkspaceRoleProfile;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  censusRows?: ReadonlyArray<ProviderCensusRow>;
  nursingEntries?: Parameters<typeof projectNursingForProvider>[0]["entries"];
  rtEntries?: Parameters<typeof projectRtForProvider>[0]["entries"];
  rehabEntries?: Parameters<typeof projectRehabForProvider>[0]["entries"];
  techTasks?: Parameters<typeof projectTechForProvider>[0]["tasks"];
  carePlanEntries?: Parameters<typeof projectCarePlanForProvider>[0]["plans"];
  careCoordEpisodes?: Parameters<typeof projectCareCoordinationForProvider>[0]["episodes"];
  orders?: Parameters<typeof projectOrdersForProvider>[0]["orders"];
  medications?: Parameters<typeof projectMedicationMarForProvider>[0]["medications"];
  results?: Parameters<typeof projectResultsForProvider>[0]["results"];
  diagnosisEntries?: Parameters<typeof projectDiagnosisProblemForProvider>[0]["entries"];
  handoff?: ProviderLimitedHandoffProjection | null;
}): EnterpriseProviderClinicalWorkspaceSummary {
  const roleProfile = input.roleProfile ?? "ATTENDING_PHYSICIAN";
  return {
    certificationId: ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CERTIFICATION_ID,
    contractVersion: ENTERPRISE_PROVIDER_CLINICAL_WORKSPACE_CONTRACT_VERSION,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting: input.careSetting,
    roleProfile,
    createsProviderOrders: false,
    mutatesDiagnosis: false,
    mutatesProblemList: false,
    mutatesMar: false,
    performsMedicationReconciliation: false,
    acknowledgesResultsViaNote: false,
    authorizesDischarge: false,
    mutatesFinalDisposition: false,
    isDischargeSummary: false,
    isProcedureOrOperativeNote: false,
    rewritesD4b6CarePlans: false,
    rewritesD4b7Coordination: false,
    assignmentEqualsAuthorization: false,
    attestationReplacesAuthorship: false,
    cosignReplacesAuthorship: false,
    allowsSilentFinalizedMutation: false,
    trustsClientControlledIdentity: false,
    autoEmCoding: false,
    usesAmbientAi: false,
    independentSignatureEngine: false,
    usesD4b1Lifecycle: true,
    createsIndependentDocumentationEngine: false,
    replacesProviderDocumentationWorkspace: false,
    replacesInpatientProviderWorkspaceD4a26: false,
    replacesEncounterNote: false,
    composition: PROVIDER_CLINICAL_WORKSPACE_COMPOSITION,
    noteTypeCatalog: PROVIDER_NOTE_TYPE_REGISTRY,
    deferredNoteTypeIds: PROVIDER_NOTE_TYPE_DEFERRED_IDS,
    sections: providerWorkspaceSectionsForCareSetting(input.careSetting, { roleProfile }),
    documents: [...(input.documents ?? [])],
    censusRows: [...(input.censusRows ?? [])],
    nursingProjections: projectNursingForProvider({
      encounterId: input.encounterId,
      entries: input.nursingEntries,
    }),
    rtProjections: projectRtForProvider({
      encounterId: input.encounterId,
      entries: input.rtEntries,
    }),
    rehabProjections: projectRehabForProvider({
      encounterId: input.encounterId,
      entries: input.rehabEntries,
    }),
    techProjections: projectTechForProvider({
      encounterId: input.encounterId,
      tasks: input.techTasks,
    }),
    carePlanProjections: projectCarePlanForProvider({
      encounterId: input.encounterId,
      plans: input.carePlanEntries,
    }),
    careCoordinationProjections: projectCareCoordinationForProvider({
      encounterId: input.encounterId,
      episodes: input.careCoordEpisodes,
    }),
    orderProjections: projectOrdersForProvider({
      encounterId: input.encounterId,
      orders: input.orders,
    }),
    medicationMarProjections: projectMedicationMarForProvider({
      encounterId: input.encounterId,
      medications: input.medications,
    }),
    resultProjections: projectResultsForProvider({
      encounterId: input.encounterId,
      results: input.results,
    }),
    diagnosisProblemProjections: projectDiagnosisProblemForProvider({
      encounterId: input.encounterId,
      entries: input.diagnosisEntries,
    }),
    handoff: input.handoff ?? null,
  };
}
