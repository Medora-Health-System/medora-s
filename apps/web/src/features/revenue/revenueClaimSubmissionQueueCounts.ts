import type { ClaimSubmissionWorkspaceQueue, RevenueClaimSubmissionCounts } from "@medora/shared";

export function buildRevenueClaimSubmissionCounts(
  counts: RevenueClaimSubmissionCounts | null | undefined
): RevenueClaimSubmissionCounts {
  return {
    READY_TO_SEND: counts?.READY_TO_SEND ?? 0,
    SENT: counts?.SENT ?? 0,
    ACK_PENDING: counts?.ACK_PENDING ?? 0,
    ACCEPTED: counts?.ACCEPTED ?? 0,
    REJECTED: counts?.REJECTED ?? 0,
    NEEDS_CORRECTION: counts?.NEEDS_CORRECTION ?? 0,
  };
}

export function formatRevenueClaimQueueCountLabel(
  queue: ClaimSubmissionWorkspaceQueue,
  count: number,
  label: string
): string {
  return `${label} (${count})`;
}
