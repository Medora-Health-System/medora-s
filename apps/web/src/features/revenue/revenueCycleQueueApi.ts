import type { RevenueCycleQueueResponse, RevenueCycleQueueRowDto } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import {
  REVENUE_CYCLE_QUEUE_DEFAULT_LIMIT,
  REVENUE_CYCLE_QUEUE_MAX_LIMIT,
} from "@medora/shared";
import { mapRevenueCycleApiRowToWorkspaceRow } from "@/features/revenue/revenueCycleWorkspaceModels";

export type FetchRevenueCycleQueueParams = {
  facilityId: string;
  queue?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function fetchRevenueCycleQueue(
  params: FetchRevenueCycleQueueParams
): Promise<RevenueCycleQueueResponse> {
  const query = new URLSearchParams();
  if (params.queue && params.queue !== "ALL") query.set("queue", params.queue);
  if (params.search?.trim()) query.set("search", params.search.trim());
  const boundedLimit = Math.min(
    Math.max(params.limit ?? REVENUE_CYCLE_QUEUE_DEFAULT_LIMIT, 1),
    REVENUE_CYCLE_QUEUE_MAX_LIMIT
  );
  query.set("limit", String(boundedLimit));
  if (params.offset != null) query.set("offset", String(params.offset));

  const suffix = query.toString();
  const path = `/billing/revenue-cycle/queue?${suffix}`;
  const data = (await apiFetch(path, { facilityId: params.facilityId })) as RevenueCycleQueueResponse;
  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    total: typeof data?.total === "number" ? data.total : 0,
    limit: typeof data?.limit === "number" ? data.limit : boundedLimit,
    offset: typeof data?.offset === "number" ? data.offset : 0,
    counts: data?.counts ?? {
      READY_FOR_BILLING: 0,
      BILLING_DEFICIENCY: 0,
      CODING_REVIEW: 0,
      CLAIM_SUBMITTED: 0,
      CLAIM_PAID: 0,
    },
  };
}

export function mapRevenueCycleApiRowsToWorkspaceRows(
  rows: readonly RevenueCycleQueueRowDto[]
) {
  return rows.map((row) => mapRevenueCycleApiRowToWorkspaceRow(row));
}

export function shouldReplaceRevenueCycleRows(
  prev: readonly { encounterId: string; queue: string }[],
  next: readonly { encounterId: string; queue: string }[]
): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (!a || !b) return true;
    if (a.encounterId !== b.encounterId || a.queue !== b.queue) return true;
  }
  return false;
}
