/**
 * Phase 19G — Controlled activation gate evaluation (no runtime bypass).
 */

import {
  isGovernanceBlocked,
  isGovernanceResolvedForPromotion,
  parsePriorityErGovernance,
  type PriorityErGovernanceMeta,
} from "./priority-er-inventory-governance.util";
import {
  deriveRuntimeActivationState,
  type ProductRuntimeActivationMeta,
} from "./medication-product-runtime-activation.util";

export type ActivationGateBlockerCode =
  | "DUPLICATE_GOVERNANCE_UNRESOLVED"
  | "DUPLICATE_GOVERNANCE_BLOCKED"
  | "GOVERNANCE_REVIEW_REQUIRED"
  | "GOVERNANCE_BLOCKED"
  | "GOVERNANCE_RETIRED"
  | "CONFIRM_EXACT_SOURCE_REQUIRED"
  | "CONFIRM_DUPLICATE_RESOLVED_REQUIRED"
  | "NOTE_REQUIRED"
  | "FORMULARY_NOT_APPROVED"
  | "ORDER_SEARCH_NOT_ENABLED"
  | "PRODUCT_INACTIVE"
  | "CONCEPT_INACTIVE"
  | "FACILITY_FORMULARY_MISSING"
  | "MISSING_EXACT_NAME_DOSE_FORM"
  | "NDC_REVIEW_REQUIRED"
  | "BILLING_REVIEW_REQUIRED"
  | "BILLING_CODE_REQUIRED"
  | "BILLING_UNIT_REQUIRED"
  | "BILLING_ROLE_REQUIRED"
  | "ADMINISTRATION_ROUTE_UNSAFE"
  | "ALREADY_ORDER_SEARCH_ENABLED"
  | "ALREADY_MAR_ENABLED"
  | "ALREADY_BILLING_ENABLED";

export type ActivationGateEvaluation = {
  allowed: boolean;
  blockers: ActivationGateBlockerCode[];
};

const SAFE_MAR_ADMIN_TYPES = new Set(["ORAL", "IM", "SQ", "PUSH", "INFUSION"]);

function baseConfirmBlockers(params: {
  confirmExactSourcePreserved: boolean;
  confirmDuplicateGovernanceResolved: boolean;
  note: string;
}): ActivationGateBlockerCode[] {
  const blockers: ActivationGateBlockerCode[] = [];
  if (!params.confirmExactSourcePreserved) blockers.push("CONFIRM_EXACT_SOURCE_REQUIRED");
  if (!params.confirmDuplicateGovernanceResolved) {
    blockers.push("CONFIRM_DUPLICATE_RESOLVED_REQUIRED");
  }
  if (!params.note?.trim()) blockers.push("NOTE_REQUIRED");
  return blockers;
}

export function evaluateDuplicateGovernanceForActivation(
  stagingGovernance: PriorityErGovernanceMeta | null,
  reconciliationStatus: string | null,
  reviewFlags: string[]
): ActivationGateEvaluation {
  if (!stagingGovernance) {
    return { allowed: true, blockers: [] };
  }
  if (isGovernanceBlocked(stagingGovernance, reviewFlags)) {
    return { allowed: false, blockers: ["DUPLICATE_GOVERNANCE_BLOCKED"] };
  }
  const status = reconciliationStatus?.trim().toUpperCase() ?? "";
  if (status === "POSSIBLE_DUPLICATE" && !isGovernanceResolvedForPromotion(stagingGovernance, status)) {
    return { allowed: false, blockers: ["DUPLICATE_GOVERNANCE_UNRESOLVED"] };
  }
  if (!isGovernanceResolvedForPromotion(stagingGovernance, status)) {
    return { allowed: false, blockers: ["DUPLICATE_GOVERNANCE_UNRESOLVED"] };
  }
  return { allowed: true, blockers: [] };
}

export function evaluateApproveFormularyGate(params: {
  governanceStatus: string;
  confirmExactSourcePreserved: boolean;
  confirmDuplicateGovernanceResolved: boolean;
  note: string;
  duplicateGate: ActivationGateEvaluation;
  hasExactSourceFields: boolean;
  facilityFormularyExists: boolean;
}): ActivationGateEvaluation {
  const blockers = [
    ...baseConfirmBlockers(params),
    ...params.duplicateGate.blockers,
  ];
  if (!params.hasExactSourceFields) blockers.push("MISSING_EXACT_NAME_DOSE_FORM");
  if (params.governanceStatus === "REVIEW_REQUIRED") blockers.push("GOVERNANCE_REVIEW_REQUIRED");
  if (params.governanceStatus === "BLOCKED") blockers.push("GOVERNANCE_BLOCKED");
  if (params.governanceStatus === "RETIRED") blockers.push("GOVERNANCE_RETIRED");
  if (!params.facilityFormularyExists) blockers.push("FACILITY_FORMULARY_MISSING");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function evaluateEnableOrderSearchGate(params: {
  governanceStatus: string;
  productIsActive: boolean;
  conceptIsActive: boolean;
  runtime: ProductRuntimeActivationMeta;
  confirmExactSourcePreserved: boolean;
  confirmDuplicateGovernanceResolved: boolean;
  note: string;
  duplicateGate: ActivationGateEvaluation;
  formularyOnFormulary: boolean;
  ndcReviewRequired: boolean;
}): ActivationGateEvaluation {
  const blockers = [
    ...baseConfirmBlockers(params),
    ...params.duplicateGate.blockers,
  ];
  if (params.governanceStatus === "REVIEW_REQUIRED") blockers.push("GOVERNANCE_REVIEW_REQUIRED");
  if (params.governanceStatus === "BLOCKED") blockers.push("GOVERNANCE_BLOCKED");
  if (params.governanceStatus === "RETIRED") blockers.push("GOVERNANCE_RETIRED");
  if (!params.runtime.formularyApprovedInactive && !params.formularyOnFormulary) {
    blockers.push("FORMULARY_NOT_APPROVED");
  }
  if (params.ndcReviewRequired) blockers.push("NDC_REVIEW_REQUIRED");
  if (params.runtime.orderSearchEnabled) blockers.push("ALREADY_ORDER_SEARCH_ENABLED");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function evaluateEnableMarGate(params: {
  runtime: ProductRuntimeActivationMeta;
  administrationType: string;
  confirmExactSourcePreserved: boolean;
  confirmDuplicateGovernanceResolved: boolean;
  note: string;
  duplicateGate: ActivationGateEvaluation;
}): ActivationGateEvaluation {
  const blockers = [
    ...baseConfirmBlockers(params),
    ...params.duplicateGate.blockers,
  ];
  if (!params.runtime.orderSearchEnabled) blockers.push("ORDER_SEARCH_NOT_ENABLED");
  if (params.runtime.marEnabled) blockers.push("ALREADY_MAR_ENABLED");
  const admin = params.administrationType.trim().toUpperCase();
  if (!SAFE_MAR_ADMIN_TYPES.has(admin)) blockers.push("ADMINISTRATION_ROUTE_UNSAFE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function evaluateEnableBillingGate(params: {
  runtime: ProductRuntimeActivationMeta;
  reviewedBillingCode: string;
  reviewedBillingUnit: string;
  reviewedByRole: string;
  confirmExactSourcePreserved: boolean;
  confirmDuplicateGovernanceResolved: boolean;
  note: string;
  duplicateGate: ActivationGateEvaluation;
}): ActivationGateEvaluation {
  const blockers = [
    ...baseConfirmBlockers(params),
    ...params.duplicateGate.blockers,
  ];
  if (!params.runtime.orderSearchEnabled) blockers.push("ORDER_SEARCH_NOT_ENABLED");
  if (params.runtime.billingEnabled) blockers.push("ALREADY_BILLING_ENABLED");
  const code = params.reviewedBillingCode.trim();
  const unit = params.reviewedBillingUnit.trim();
  const role = params.reviewedByRole.trim();
  if (!code || code === "UNKNOWN" || code === "TBD") blockers.push("BILLING_CODE_REQUIRED");
  if (!unit || unit === "UNKNOWN" || unit === "TBD") blockers.push("BILLING_UNIT_REQUIRED");
  if (!role) blockers.push("BILLING_ROLE_REQUIRED");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function evaluateProviderOrderSearchGate(params: {
  productIsActive: boolean;
  conceptIsActive: boolean;
  governanceStatus: string;
  formularyOnFormulary: boolean;
  facilityId: string;
  formularyFacilityId: string | null;
  runtime: ProductRuntimeActivationMeta;
  stagingGovernance: PriorityErGovernanceMeta | null;
  reconciliationStatus: string | null;
  reviewFlags: string[];
  /** M1.5E Haiti backfill: inactive canonical link must not suppress legacy catalog search until M1.5F. */
  linkageOnlyHaitiM15e?: boolean;
}): ActivationGateEvaluation {
  const blockers: ActivationGateBlockerCode[] = [];

  if (params.formularyFacilityId && params.formularyFacilityId !== params.facilityId) {
    return { allowed: false, blockers: ["FACILITY_FORMULARY_MISSING"] };
  }

  const dup = evaluateDuplicateGovernanceForActivation(
    params.stagingGovernance,
    params.reconciliationStatus,
    params.reviewFlags
  );
  blockers.push(...dup.blockers);

  /**
   * M1.7C.12B — Legacy catalog preservation: inactive enterprise product pending activation
   * must not suppress provider search. Extends M1.5E Haiti linkage-only exception.
   */
  if (
    !params.productIsActive &&
    !params.runtime.orderSearchEnabled &&
    params.governanceStatus !== "BLOCKED" &&
    params.governanceStatus !== "RETIRED"
  ) {
    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
  }

  if (
    params.linkageOnlyHaitiM15e === true &&
    !params.runtime.orderSearchEnabled &&
    !params.productIsActive
  ) {
    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
  }

  if (!params.productIsActive) blockers.push("PRODUCT_INACTIVE");
  if (!params.conceptIsActive) blockers.push("CONCEPT_INACTIVE");
  if (!params.runtime.orderSearchEnabled) blockers.push("ORDER_SEARCH_NOT_ENABLED");
  if (!params.formularyOnFormulary) blockers.push("FORMULARY_NOT_APPROVED");
  if (params.governanceStatus === "BLOCKED" || params.governanceStatus === "RETIRED") {
    blockers.push("GOVERNANCE_BLOCKED");
  }

  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function parseStagingGovernanceFromRow(rawJson: unknown): PriorityErGovernanceMeta {
  return parsePriorityErGovernance(rawJson);
}

export { deriveRuntimeActivationState };
