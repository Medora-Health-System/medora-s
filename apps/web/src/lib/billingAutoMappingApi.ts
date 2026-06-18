import { apiFetch } from "./apiClient";
import type { BillingAutoMappingCandidate } from "@medora/shared";

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
