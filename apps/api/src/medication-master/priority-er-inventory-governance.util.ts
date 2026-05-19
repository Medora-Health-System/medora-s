/**
 * Phase 19F — Priority ER staging duplicate governance (stored in rawJson.__governance, no migration).
 */

export const GOVERNANCE_REVIEW_FLAG_BLOCKED = "GOVERNANCE_BLOCKED";

export type DuplicateGovernanceStatus =
  | "UNREVIEWED"
  | "LINK_TO_EXISTING"
  | "CREATE_NEW_APPROVED"
  | "BLOCKED_DUPLICATE"
  | "NEEDS_PHARMACY_REVIEW"
  | "NEEDS_BILLING_REVIEW"
  | "NEEDS_NDC_REVIEW";

export const DUPLICATE_GOVERNANCE_STATUSES: DuplicateGovernanceStatus[] = [
  "UNREVIEWED",
  "LINK_TO_EXISTING",
  "CREATE_NEW_APPROVED",
  "BLOCKED_DUPLICATE",
  "NEEDS_PHARMACY_REVIEW",
  "NEEDS_BILLING_REVIEW",
  "NEEDS_NDC_REVIEW",
];

export type PriorityErGovernanceMeta = {
  duplicateResolutionStatus: DuplicateGovernanceStatus;
  duplicateResolutionNote: string | null;
  linkedConceptId: string | null;
  linkedProductId: string | null;
  duplicateOfStagingRowId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  governanceDecision: DuplicateGovernanceStatus;
};

export function defaultPriorityErGovernanceMeta(): PriorityErGovernanceMeta {
  return {
    duplicateResolutionStatus: "UNREVIEWED",
    duplicateResolutionNote: null,
    linkedConceptId: null,
    linkedProductId: null,
    duplicateOfStagingRowId: null,
    reviewedByUserId: null,
    reviewedAt: null,
    governanceDecision: "UNREVIEWED",
  };
}

export function parsePriorityErGovernance(rawJson: unknown): PriorityErGovernanceMeta {
  const base = defaultPriorityErGovernanceMeta();
  if (rawJson == null || typeof rawJson !== "object" || Array.isArray(rawJson)) return base;
  const gov = (rawJson as Record<string, unknown>).__governance;
  if (gov == null || typeof gov !== "object" || Array.isArray(gov)) return base;
  const o = gov as Record<string, unknown>;
  const status = typeof o.duplicateResolutionStatus === "string" ? o.duplicateResolutionStatus : "";
  const decision = typeof o.governanceDecision === "string" ? o.governanceDecision : "";
  const resolvedStatus = DUPLICATE_GOVERNANCE_STATUSES.includes(status as DuplicateGovernanceStatus)
    ? (status as DuplicateGovernanceStatus)
    : base.duplicateResolutionStatus;
  const resolvedDecision = DUPLICATE_GOVERNANCE_STATUSES.includes(decision as DuplicateGovernanceStatus)
    ? (decision as DuplicateGovernanceStatus)
    : resolvedStatus;
  return {
    duplicateResolutionStatus: resolvedStatus,
    duplicateResolutionNote:
      typeof o.duplicateResolutionNote === "string" ? o.duplicateResolutionNote : null,
    linkedConceptId: typeof o.linkedConceptId === "string" ? o.linkedConceptId : null,
    linkedProductId: typeof o.linkedProductId === "string" ? o.linkedProductId : null,
    duplicateOfStagingRowId:
      typeof o.duplicateOfStagingRowId === "string" ? o.duplicateOfStagingRowId : null,
    reviewedByUserId: typeof o.reviewedByUserId === "string" ? o.reviewedByUserId : null,
    reviewedAt: typeof o.reviewedAt === "string" ? o.reviewedAt : null,
    governanceDecision: resolvedDecision,
  };
}

export function mergeGovernanceIntoRawJson(
  rawJson: unknown,
  patch: Partial<PriorityErGovernanceMeta>
): Record<string, unknown> {
  const base =
    rawJson != null && typeof rawJson === "object" && !Array.isArray(rawJson)
      ? { ...(rawJson as Record<string, unknown>) }
      : {};
  const current = parsePriorityErGovernance(base);
  const next: PriorityErGovernanceMeta = {
    ...current,
    ...patch,
    governanceDecision: patch.governanceDecision ?? patch.duplicateResolutionStatus ?? current.governanceDecision,
    duplicateResolutionStatus:
      patch.duplicateResolutionStatus ?? patch.governanceDecision ?? current.duplicateResolutionStatus,
  };
  return { ...base, __governance: next };
}

export function isGovernanceBlocked(
  governance: PriorityErGovernanceMeta,
  reviewFlags: string[]
): boolean {
  if (governance.duplicateResolutionStatus === "BLOCKED_DUPLICATE") return true;
  if (governance.governanceDecision === "BLOCKED_DUPLICATE") return true;
  return reviewFlags.includes(GOVERNANCE_REVIEW_FLAG_BLOCKED);
}

export function isGovernanceResolvedForPromotion(
  governance: PriorityErGovernanceMeta,
  reconciliationStatus: string
): boolean {
  if (isGovernanceBlocked(governance, [])) return false;
  const decision = governance.governanceDecision;
  if (decision === "NEEDS_PHARMACY_REVIEW" || decision === "NEEDS_BILLING_REVIEW" || decision === "NEEDS_NDC_REVIEW") {
    return false;
  }
  if (decision === "CREATE_NEW_APPROVED") return true;
  if (decision === "LINK_TO_EXISTING") {
    return Boolean(governance.linkedConceptId || governance.linkedProductId);
  }
  const status = reconciliationStatus.trim().toUpperCase();
  if (status === "NEW_CANDIDATE" && decision === "UNREVIEWED") return true;
  return false;
}

export function governanceNeedsReviewFlags(decision: DuplicateGovernanceStatus): string[] {
  switch (decision) {
    case "NEEDS_BILLING_REVIEW":
      return ["BILLING_REVIEW_REQUIRED"];
    case "NEEDS_NDC_REVIEW":
      return ["NDC_REVIEW_REQUIRED"];
    case "NEEDS_PHARMACY_REVIEW":
      return ["MANUAL_REVIEW_REQUIRED"];
    default:
      return [];
  }
}
