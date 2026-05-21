/**
 * Phase 19G.2C — governance activation approval actions (no runtime cutover).
 */

import { apiFetchResponse, parseApiResponse } from "./apiClient";
import type { ActivationCandidateRow } from "./medicationActivationGovernanceApi";
import {
  formatActivationApiErrorMessage,
  parseActivationApiError,
  type ParsedActivationApiError,
} from "./medicationActivationGovernanceUi.util";

const API_BASE = "/medication-master/governance";

export type GovernanceActivationReviewRow = ActivationCandidateRow;

export type GovernanceActivationReviewActionBody = {
  facilityId: string;
  governanceNote: string;
  confirmExactSourcePreserved: true;
  confirmDuplicateGovernanceResolved: true;
};

export class ProductGovernanceApiError extends Error {
  readonly parsed: ParsedActivationApiError;

  constructor(parsed: ParsedActivationApiError) {
    super(parsed.message);
    this.name = "ProductGovernanceApiError";
    this.parsed = parsed;
  }
}

export function formatProductGovernanceError(
  err: unknown,
  t: (key: string) => string
): string {
  if (err instanceof ProductGovernanceApiError) {
    return formatActivationApiErrorMessage(err.parsed, t);
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return t("medicationGovernance.activationReview.errorAction");
}

async function governanceMutation<T>(
  path: string,
  facilityId: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await apiFetchResponse(`${API_BASE}${path}`, {
    method: "POST",
    facilityId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new ProductGovernanceApiError(parseActivationApiError(txt || `HTTP ${res.status}`, res.status));
  }
  return (await parseApiResponse(res)) as T;
}

export async function fetchPendingGovernanceActivationReview(
  facilityId: string,
  params?: { q?: string; limit?: number }
): Promise<{ items: GovernanceActivationReviewRow[]; total: number }> {
  const sp = new URLSearchParams({ facilityId });
  if (params?.q) sp.set("q", params.q);
  if (params?.limit != null) sp.set("limit", String(params.limit));

  const res = await apiFetchResponse(`${API_BASE}/pending-activation-review?${sp.toString()}`, {
    method: "GET",
    facilityId,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new ProductGovernanceApiError(parseActivationApiError(txt || `HTTP ${res.status}`, res.status));
  }
  return (await parseApiResponse(res)) as { items: GovernanceActivationReviewRow[]; total: number };
}

export async function approveProductForActivationReview(
  productId: string,
  body: GovernanceActivationReviewActionBody
) {
  return governanceMutation<{ governanceOnly: true }>(
    `/approve/${productId}`,
    body.facilityId,
    body
  );
}

export async function blockProductActivationReview(
  productId: string,
  body: GovernanceActivationReviewActionBody
) {
  return governanceMutation<{ governanceOnly: true }>(
    `/block/${productId}`,
    body.facilityId,
    body
  );
}
