import {
  CLAIM_SUBMISSION_WORKSPACE_QUEUE,
  type ClaimSubmissionWorkspaceQueue,
} from "@medora/shared";

export type RevenueClaimWorkspaceView = ClaimSubmissionWorkspaceQueue;

export const REVENUE_CLAIM_SUBMISSION_WORKSPACE_ROUTE = "/app/admin/revenue-cycle/claims";

export const REVENUE_CLAIM_WORKSPACE_VIEWS: readonly RevenueClaimWorkspaceView[] = [
  CLAIM_SUBMISSION_WORKSPACE_QUEUE.READY_TO_SEND,
  CLAIM_SUBMISSION_WORKSPACE_QUEUE.SENT,
  CLAIM_SUBMISSION_WORKSPACE_QUEUE.ACK_PENDING,
  CLAIM_SUBMISSION_WORKSPACE_QUEUE.ACCEPTED,
  CLAIM_SUBMISSION_WORKSPACE_QUEUE.REJECTED,
  CLAIM_SUBMISSION_WORKSPACE_QUEUE.NEEDS_CORRECTION,
] as const;

export type RevenueClaimWorkspaceFilter = "ALL" | RevenueClaimWorkspaceView;

export const REVENUE_CLAIM_WORKSPACE_FILTERS: readonly RevenueClaimWorkspaceFilter[] = [
  "ALL",
  ...REVENUE_CLAIM_WORKSPACE_VIEWS,
] as const;

export const REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS: Record<RevenueClaimWorkspaceView, string> = {
  READY_TO_SEND: "revenueClaimSubmission.views.readyToSend",
  SENT: "revenueClaimSubmission.views.sent",
  ACK_PENDING: "revenueClaimSubmission.views.ackPending",
  ACCEPTED: "revenueClaimSubmission.views.accepted",
  REJECTED: "revenueClaimSubmission.views.rejected",
  NEEDS_CORRECTION: "revenueClaimSubmission.views.needsCorrection",
};

export const REVENUE_CLAIM_WORKSPACE_FILTER_I18N_KEYS: Record<
  RevenueClaimWorkspaceFilter,
  string
> = {
  ALL: "revenueClaimSubmission.filters.all",
  READY_TO_SEND: REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS.READY_TO_SEND,
  SENT: REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS.SENT,
  ACK_PENDING: REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS.ACK_PENDING,
  ACCEPTED: REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS.ACCEPTED,
  REJECTED: REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS.REJECTED,
  NEEDS_CORRECTION: REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS.NEEDS_CORRECTION,
};

export function revenueClaimLedgerHref(encounterId: string): string {
  return `/app/billing/encounters/${encodeURIComponent(encounterId)}`;
}

export function revenueClaimViewHref(encounterId: string, claimId: string): string {
  const encodedEncounter = encodeURIComponent(encounterId);
  const encodedClaim = encodeURIComponent(claimId);
  return `/app/billing/encounters/${encodedEncounter}?claimSubmission=${encodedClaim}`;
}

export function revenueClaimAuditHref(claimId: string): string {
  return `/app/admin/revenue-cycle/claims/${encodeURIComponent(claimId)}`;
}

export function matchesRevenueClaimFilter(
  queue: ClaimSubmissionWorkspaceQueue,
  filter: RevenueClaimWorkspaceFilter
): boolean {
  if (filter === "ALL") return true;
  return queue === filter;
}
