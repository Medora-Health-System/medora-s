import type { RevenuePaymentCounts } from "@medora/shared";

export function buildRevenuePaymentCounts(
  counts: RevenuePaymentCounts | null | undefined
): RevenuePaymentCounts {
  return {
    PAYMENT_PENDING: counts?.PAYMENT_PENDING ?? 0,
    PAYMENT_RECEIVED: counts?.PAYMENT_RECEIVED ?? 0,
    UNDERPAID: counts?.UNDERPAID ?? 0,
    DENIED: counts?.DENIED ?? 0,
    UNAPPLIED_PAYMENT: counts?.UNAPPLIED_PAYMENT ?? 0,
    RECONCILIATION_REQUIRED: counts?.RECONCILIATION_REQUIRED ?? 0,
  };
}

export function formatRevenuePaymentQueueCountLabel(
  queue: keyof RevenuePaymentCounts,
  count: number,
  label: string
): string {
  return `${label} (${count})`;
}
