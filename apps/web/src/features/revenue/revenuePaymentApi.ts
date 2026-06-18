import type { RevenuePaymentResponse, RevenuePaymentRowDto } from "@medora/shared";
import {
  REVENUE_PAYMENT_DEFAULT_LIMIT,
  REVENUE_PAYMENT_MAX_LIMIT,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";

export type FetchRevenuePaymentParams = {
  facilityId: string;
  queue?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

const EMPTY_COUNTS = {
  PAYMENT_PENDING: 0,
  PAYMENT_RECEIVED: 0,
  UNDERPAID: 0,
  DENIED: 0,
  UNAPPLIED_PAYMENT: 0,
  RECONCILIATION_REQUIRED: 0,
};

export async function fetchRevenuePaymentWorkspace(
  params: FetchRevenuePaymentParams
): Promise<RevenuePaymentResponse> {
  const query = new URLSearchParams();
  if (params.queue && params.queue !== "ALL") query.set("queue", params.queue);
  if (params.search?.trim()) query.set("search", params.search.trim());
  const boundedLimit = Math.min(
    Math.max(params.limit ?? REVENUE_PAYMENT_DEFAULT_LIMIT, 1),
    REVENUE_PAYMENT_MAX_LIMIT
  );
  query.set("limit", String(boundedLimit));
  if (params.offset != null) query.set("offset", String(params.offset));

  const path = `/billing/revenue-cycle/payments?${query.toString()}`;
  const data = (await apiFetch(path, { facilityId: params.facilityId })) as RevenuePaymentResponse;
  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    total: typeof data?.total === "number" ? data.total : 0,
    limit: typeof data?.limit === "number" ? data.limit : boundedLimit,
    offset: typeof data?.offset === "number" ? data.offset : 0,
    counts: data?.counts ?? EMPTY_COUNTS,
  };
}

export function mapRevenuePaymentApiRowsToWorkspaceRows(rows: readonly RevenuePaymentRowDto[]) {
  return rows.map((row) => ({
    ...row,
    claimLabel: row.claimId.slice(0, 8).toUpperCase(),
  }));
}

export type RevenuePaymentWorkspaceRow = ReturnType<
  typeof mapRevenuePaymentApiRowsToWorkspaceRows
>[number];

export function shouldReplaceRevenuePaymentRows(
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
