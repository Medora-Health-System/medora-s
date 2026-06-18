import { REVENUE_CYCLE_QUEUE, type RevenueCycleQueueView } from "@medora/shared";

export type RevenueCycleWorkspaceView = RevenueCycleQueueView;

export const REVENUE_CYCLE_WORKSPACE_ROUTE = "/app/admin/revenue-cycle";

export const REVENUE_WORKSPACE_VIEWS: readonly RevenueCycleWorkspaceView[] = [
  REVENUE_CYCLE_QUEUE.READY_FOR_BILLING,
  REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY,
  REVENUE_CYCLE_QUEUE.CODING_REVIEW,
  REVENUE_CYCLE_QUEUE.CLAIM_SUBMITTED,
  REVENUE_CYCLE_QUEUE.CLAIM_PAID,
] as const;

export type RevenueCycleWorkspaceFilter = "ALL" | RevenueCycleWorkspaceView;

export const REVENUE_WORKSPACE_FILTERS: readonly RevenueCycleWorkspaceFilter[] = [
  "ALL",
  ...REVENUE_WORKSPACE_VIEWS,
] as const;

export const REVENUE_WORKSPACE_VIEW_I18N_KEYS: Record<RevenueCycleWorkspaceView, string> = {
  READY_FOR_BILLING: "revenueCycle.views.readyForBilling",
  BILLING_DEFICIENCY: "revenueCycle.views.billingDeficiency",
  CODING_REVIEW: "revenueCycle.views.codingReview",
  CLAIM_SUBMITTED: "revenueCycle.views.claimSubmitted",
  CLAIM_PAID: "revenueCycle.views.claimPaid",
};

export const REVENUE_WORKSPACE_FILTER_I18N_KEYS: Record<RevenueCycleWorkspaceFilter, string> = {
  ALL: "revenueCycle.filters.all",
  READY_FOR_BILLING: REVENUE_WORKSPACE_VIEW_I18N_KEYS.READY_FOR_BILLING,
  BILLING_DEFICIENCY: REVENUE_WORKSPACE_VIEW_I18N_KEYS.BILLING_DEFICIENCY,
  CODING_REVIEW: REVENUE_WORKSPACE_VIEW_I18N_KEYS.CODING_REVIEW,
  CLAIM_SUBMITTED: REVENUE_WORKSPACE_VIEW_I18N_KEYS.CLAIM_SUBMITTED,
  CLAIM_PAID: REVENUE_WORKSPACE_VIEW_I18N_KEYS.CLAIM_PAID,
};

export function revenueCycleLedgerHref(encounterId: string): string {
  return `/app/billing/encounters/${encodeURIComponent(encounterId)}`;
}

export function matchesRevenueCycleFilter(
  queue: RevenueCycleQueueView,
  filter: RevenueCycleWorkspaceFilter
): boolean {
  if (filter === "ALL") return true;
  return queue === filter;
}

export function isRevenueCycleWorkspaceView(value: string): value is RevenueCycleWorkspaceView {
  return (REVENUE_WORKSPACE_VIEWS as readonly string[]).includes(value);
}
