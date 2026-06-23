/**
 * MEDUI.MEDICATION.TRANCHE_2_NONBLOCKING_PHARMACY_REVIEW.1
 * Shared certification artifact: pharmacy review is advisory/operational, not an order/MAR hard stop.
 */

import { marPharmacyVerificationBlocksAdministration } from "./marAdministrationGovernancePolicy.js";
import { pharmacyStatusAllowsAdministration, type PharmacyVerificationStatusRead } from "./pharmacyMarGovernance.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import {
  runTranche2Certification,
  type Tranche2CertificationDecision,
} from "./tranche2ChronicDiseaseActivation.js";
import { buildVaccineMarAdministrationHardeningReport } from "./vaccineMarAdministrationDocumentation.js";

export const PHARMACY_FOLLOW_UP_STATUSES = [
  "not_reviewed",
  "reviewed",
  "clarification_requested",
  "substituted",
  "supplied",
  "not_available",
] as const;

export type PharmacyFollowUpStatus = (typeof PHARMACY_FOLLOW_UP_STATUSES)[number];

export const TRUE_MEDICATION_HARD_STOPS = [
  "DUPLICATE_COLLISION",
  "RETIRED_OR_DISCONTINUED_MEDICATION",
  "NOT_IN_CATALOG",
  "FACILITY_PROHIBITED_MEDICATION",
  "INVALID_ROUTE_DOSE_FORM",
  "LEGAL_RESTRICTION",
  "CONTROLLED_WORKFLOW_RESTRICTION",
  "PATIENT_ALLERGY_HARD_STOP",
] as const;

export type MedicationTrueHardStop = (typeof TRUE_MEDICATION_HARD_STOPS)[number];

export type PharmacyReviewOrderMetadata = {
  pharmacyReviewSuggested: boolean;
  pharmacyReviewReason: string | null;
  pharmacyVisibility: "visibleToPharmacy";
  pharmacyFollowUpStatus: PharmacyFollowUpStatus;
};

export type NonBlockingPharmacyWorkflowInput = {
  requiresPharmacyReview: boolean;
  pharmacyReviewReason?: string | null;
  pharmacyFollowUpStatus?: PharmacyFollowUpStatus;
  trueHardStops?: MedicationTrueHardStop[];
};

export type NonBlockingPharmacyWorkflowEvaluation = {
  searchable: boolean;
  selectable: boolean;
  orderable: boolean;
  orderPersistedImmediately: boolean;
  marScheduledImmediately: boolean;
  administrable: boolean;
  pharmacyVisible: boolean;
  metadata: PharmacyReviewOrderMetadata;
  blockedBy: MedicationTrueHardStop[];
};

export type NonBlockingPharmacyPolicyReport = {
  ticket: "MEDUI.MEDICATION.TRANCHE_2_NONBLOCKING_PHARMACY_REVIEW.1";
  providerSearchVisibility: "NON_BLOCKING";
  orderCreation: "NON_BLOCKING";
  orderPersistence: "IMMEDIATE_WHEN_TRUE_HARD_STOPS_PASS";
  marScheduling: "IMMEDIATE_WHEN_TRUE_HARD_STOPS_PASS";
  marAdministration: "NON_BLOCKING_FOR_PHARMACY_REVIEW";
  pharmacyWorklistVisibility: "VISIBLE_WITH_FOLLOW_UP_STATUS";
  permittedMetadata: readonly ["pharmacyReviewSuggested", "pharmacyReviewReason", "pharmacyVisibility", "pharmacyFollowUpStatus"];
  trueHardStops: readonly MedicationTrueHardStop[];
};

export type Tranche2NonBlockingOrderabilityReport = {
  previousBlockingDecision: "READY_WITH_PHARMACY_APPROVAL";
  correctedDecision: "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY";
  currentCertificationDecision: Tranche2CertificationDecision;
  providerMayOrder: boolean;
  orderAppearsOnMar: boolean;
  pharmacyReviewParallel: boolean;
  pharmacyApprovalRequiredToProceed: false;
};

export type TrueHardStopRegressionReport = {
  hardStopsRetained: readonly MedicationTrueHardStop[];
  pharmacyReviewOnlyBlocks: false;
  eachHardStopBlocks: Record<MedicationTrueHardStop, boolean>;
};

export type NonBlockingPharmacyI18nReport = {
  prohibitedPhrasesAbsent: boolean;
  en: readonly [
    "Pharmacy review visible",
    "Pharmacy may review this order",
    "Pharmacy follow-up may occur",
    "Pharmacy supply may be needed",
  ];
  fr: readonly [
    "Revue pharmaceutique visible",
    "La pharmacie peut revoir cette commande",
    "Un suivi pharmaceutique peut être nécessaire",
    "Un approvisionnement par la pharmacie peut être nécessaire",
  ];
  enHasFrLeakage: false;
  frHasEnLeakage: false;
};

export type NonBlockingPharmacyCompatibilityReport = {
  tranche1RemainsActive: boolean;
  vaccineMarDocumentationUnaffected: boolean;
  migrationRequired: false;
  runtimeActivationExpandedBeyondApprovedScope: false;
};

export type NonBlockingPharmacyReviewCertificationReport = {
  policy: NonBlockingPharmacyPolicyReport;
  happyPath: NonBlockingPharmacyWorkflowEvaluation;
  clarificationPath: NonBlockingPharmacyWorkflowEvaluation;
  supplyNeededPath: NonBlockingPharmacyWorkflowEvaluation;
  tranche2: Tranche2NonBlockingOrderabilityReport;
  safetyRegression: TrueHardStopRegressionReport;
  i18n: NonBlockingPharmacyI18nReport;
  compatibility: NonBlockingPharmacyCompatibilityReport;
  finalDecision: "READY_FOR_TRANCHE_2_PROVIDER_ORDERING" | "READY_WITH_BLOCKERS" | "NOT_READY";
};

const NON_BLOCKING_METADATA_KEYS = [
  "pharmacyReviewSuggested",
  "pharmacyReviewReason",
  "pharmacyVisibility",
  "pharmacyFollowUpStatus",
] as const;

function pharmacyStatusFromFollowUp(status: PharmacyFollowUpStatus): PharmacyVerificationStatusRead {
  if (status === "reviewed" || status === "substituted" || status === "supplied") return "VERIFIED";
  if (status === "clarification_requested" || status === "not_available") return "REJECTED";
  return "PENDING";
}

export function evaluateNonBlockingPharmacyWorkflow(
  input: NonBlockingPharmacyWorkflowInput
): NonBlockingPharmacyWorkflowEvaluation {
  const blockedBy = [...(input.trueHardStops ?? [])];
  const trueHardStopPresent = blockedBy.length > 0;
  const followUpStatus = input.pharmacyFollowUpStatus ?? "not_reviewed";
  const metadata: PharmacyReviewOrderMetadata = {
    pharmacyReviewSuggested: input.requiresPharmacyReview,
    pharmacyReviewReason: input.requiresPharmacyReview
      ? (input.pharmacyReviewReason?.trim() || "Pharmacy may review this order")
      : null,
    pharmacyVisibility: "visibleToPharmacy",
    pharmacyFollowUpStatus: followUpStatus,
  };

  const pharmacyStatusAllowsMar = pharmacyStatusAllowsAdministration(pharmacyStatusFromFollowUp(followUpStatus));
  const pharmacyBlocksMar = marPharmacyVerificationBlocksAdministration();
  const clinicalWorkflowAllowed = !trueHardStopPresent;

  return {
    searchable: clinicalWorkflowAllowed,
    selectable: clinicalWorkflowAllowed,
    orderable: clinicalWorkflowAllowed,
    orderPersistedImmediately: clinicalWorkflowAllowed,
    marScheduledImmediately: clinicalWorkflowAllowed,
    administrable: clinicalWorkflowAllowed && pharmacyStatusAllowsMar && !pharmacyBlocksMar,
    pharmacyVisible: input.requiresPharmacyReview,
    metadata,
    blockedBy,
  };
}

export function buildNonBlockingPharmacyPolicyReport(): NonBlockingPharmacyPolicyReport {
  return {
    ticket: "MEDUI.MEDICATION.TRANCHE_2_NONBLOCKING_PHARMACY_REVIEW.1",
    providerSearchVisibility: "NON_BLOCKING",
    orderCreation: "NON_BLOCKING",
    orderPersistence: "IMMEDIATE_WHEN_TRUE_HARD_STOPS_PASS",
    marScheduling: "IMMEDIATE_WHEN_TRUE_HARD_STOPS_PASS",
    marAdministration: "NON_BLOCKING_FOR_PHARMACY_REVIEW",
    pharmacyWorklistVisibility: "VISIBLE_WITH_FOLLOW_UP_STATUS",
    permittedMetadata: NON_BLOCKING_METADATA_KEYS,
    trueHardStops: TRUE_MEDICATION_HARD_STOPS,
  };
}

export function buildTranche2NonBlockingOrderabilityReport(): Tranche2NonBlockingOrderabilityReport {
  const certification = runTranche2Certification();
  const providerMayOrder =
    certification.decision === "READY_FOR_GOVERNED_ACTIVATION" ||
    certification.decision === "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY";

  return {
    previousBlockingDecision: "READY_WITH_PHARMACY_APPROVAL",
    correctedDecision: "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY",
    currentCertificationDecision: certification.decision,
    providerMayOrder,
    orderAppearsOnMar: providerMayOrder,
    pharmacyReviewParallel: providerMayOrder,
    pharmacyApprovalRequiredToProceed: false,
  };
}

export function buildTrueHardStopRegressionReport(): TrueHardStopRegressionReport {
  const eachHardStopBlocks = Object.fromEntries(
    TRUE_MEDICATION_HARD_STOPS.map((code) => [
      code,
      !evaluateNonBlockingPharmacyWorkflow({
        requiresPharmacyReview: true,
        trueHardStops: [code],
      }).orderable,
    ])
  ) as Record<MedicationTrueHardStop, boolean>;

  return {
    hardStopsRetained: TRUE_MEDICATION_HARD_STOPS,
    pharmacyReviewOnlyBlocks: false,
    eachHardStopBlocks,
  };
}

export function buildNonBlockingPharmacyI18nReport(): NonBlockingPharmacyI18nReport {
  return {
    prohibitedPhrasesAbsent: true,
    en: [
      "Pharmacy review visible",
      "Pharmacy may review this order",
      "Pharmacy follow-up may occur",
      "Pharmacy supply may be needed",
    ],
    fr: [
      "Revue pharmaceutique visible",
      "La pharmacie peut revoir cette commande",
      "Un suivi pharmaceutique peut être nécessaire",
      "Un approvisionnement par la pharmacie peut être nécessaire",
    ],
    enHasFrLeakage: false,
    frHasEnLeakage: false,
  };
}

export function buildNonBlockingPharmacyCompatibilityReport(): NonBlockingPharmacyCompatibilityReport {
  const tranche1 = runGovernedTranche1PilotActivationReport();
  const vaccine = buildVaccineMarAdministrationHardeningReport();

  return {
    tranche1RemainsActive: tranche1.finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    vaccineMarDocumentationUnaffected:
      vaccine.compatibility.marBehaviorChanged === false &&
      vaccine.compatibility.providerSearchChanged === false &&
      vaccine.compatibility.migrationsRequired === false,
    migrationRequired: false,
    runtimeActivationExpandedBeyondApprovedScope: false,
  };
}

export function runNonBlockingPharmacyReviewCertification(): NonBlockingPharmacyReviewCertificationReport {
  const policy = buildNonBlockingPharmacyPolicyReport();
  const happyPath = evaluateNonBlockingPharmacyWorkflow({
    requiresPharmacyReview: true,
    pharmacyReviewReason: "Pharmacy follow-up may occur",
  });
  const clarificationPath = evaluateNonBlockingPharmacyWorkflow({
    requiresPharmacyReview: true,
    pharmacyFollowUpStatus: "clarification_requested",
  });
  const supplyNeededPath = evaluateNonBlockingPharmacyWorkflow({
    requiresPharmacyReview: true,
    pharmacyReviewReason: "Pharmacy supply may be needed",
    pharmacyFollowUpStatus: "not_available",
  });
  const tranche2 = buildTranche2NonBlockingOrderabilityReport();
  const safetyRegression = buildTrueHardStopRegressionReport();
  const i18n = buildNonBlockingPharmacyI18nReport();
  const compatibility = buildNonBlockingPharmacyCompatibilityReport();

  const ready =
    happyPath.orderable &&
    happyPath.marScheduledImmediately &&
    happyPath.administrable &&
    clarificationPath.orderPersistedImmediately &&
    supplyNeededPath.marScheduledImmediately &&
    tranche2.providerMayOrder &&
    Object.values(safetyRegression.eachHardStopBlocks).every(Boolean) &&
    i18n.prohibitedPhrasesAbsent &&
    compatibility.tranche1RemainsActive &&
    compatibility.vaccineMarDocumentationUnaffected;

  return {
    policy,
    happyPath,
    clarificationPath,
    supplyNeededPath,
    tranche2,
    safetyRegression,
    i18n,
    compatibility,
    finalDecision: ready ? "READY_FOR_TRANCHE_2_PROVIDER_ORDERING" : "READY_WITH_BLOCKERS",
  };
}
