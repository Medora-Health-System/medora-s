import { apiFetch } from "@/lib/apiClient";
import type {
  ProcedureRevenueReviewDecisionAction,
  ProcedureRevenueReviewQueueRow,
  ProcedureRevenueReviewReasonCode,
  ProcedureRevenueReviewStatus,
} from "@medora/shared";

export type ProcedureRevenueReviewQueuePayload = {
  rows: ProcedureRevenueReviewQueueRow[];
  previewOnly: true;
};

export type ProcedureRevenueReviewQueueFilters = {
  reviewStatus?: ProcedureRevenueReviewStatus;
  mappingStatus?: string;
  documentationMissing?: boolean;
  enterpriseProcedureId?: string;
  limit?: number;
};

export type ProcedureRevenueReviewDecisionBody = {
  decision: ProcedureRevenueReviewDecisionAction;
  reasonCode: ProcedureRevenueReviewReasonCode;
  note?: string;
};

function buildQuery(filters: ProcedureRevenueReviewQueueFilters): string {
  const params = new URLSearchParams();
  if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
  if (filters.mappingStatus) params.set("mappingStatus", filters.mappingStatus);
  if (filters.documentationMissing === true) params.set("documentationMissing", "true");
  if (filters.documentationMissing === false) params.set("documentationMissing", "false");
  if (filters.enterpriseProcedureId) params.set("enterpriseProcedureId", filters.enterpriseProcedureId);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function fetchProcedureRevenueReviewQueue(
  facilityId: string,
  filters: ProcedureRevenueReviewQueueFilters = {}
): Promise<ProcedureRevenueReviewQueuePayload> {
  return apiFetch(`/billing/procedure-review${buildQuery(filters)}`, {
    facilityId,
  }) as Promise<ProcedureRevenueReviewQueuePayload>;
}

export async function postProcedureRevenueReviewDecision(
  facilityId: string,
  billingEventId: string,
  body: ProcedureRevenueReviewDecisionBody
): Promise<{ previewOnly: true; revenueReviewStatus: string }> {
  return apiFetch(`/billing/procedure-review/${billingEventId}/decision`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as Promise<{ previewOnly: true; revenueReviewStatus: string }>;
}
