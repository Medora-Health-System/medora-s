/**
 * Phase 19G — Controlled canonical formulary activation (single-action, no bulk).
 */

import { apiFetchResponse, parseApiResponse } from "./apiClient";
import { normalizeUserFacingError } from "./userFacingError";

const API_BASE = "/medication-master/governance";

export type ActivationRuntimeState =
  | "CANONICAL_INACTIVE"
  | "FORMULARY_REVIEW"
  | "FORMULARY_APPROVED_INACTIVE"
  | "ORDER_SEARCH_ENABLED"
  | "MAR_ENABLED"
  | "BILLING_REVIEW_REQUIRED"
  | "BILLING_ENABLED";

export type ActivationCandidateRow = {
  productId: string;
  conceptId: string;
  productCode: string;
  governanceStatus: string;
  productIsActive: boolean;
  conceptIsActive: boolean;
  activationState: ActivationRuntimeState;
  runtime: {
    formularyApprovedInactive: boolean;
    orderSearchEnabled: boolean;
    marEnabled: boolean;
    billingReviewRequired: boolean;
    billingEnabled: boolean;
    reviewedBillingCode: string | null;
    reviewedBillingUnit: string | null;
  };
  exactSourceMedication: string | null;
  exactSourceDose: string | null;
  exactSourceFormRoute: string | null;
  duplicateGovernanceStatus: string | null;
  duplicateGovernanceResolved: boolean;
  formularyOnFormulary: boolean;
  facilityFormularyItemId: string | null;
  packageId: string | null;
  legacyCatalogMedicationId: string | null;
  blockerReasons: string[];
};

export type ActivationActionBody = {
  facilityId: string;
  note: string;
  confirmExactSourcePreserved: true;
  confirmDuplicateGovernanceResolved: true;
};

function facilityQs(
  facilityId: string | undefined,
  extra?: Record<string, string | number | undefined>
): string {
  const sp = new URLSearchParams();
  if (facilityId) sp.set("facilityId", facilityId);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== "") sp.set(k, String(v));
    }
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

async function activationGet<T>(path: string, facilityId?: string): Promise<T> {
  const res = await apiFetchResponse(`${API_BASE}${path}`, {
    method: "GET",
    headers: facilityId ? { "x-facility-id": facilityId } : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as T;
}

async function activationPost<T>(
  path: string,
  facilityId: string | undefined,
  body: Record<string, unknown>
): Promise<T> {
  const res = await apiFetchResponse(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(facilityId ? { "x-facility-id": facilityId } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as T;
}

export async function fetchActivationCandidates(
  facilityId: string | undefined,
  params?: { q?: string; limit?: number }
): Promise<{ items: ActivationCandidateRow[]; total: number }> {
  return activationGet(
    `/activation-candidates${facilityQs(facilityId, { q: params?.q, limit: params?.limit ?? 100 })}`,
    facilityId
  );
}

export async function approveFormularyInactive(
  productId: string,
  facilityId: string,
  body: ActivationActionBody
) {
  return activationPost(
    `/activation/${encodeURIComponent(productId)}/approve-formulary`,
    facilityId,
    body
  );
}

export async function enableOrderSearchActivation(
  productId: string,
  facilityId: string,
  body: ActivationActionBody
) {
  return activationPost(
    `/activation/${encodeURIComponent(productId)}/enable-order-search`,
    facilityId,
    body
  );
}

export async function enableMarActivation(
  productId: string,
  facilityId: string,
  body: ActivationActionBody
) {
  return activationPost(
    `/activation/${encodeURIComponent(productId)}/enable-mar`,
    facilityId,
    body
  );
}

export async function requestBillingReviewActivation(
  productId: string,
  facilityId: string,
  body: ActivationActionBody
) {
  return activationPost(
    `/activation/${encodeURIComponent(productId)}/request-billing-review`,
    facilityId,
    body
  );
}

export async function enableBillingActivation(
  productId: string,
  facilityId: string,
  body: ActivationActionBody & {
    reviewedBillingCode: string;
    reviewedBillingUnit: string;
    reviewedByRole: string;
  }
) {
  return activationPost(
    `/activation/${encodeURIComponent(productId)}/enable-billing`,
    facilityId,
    body
  );
}

export async function disableRuntimeActivation(
  productId: string,
  facilityId: string,
  body: ActivationActionBody
) {
  return activationPost(
    `/activation/${encodeURIComponent(productId)}/disable-runtime`,
    facilityId,
    body
  );
}
