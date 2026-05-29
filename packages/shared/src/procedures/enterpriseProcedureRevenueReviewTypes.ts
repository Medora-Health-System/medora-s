import type { ProcedureChargeMappingStatus } from "./enterpriseProcedureBillingReadinessTypes.js";

export const PROCEDURE_REVENUE_REVIEW_STATUSES = [
  "CAPTURED",
  "NEEDS_CODER_REVIEW",
  "NEEDS_DOCUMENTATION",
  "NEEDS_CHARGE_MASTER_MAPPING",
  "HELD",
  "APPROVED_FOR_EXPORT",
  "REJECTED_NOT_BILLABLE",
  "REQUIRES_FACILITY_REVIEW",
  "REQUIRES_PROFESSIONAL_REVIEW",
] as const;

export type ProcedureRevenueReviewStatus = (typeof PROCEDURE_REVENUE_REVIEW_STATUSES)[number];

export const PROCEDURE_REVENUE_REVIEW_DECISION_ACTIONS = [
  "APPROVE_FOR_EXPORT_REVIEW",
  "HOLD_FOR_DOCUMENTATION",
  "HOLD_FOR_CODER_REVIEW",
  "HOLD_FOR_CHARGE_MASTER",
  "REJECT_NOT_BILLABLE",
  "REQUEST_PROVIDER_CLARIFICATION",
  "MARK_DUPLICATE_REVIEW",
] as const;

export type ProcedureRevenueReviewDecisionAction =
  (typeof PROCEDURE_REVENUE_REVIEW_DECISION_ACTIONS)[number];

export const PROCEDURE_REVENUE_REVIEW_REASON_CODES = [
  "DOCUMENTATION_MISSING",
  "CHARGE_MASTER_MISSING",
  "CODER_REVIEW_REQUIRED",
  "DUPLICATE_PROCEDURE_EVENT",
  "NOT_BILLABLE_PER_POLICY",
  "FACILITY_REVIEW_REQUIRED",
  "PROFESSIONAL_REVIEW_REQUIRED",
  "OTHER_REVIEW_REQUIRED",
] as const;

export type ProcedureRevenueReviewReasonCode = (typeof PROCEDURE_REVENUE_REVIEW_REASON_CODES)[number];

export const PROCEDURE_BILLING_SIDE_REVIEW_VALUES = [
  "PROFESSIONAL",
  "FACILITY",
  "BOTH_REVIEW_REQUIRED",
  "UNKNOWN_REVIEW_REQUIRED",
] as const;

export type ProcedureBillingSideReview = (typeof PROCEDURE_BILLING_SIDE_REVIEW_VALUES)[number];

export type ProcedureRevenueReviewDecisionRecord = {
  decision: ProcedureRevenueReviewDecisionAction;
  reasonCode: ProcedureRevenueReviewReasonCode;
  decidedAt: string;
  decidedByUserId: string;
  reviewStatusBefore: ProcedureRevenueReviewStatus;
  reviewStatusAfter: ProcedureRevenueReviewStatus;
  /** Optional reviewer note — must not contain PHI. */
  note?: string;
};

/** MEDPROC.7 fields stored on BillingEvent.metadata (additive to MEDPROC.6). */
export type EnterpriseProcedureRevenueReviewMetadataExtension = {
  medproc7?: true;
  revenueReviewStatus?: ProcedureRevenueReviewStatus;
  procedureBillingSideReview?: ProcedureBillingSideReview;
  decisionHistory?: ProcedureRevenueReviewDecisionRecord[];
  orphanWarning?: boolean;
  duplicateReviewWarning?: boolean;
};

export type ProcedureRevenueReviewQueueRow = {
  billingEventId: string;
  orderItemId: string;
  encounterId: string;
  enterpriseProcedureId: string;
  displayNameEn: string;
  displayNameFr: string;
  encounterDate: string;
  billingClassification: string | null;
  mappingStatus: ProcedureChargeMappingStatus;
  documentationLinked: boolean;
  facilityChargeMasterLinked: boolean;
  requiresDocumentationReview: boolean;
  requiresCoderReview: boolean;
  revenueReviewStatus: ProcedureRevenueReviewStatus;
  procedureBillingSideReview: ProcedureBillingSideReview;
  reviewWarnings: string[];
  ledgerReviewStatus: string;
  recommendedDecision?: ProcedureRevenueReviewDecisionAction;
  orphanWarning: boolean;
  duplicateReviewWarning: boolean;
  previewOnly: true;
};
