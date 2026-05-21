/**
 * Phase 19H — global Priority ER baseline medication master API.
 */

import { apiFetchResponse, parseApiResponse } from "./apiClient";

const API_BASE = "/medication-master/governance/baseline";

export type GlobalBaselineProductRow = {
  productId: string;
  conceptId: string;
  productCode: string;
  governanceStatus: string;
  baselineSource: string;
  baselineSourceRowId: string | null;
  exactSourceText: string | null;
  exactSourceMedication: string | null;
  exactSourceDose: string | null;
  exactSourceFormRoute: string | null;
  medicationDisplayName: string | null;
  productIsActive: boolean;
  runtimeOrderSearchEnabled: boolean;
  runtimeMarEnabled: boolean;
  runtimeBillingEnabled: boolean;
};

export async function fetchGlobalPriorityErBaselineProducts(
  params?: { q?: string; limit?: number; offset?: number }
): Promise<{ items: GlobalBaselineProductRow[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));

  const res = await apiFetchResponse(`${API_BASE}/priority-er-products?${sp.toString()}`, {
    method: "GET",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as { items: GlobalBaselineProductRow[]; total: number };
}

export async function promoteStagingToGlobalBaseline(
  stagingRowId: string,
  body?: { facilityOverlayId?: string }
): Promise<{ status: string; result: { productId: string; globalBaseline?: boolean } }> {
  const res = await apiFetchResponse(`${API_BASE}/promote-priority-er/${stagingRowId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as {
    status: string;
    result: { productId: string; globalBaseline?: boolean };
  };
}
