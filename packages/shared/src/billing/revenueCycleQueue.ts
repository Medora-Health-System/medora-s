import type {
  RevenueCycleClaimStatus,
  RevenueCyclePaymentStatus,
  RevenueCycleQueueView,
} from "./revenueCycleClassification.js";
import { resolveRevenueCycleQueue } from "./revenueCycleClassification.js";

export type RevenueCycleManualReviewStatus = "RESOLVED" | "UNRESOLVED" | "NOT_APPLICABLE";

export type RevenueCycleQueueRowDto = {
  encounterId: string;
  patientName: string;
  mrn: string | null;
  dateOfService: string | null;
  provider: string | null;
  billingReady: boolean;
  codingReady: boolean;
  claimStatus: RevenueCycleClaimStatus;
  paymentStatus: RevenueCyclePaymentStatus;
  manualReviewStatus: RevenueCycleManualReviewStatus;
  queue: RevenueCycleQueueView;
  ledgerHref: string;
};

export type RevenueCycleQueueFilter = RevenueCycleQueueView | "ALL";

export type RevenueCycleQueueCounts = Record<RevenueCycleQueueView, number>;

export type RevenueCycleQueueResponse = {
  rows: RevenueCycleQueueRowDto[];
  total: number;
  limit: number;
  offset: number;
  counts: RevenueCycleQueueCounts;
};

export const REVENUE_CYCLE_QUEUE_DEFAULT_LIMIT = 100;
export const REVENUE_CYCLE_QUEUE_MAX_LIMIT = 200;

const SUBMITTED_CLAIM_STATUSES = new Set([
  "SENT",
  "ACK_PENDING",
  "READY_TO_SEND",
  "REJECTED",
  "NEEDS_CORRECTION",
]);

export function mapClaimSubmissionStatusesToRevenueClaimStatus(
  statuses: readonly string[]
): RevenueCycleClaimStatus {
  if (statuses.some((status) => status === "ACCEPTED")) return "PAID";
  if (statuses.some((status) => SUBMITTED_CLAIM_STATUSES.has(status))) return "SUBMITTED";
  if (statuses.length === 0) return "NOT_SUBMITTED";
  return "NOT_SUBMITTED";
}

export function mapClaimSubmissionStatusesToRevenuePaymentStatus(
  statuses: readonly string[]
): RevenueCyclePaymentStatus {
  if (statuses.some((status) => status === "ACCEPTED")) return "POSTED";
  return "NOT_POSTED";
}

export function buildRevenueCycleQueueRowDto(input: {
  encounterId: string;
  patientName: string;
  mrn: string | null;
  dateOfService: string | null;
  provider: string | null;
  billingReady: boolean;
  codingReady: boolean;
  claimStatus: RevenueCycleClaimStatus;
  paymentStatus: RevenueCyclePaymentStatus;
  manualReviewStatus: RevenueCycleManualReviewStatus;
}): RevenueCycleQueueRowDto {
  const queue = resolveRevenueCycleQueue({
    billingReady: input.billingReady,
    codingReady: input.codingReady,
    claimStatus: input.claimStatus,
    paymentStatus: input.paymentStatus,
  });
  return {
    ...input,
    queue,
    ledgerHref: `/app/billing/encounters/${encodeURIComponent(input.encounterId)}`,
  };
}

export function computeRevenueCycleQueueCounts(
  rows: readonly Pick<RevenueCycleQueueRowDto, "queue">[]
): RevenueCycleQueueCounts {
  const counts: RevenueCycleQueueCounts = {
    READY_FOR_BILLING: 0,
    BILLING_DEFICIENCY: 0,
    CODING_REVIEW: 0,
    CLAIM_SUBMITTED: 0,
    CLAIM_PAID: 0,
  };
  for (const row of rows) {
    counts[row.queue] += 1;
  }
  return counts;
}

export function filterRevenueCycleQueueRows(
  rows: readonly RevenueCycleQueueRowDto[],
  queue: RevenueCycleQueueFilter
): RevenueCycleQueueRowDto[] {
  if (queue === "ALL") return [...rows];
  return rows.filter((row) => row.queue === queue);
}

export function searchRevenueCycleQueueRows(
  rows: readonly RevenueCycleQueueRowDto[],
  search: string
): RevenueCycleQueueRowDto[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => {
    const haystack = [row.patientName, row.mrn ?? "", row.encounterId, row.provider ?? ""]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}
