import type { RevenueCycleQueueCounts, RevenueCycleQueueView } from "@medora/shared";
import { REVENUE_WORKSPACE_VIEWS } from "@/features/revenue/revenueCycleNavigation";

export function buildRevenueCycleQueueCounts(
  counts: RevenueCycleQueueCounts | null | undefined
): RevenueCycleQueueCounts {
  const base: RevenueCycleQueueCounts = {
    READY_FOR_BILLING: 0,
    BILLING_DEFICIENCY: 0,
    CODING_REVIEW: 0,
    CLAIM_SUBMITTED: 0,
    CLAIM_PAID: 0,
  };
  if (!counts) return base;
  for (const view of REVENUE_WORKSPACE_VIEWS) {
    base[view] = counts[view] ?? 0;
  }
  return base;
}

export function formatRevenueCycleQueueCountLabel(
  view: RevenueCycleQueueView,
  count: number,
  label: string
): string {
  return `${label} (${count})`;
}
