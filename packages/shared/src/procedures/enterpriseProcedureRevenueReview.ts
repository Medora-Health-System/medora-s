import { enterpriseProcedureById, type EnterpriseProcedureCategory } from "./enterpriseProcedureCatalog.js";
import {
  isEnterpriseProcedureBillableReviewMetadata,
} from "./enterpriseProcedureBillableReview.js";
import type { EnterpriseProcedureBillableReviewMetadata } from "./enterpriseProcedureBillableReviewTypes.js";
import type {
  EnterpriseProcedureRevenueReviewMetadataExtension,
  ProcedureBillingSideReview,
  ProcedureRevenueReviewDecisionAction,
  ProcedureRevenueReviewDecisionRecord,
  ProcedureRevenueReviewReasonCode,
  ProcedureRevenueReviewStatus,
} from "./enterpriseProcedureRevenueReviewTypes.js";

export const FORBIDDEN_PROCEDURE_REVENUE_REVIEW_KEYS = [
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
  "clinicalNote",
  "procedureNarrative",
  "clinicalSummaryFr",
  "hpi",
  "mdm",
  "ros",
  "reimbursementAmount",
] as const;

export type EnterpriseProcedureBillableReviewMetadataWithGovernance =
  EnterpriseProcedureBillableReviewMetadata & EnterpriseProcedureRevenueReviewMetadataExtension;

export function isEnterpriseProcedureBillableReviewMetadataWithGovernance(
  metadata: unknown
): metadata is EnterpriseProcedureBillableReviewMetadataWithGovernance {
  return isEnterpriseProcedureBillableReviewMetadata(metadata);
}

export function deriveInitialProcedureRevenueReviewStatus(
  meta: Pick<
    EnterpriseProcedureBillableReviewMetadata,
    | "requiresDocumentationReview"
    | "requiresCoderReview"
    | "requiresFacilityChargeMaster"
    | "mappingStatus"
  >
): ProcedureRevenueReviewStatus {
  if (meta.requiresDocumentationReview) return "NEEDS_DOCUMENTATION";
  if (meta.requiresFacilityChargeMaster) return "NEEDS_CHARGE_MASTER_MAPPING";
  if (meta.requiresCoderReview || meta.mappingStatus === "CODER_REVIEW_REQUIRED") {
    return "NEEDS_CODER_REVIEW";
  }
  if (meta.mappingStatus === "INSTITUTION_POLICY_REQUIRED") return "REQUIRES_PROFESSIONAL_REVIEW";
  return "CAPTURED";
}

export function classifyProcedureBillingSideReview(input: {
  enterpriseProcedureId: string;
  billingClassification?: string | null;
}): ProcedureBillingSideReview {
  const entry = enterpriseProcedureById(input.enterpriseProcedureId);
  const category = entry?.category as EnterpriseProcedureCategory | undefined;
  const classification = String(input.billingClassification ?? "").trim().toUpperCase();

  if (entry?.id === "ekg_ecg" || entry?.id === "endotracheal_intubation") {
    if (classification === "EMERGENCY_DEPARTMENT") return "BOTH_REVIEW_REQUIRED";
  }

  if (category === "GU" || category === "NURSING_TASK" || category === "MONITORING") {
    return "FACILITY";
  }
  if (
    category === "AIRWAY" ||
    category === "WOUND_CARE" ||
    category === "VASCULAR_ACCESS" ||
    category === "SEDATION" ||
    category === "NEURO" ||
    category === "ORTHOPEDIC"
  ) {
    return classification === "EMERGENCY_DEPARTMENT" ? "BOTH_REVIEW_REQUIRED" : "PROFESSIONAL";
  }
  if (category === "CARDIAC_RESPIRATORY") {
    return "UNKNOWN_REVIEW_REQUIRED";
  }
  if (classification === "EMERGENCY_DEPARTMENT" || classification === "INPATIENT") {
    return "BOTH_REVIEW_REQUIRED";
  }
  return "PROFESSIONAL";
}

export function mapProcedureRevenueDecisionToReviewStatus(
  decision: ProcedureRevenueReviewDecisionAction
): ProcedureRevenueReviewStatus {
  switch (decision) {
    case "APPROVE_FOR_EXPORT_REVIEW":
      return "APPROVED_FOR_EXPORT";
    case "HOLD_FOR_DOCUMENTATION":
      return "NEEDS_DOCUMENTATION";
    case "HOLD_FOR_CODER_REVIEW":
      return "NEEDS_CODER_REVIEW";
    case "HOLD_FOR_CHARGE_MASTER":
      return "NEEDS_CHARGE_MASTER_MAPPING";
    case "REJECT_NOT_BILLABLE":
      return "REJECTED_NOT_BILLABLE";
    case "REQUEST_PROVIDER_CLARIFICATION":
      return "HELD";
    case "MARK_DUPLICATE_REVIEW":
      return "HELD";
    default:
      return "CAPTURED";
  }
}

export function recommendProcedureRevenueReviewDecision(meta: Pick<
  EnterpriseProcedureBillableReviewMetadata,
  | "requiresDocumentationReview"
  | "requiresCoderReview"
  | "requiresFacilityChargeMaster"
>): ProcedureRevenueReviewDecisionAction | undefined {
  if (meta.requiresDocumentationReview) return "HOLD_FOR_DOCUMENTATION";
  if (meta.requiresFacilityChargeMaster) return "HOLD_FOR_CHARGE_MASTER";
  if (meta.requiresCoderReview) return "HOLD_FOR_CODER_REVIEW";
  return undefined;
}

export function resolveProcedureRevenueReviewStatus(
  metadata: unknown,
  ledgerReviewStatus?: string | null
): ProcedureRevenueReviewStatus {
  if (!isEnterpriseProcedureBillableReviewMetadata(metadata)) return "CAPTURED";
  const ext = metadata as EnterpriseProcedureBillableReviewMetadataWithGovernance;
  if (ext.revenueReviewStatus) return ext.revenueReviewStatus;
  if (ledgerReviewStatus === "REVIEWED") return "APPROVED_FOR_EXPORT";
  if (ledgerReviewStatus === "SKIPPED") return "REJECTED_NOT_BILLABLE";
  return deriveInitialProcedureRevenueReviewStatus(ext);
}

export function readProcedureRevenueReviewDecisionHistory(
  metadata: unknown
): ProcedureRevenueReviewDecisionRecord[] {
  if (!isEnterpriseProcedureBillableReviewMetadata(metadata)) return [];
  const ext = metadata as EnterpriseProcedureRevenueReviewMetadataExtension;
  return Array.isArray(ext.decisionHistory) ? [...ext.decisionHistory] : [];
}

export function appendProcedureRevenueReviewDecision(
  metadata: EnterpriseProcedureBillableReviewMetadataWithGovernance,
  record: ProcedureRevenueReviewDecisionRecord
): EnterpriseProcedureBillableReviewMetadataWithGovernance {
  const history = readProcedureRevenueReviewDecisionHistory(metadata);
  return {
    ...metadata,
    medproc7: true,
    revenueReviewStatus: record.reviewStatusAfter,
    decisionHistory: [...history, record],
  };
}

export function validateProcedureRevenueReviewReasonForAction(
  decision: ProcedureRevenueReviewDecisionAction,
  reasonCode: ProcedureRevenueReviewReasonCode
): boolean {
  if (decision === "HOLD_FOR_DOCUMENTATION") {
    return reasonCode === "DOCUMENTATION_MISSING" || reasonCode === "OTHER_REVIEW_REQUIRED";
  }
  if (decision === "HOLD_FOR_CHARGE_MASTER") {
    return reasonCode === "CHARGE_MASTER_MISSING" || reasonCode === "OTHER_REVIEW_REQUIRED";
  }
  if (decision === "HOLD_FOR_CODER_REVIEW") {
    return reasonCode === "CODER_REVIEW_REQUIRED" || reasonCode === "OTHER_REVIEW_REQUIRED";
  }
  if (decision === "REJECT_NOT_BILLABLE") {
    return reasonCode === "NOT_BILLABLE_PER_POLICY" || reasonCode === "OTHER_REVIEW_REQUIRED";
  }
  if (decision === "MARK_DUPLICATE_REVIEW") {
    return reasonCode === "DUPLICATE_PROCEDURE_EVENT" || reasonCode === "OTHER_REVIEW_REQUIRED";
  }
  if (decision === "REQUEST_PROVIDER_CLARIFICATION") {
    return (
      reasonCode === "PROFESSIONAL_REVIEW_REQUIRED" ||
      reasonCode === "FACILITY_REVIEW_REQUIRED" ||
      reasonCode === "OTHER_REVIEW_REQUIRED"
    );
  }
  if (decision === "APPROVE_FOR_EXPORT_REVIEW") {
    return true;
  }
  return true;
}
