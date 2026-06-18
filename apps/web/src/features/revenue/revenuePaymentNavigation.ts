import { REVENUE_PAYMENT_QUEUE, type RevenuePaymentQueue } from "@medora/shared";

export type RevenuePaymentWorkspaceView = RevenuePaymentQueue;

export const REVENUE_PAYMENT_WORKSPACE_ROUTE = "/app/admin/revenue-cycle/payments";

export const REVENUE_PAYMENT_WORKSPACE_VIEWS: readonly RevenuePaymentWorkspaceView[] = [
  REVENUE_PAYMENT_QUEUE.PAYMENT_PENDING,
  REVENUE_PAYMENT_QUEUE.PAYMENT_RECEIVED,
  REVENUE_PAYMENT_QUEUE.UNDERPAID,
  REVENUE_PAYMENT_QUEUE.DENIED,
  REVENUE_PAYMENT_QUEUE.UNAPPLIED_PAYMENT,
  REVENUE_PAYMENT_QUEUE.RECONCILIATION_REQUIRED,
] as const;

export type RevenuePaymentWorkspaceFilter = "ALL" | RevenuePaymentWorkspaceView;

export const REVENUE_PAYMENT_WORKSPACE_FILTERS: readonly RevenuePaymentWorkspaceFilter[] = [
  "ALL",
  ...REVENUE_PAYMENT_WORKSPACE_VIEWS,
] as const;

export const REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS: Record<RevenuePaymentWorkspaceView, string> = {
  PAYMENT_PENDING: "revenuePayment.views.paymentPending",
  PAYMENT_RECEIVED: "revenuePayment.views.paymentReceived",
  UNDERPAID: "revenuePayment.views.underpaid",
  DENIED: "revenuePayment.views.denied",
  UNAPPLIED_PAYMENT: "revenuePayment.views.unappliedPayment",
  RECONCILIATION_REQUIRED: "revenuePayment.views.reconciliationRequired",
};

export const REVENUE_PAYMENT_WORKSPACE_FILTER_I18N_KEYS: Record<
  RevenuePaymentWorkspaceFilter,
  string
> = {
  ALL: "revenuePayment.filters.all",
  PAYMENT_PENDING: REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS.PAYMENT_PENDING,
  PAYMENT_RECEIVED: REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS.PAYMENT_RECEIVED,
  UNDERPAID: REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS.UNDERPAID,
  DENIED: REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS.DENIED,
  UNAPPLIED_PAYMENT: REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS.UNAPPLIED_PAYMENT,
  RECONCILIATION_REQUIRED: REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS.RECONCILIATION_REQUIRED,
};

export const REVENUE_PAYMENT_RECONCILIATION_I18N_KEYS = {
  BALANCED: "revenuePayment.reconciliation.balanced",
  VARIANCE_FOUND: "revenuePayment.reconciliation.varianceFound",
  NEEDS_REVIEW: "revenuePayment.reconciliation.needsReview",
} as const;

export function revenuePaymentLedgerHref(encounterId: string): string {
  return `/app/billing/encounters/${encodeURIComponent(encounterId)}`;
}

export function revenuePaymentAuditHref(claimId: string): string {
  return `/app/admin/revenue-cycle/claims/${encodeURIComponent(claimId)}`;
}

export function matchesRevenuePaymentFilter(
  queue: RevenuePaymentQueue,
  filter: RevenuePaymentWorkspaceFilter
): boolean {
  if (filter === "ALL") return true;
  return queue === filter;
}
