import { enterpriseProcedureById } from "./enterpriseProcedureCatalog.js";
import type {
  EnterpriseProcedureBillableReviewEventSummary,
  EnterpriseProcedureBillableReviewMetadata,
} from "./enterpriseProcedureBillableReviewTypes.js";
import type { ProcedureBillingReadinessStatus } from "./enterpriseProcedureBillingReadinessTypes.js";
import type { ResolveProcedureBillingReadinessOutput } from "./resolveProcedureBillingReadiness.js";

export const FORBIDDEN_ENTERPRISE_PROCEDURE_BILLABLE_REVIEW_METADATA_KEYS = [
  "patientName",
  "firstName",
  "lastName",
  "mrn",
  "manualLabel",
  "notes",
  "chiefComplaint",
  "memberId",
  "policyNumber",
  "payerName",
  "providerName",
  "diagnosisText",
  "clinicalSummaryFr",
  "clinicalSummary",
  "hpi",
  "mdm",
  "ros",
  "procedureNote",
  "narrative",
] as const;

export type EvaluateEnterpriseProcedureBillableReviewEligibilityInput = {
  enterpriseProcedureId?: string | null;
  readinessStatus: ProcedureBillingReadinessStatus;
  orderCompleted: boolean;
  orderCancelled: boolean;
};

export function evaluateEnterpriseProcedureBillableReviewEligibility(
  input: EvaluateEnterpriseProcedureBillableReviewEligibilityInput
): boolean {
  if (!String(input.enterpriseProcedureId ?? "").trim()) return false;
  if (!input.orderCompleted) return false;
  if (input.orderCancelled) return false;
  if (input.readinessStatus === "NOT_READY") return false;
  if (input.readinessStatus === "NOT_APPLICABLE") return false;
  return true;
}

export function buildEnterpriseProcedureBillableReviewMetadata(input: {
  enterpriseProcedureId: string;
  orderItemId: string;
  encounterId: string;
  readiness: ResolveProcedureBillingReadinessOutput;
  documentationLinked: boolean;
  facilityChargeMasterLinked: boolean;
}): EnterpriseProcedureBillableReviewMetadata {
  return {
    medproc6: true,
    sourceType: "PROCEDURE_ORDER",
    enterpriseProcedureId: input.enterpriseProcedureId.trim(),
    orderItemId: input.orderItemId.trim(),
    encounterId: input.encounterId.trim(),
    mappingStatus: input.readiness.mappingStatus,
    readinessStatus: input.readiness.readinessStatus,
    documentationLinked: input.documentationLinked,
    facilityChargeMasterLinked: input.facilityChargeMasterLinked,
    requiresDocumentationReview: input.readiness.requiresDocumentationReview,
    requiresCoderReview: input.readiness.requiresCoderReview,
    requiresFacilityChargeMaster: input.readiness.requiresFacilityChargeMaster,
    previewCodeCandidates: input.readiness.defaultCodeCandidates,
    reasons: [...input.readiness.reasons],
    warnings: [...input.readiness.warnings],
  };
}

export function isEnterpriseProcedureBillableReviewMetadata(
  metadata: unknown
): metadata is EnterpriseProcedureBillableReviewMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const row = metadata as Record<string, unknown>;
  return row.medproc6 === true && row.sourceType === "PROCEDURE_ORDER";
}

export function parseEnterpriseProcedureBillableReviewEventSummary(input: {
  billingEventId: string;
  orderItemId: string;
  metadata: unknown;
  reviewStatus: string;
  createdAt: string;
}): EnterpriseProcedureBillableReviewEventSummary | null {
  if (!isEnterpriseProcedureBillableReviewMetadata(input.metadata)) return null;
  const meta = input.metadata;
  const catalog = enterpriseProcedureById(meta.enterpriseProcedureId);
  const reviewWarnings = [
    ...meta.warnings,
    ...(meta.requiresDocumentationReview ? ["DOCUMENTATION_REVIEW"] : []),
    ...(meta.requiresCoderReview ? ["CODER_REVIEW"] : []),
    ...(meta.requiresFacilityChargeMaster ? ["FACILITY_CHARGE_MASTER"] : []),
  ];
  return {
    billingEventId: input.billingEventId,
    orderItemId: input.orderItemId,
    enterpriseProcedureId: meta.enterpriseProcedureId,
    displayNameEn: catalog?.displayNameEn ?? meta.enterpriseProcedureId,
    displayNameFr: catalog?.displayNameFr ?? meta.enterpriseProcedureId,
    mappingStatus: meta.mappingStatus,
    readinessStatus: meta.readinessStatus,
    documentationLinked: meta.documentationLinked,
    facilityChargeMasterLinked: meta.facilityChargeMasterLinked,
    requiresDocumentationReview: meta.requiresDocumentationReview,
    requiresCoderReview: meta.requiresCoderReview,
    reviewWarnings: [...new Set(reviewWarnings)],
    reviewStatus: input.reviewStatus,
    createdAt: input.createdAt,
  };
}
