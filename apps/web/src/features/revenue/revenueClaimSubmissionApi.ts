import type {
  RevenueClaimSubmissionCounts,
  RevenueClaimSubmissionResponse,
  RevenueClaimSubmissionRowDto,
} from "@medora/shared";
import {
  REVENUE_CLAIM_SUBMISSION_DEFAULT_LIMIT,
  REVENUE_CLAIM_SUBMISSION_MAX_LIMIT,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { mapRevenueClaimApiRowToWorkspaceRow } from "@/features/revenue/revenueClaimSubmissionWorkspaceModels";

export type FetchRevenueClaimSubmissionParams = {
  facilityId: string;
  queue?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

const EMPTY_COUNTS: RevenueClaimSubmissionCounts = {
  READY_TO_SEND: 0,
  SENT: 0,
  ACK_PENDING: 0,
  ACCEPTED: 0,
  REJECTED: 0,
  NEEDS_CORRECTION: 0,
};

export async function fetchRevenueClaimSubmission(
  params: FetchRevenueClaimSubmissionParams
): Promise<RevenueClaimSubmissionResponse> {
  const query = new URLSearchParams();
  if (params.queue && params.queue !== "ALL") query.set("queue", params.queue);
  if (params.search?.trim()) query.set("search", params.search.trim());
  const boundedLimit = Math.min(
    Math.max(params.limit ?? REVENUE_CLAIM_SUBMISSION_DEFAULT_LIMIT, 1),
    REVENUE_CLAIM_SUBMISSION_MAX_LIMIT
  );
  query.set("limit", String(boundedLimit));
  if (params.offset != null) query.set("offset", String(params.offset));

  const suffix = query.toString();
  const path = `/billing/revenue-cycle/claims?${suffix}`;
  const data = (await apiFetch(path, { facilityId: params.facilityId })) as RevenueClaimSubmissionResponse;
  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    total: typeof data?.total === "number" ? data.total : 0,
    limit: typeof data?.limit === "number" ? data.limit : boundedLimit,
    offset: typeof data?.offset === "number" ? data.offset : 0,
    counts: data?.counts ?? EMPTY_COUNTS,
  };
}

export function mapRevenueClaimApiRowsToWorkspaceRows(
  rows: readonly RevenueClaimSubmissionRowDto[]
) {
  return rows.map((row) => mapRevenueClaimApiRowToWorkspaceRow(row));
}

export function shouldReplaceRevenueClaimRows(
  prev: readonly { claimId: string; queue: string }[],
  next: readonly { claimId: string; queue: string }[]
): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (!a || !b) return true;
    if (a.claimId !== b.claimId || a.queue !== b.queue) return true;
  }
  return false;
}
