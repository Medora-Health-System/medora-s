import type { EnterpriseProcedureDefaultCodeCandidate } from "./enterpriseProcedureBillingReadinessTypes.js";
import type {
  ProcedureBillingReadinessReason,
  ProcedureBillingReadinessStatus,
  ProcedureChargeMappingStatus,
} from "./enterpriseProcedureBillingReadinessTypes.js";

export const ENTERPRISE_PROCEDURE_BILLABLE_REVIEW_SOURCE_TYPE = "PROCEDURE_ORDER" as const;

export type EnterpriseProcedureBillableReviewMetadata = {
  medproc6: true;
  sourceType: typeof ENTERPRISE_PROCEDURE_BILLABLE_REVIEW_SOURCE_TYPE;
  enterpriseProcedureId: string;
  orderItemId: string;
  encounterId: string;
  mappingStatus: ProcedureChargeMappingStatus;
  readinessStatus: ProcedureBillingReadinessStatus;
  documentationLinked: boolean;
  facilityChargeMasterLinked: boolean;
  requiresDocumentationReview: boolean;
  requiresCoderReview: boolean;
  requiresFacilityChargeMaster: boolean;
  previewCodeCandidates: EnterpriseProcedureDefaultCodeCandidate[];
  reasons: ProcedureBillingReadinessReason[];
  warnings: string[];
};

export type EnterpriseProcedureBillableReviewEventSummary = {
  billingEventId: string;
  orderItemId: string;
  enterpriseProcedureId: string;
  displayNameEn: string;
  displayNameFr: string;
  mappingStatus: ProcedureChargeMappingStatus;
  readinessStatus: ProcedureBillingReadinessStatus;
  documentationLinked: boolean;
  facilityChargeMasterLinked: boolean;
  requiresDocumentationReview: boolean;
  requiresCoderReview: boolean;
  reviewWarnings: string[];
  reviewStatus: string;
  createdAt: string;
};
