import { apiFetch } from "./apiClient";
import type { BillingAutoMappingCandidate, BillingAutoMappingWorkspaceRow } from "@medora/shared";

export type BillingAutoMappingPreviewResult = {
  encounterId: string;
  candidates: BillingAutoMappingCandidate[];
  applyCount: number;
  reviewCount: number;
  skipCount: number;
};

export type BillingAutoMappingApplyResult = {
  encounterId: string;
  appliedCount: number;
  skippedCount: number;
  staleCount: number;
  appliedLedgerLineIds: string[];
};

export async function fetchBillingAutoMappingPreview(
  facilityId: string,
  encounterId: string
): Promise<BillingAutoMappingPreviewResult> {
  return apiFetch(`/billing/auto-mapping/encounters/${encodeURIComponent(encounterId)}/preview`, {
    facilityId,
  }) as Promise<BillingAutoMappingPreviewResult>;
}

export async function applyBillingAutoMappings(
  facilityId: string,
  encounterId: string,
  candidateIds: string[]
): Promise<BillingAutoMappingApplyResult> {
  return apiFetch(`/billing/auto-mapping/encounters/${encodeURIComponent(encounterId)}/apply`, {
    facilityId,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateIds }),
  }) as Promise<BillingAutoMappingApplyResult>;
}

export type BillingAutoMappingWorkspaceResult = {
  counts: {
    applyReady: number;
    reviewRequired: number;
    skipped: number;
    mapped: number;
    total: number;
  };
  rows: BillingAutoMappingWorkspaceRow[];
};

export type BillingAutoMappingBulkApplyResult = {
  requested: number;
  applied: number;
  skipped: number;
  failed: number;
  appliedLedgerRowIds: string[];
};

export async function fetchBillingAutoMappingWorkspace(
  facilityId: string,
  options?: { limit?: number; queue?: string }
): Promise<BillingAutoMappingWorkspaceResult> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.queue) params.set("queue", options.queue);
  const qs = params.toString();
  return apiFetch(`/billing/auto-mapping/workspace${qs ? `?${qs}` : ""}`, {
    facilityId,
  }) as Promise<BillingAutoMappingWorkspaceResult>;
}

export async function bulkApplyBillingAutoMappings(
  facilityId: string,
  ledgerRowIds: string[]
): Promise<BillingAutoMappingBulkApplyResult> {
  return apiFetch("/billing/auto-mapping/bulk-apply", {
    facilityId,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ledgerRowIds }),
  }) as Promise<BillingAutoMappingBulkApplyResult>;
}
