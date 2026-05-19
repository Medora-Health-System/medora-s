/**
 * Phase 19F — Priority ER staging duplicate governance API (no activation).
 */

import { apiFetchResponse, parseApiResponse } from "./apiClient";
import { normalizeUserFacingError } from "./userFacingError";

const API_BASE = "/medication-master/governance";

export type DuplicateGovernanceStatus =
  | "UNREVIEWED"
  | "LINK_TO_EXISTING"
  | "CREATE_NEW_APPROVED"
  | "BLOCKED_DUPLICATE"
  | "NEEDS_PHARMACY_REVIEW"
  | "NEEDS_BILLING_REVIEW"
  | "NEEDS_NDC_REVIEW";

export type StagingDuplicateGovernanceRow = {
  id: string;
  batchId: string;
  sourceRowId: string;
  exactSourceText: string;
  medication: string;
  dose: string;
  form: string;
  reconciliationStatus: string;
  duplicateWarnings: string[];
  reviewFlags: string[];
  governance: {
    duplicateResolutionStatus: DuplicateGovernanceStatus;
    duplicateResolutionNote: string | null;
    linkedConceptId: string | null;
    linkedProductId: string | null;
    duplicateOfStagingRowId: string | null;
    reviewedByUserId: string | null;
    reviewedAt: string | null;
    governanceDecision: DuplicateGovernanceStatus;
  };
  matchCandidates: Array<{
    matchType: string;
    confidence: number;
    reasons: string[];
    safeToAutoLink: false;
    kind: string;
    id: string;
    code: string | null;
    displayLabel: string;
    isActive: boolean | null;
    legacyCatalogMedicationId: string | null;
  }>;
  canonicalMatches: Array<{
    kind: "concept" | "product" | "catalog";
    id: string;
    code: string | null;
    displayName: string;
    strengthDisplay: string | null;
    dosageForm: string | null;
    isActive: boolean;
    isOnFormulary: boolean | null;
    isEDFormulary: boolean | null;
    governanceStatus: string | null;
    legacyCatalogMedicationId: string | null;
  }>;
  promotionEligible: boolean;
  promotionBlockReasons: Array<{ code: string; message: string }>;
  promoted: boolean;
  canonicalConceptId: string | null;
  canonicalProductId: string | null;
  duplicateReason: string | null;
  importedAt: string | null;
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

async function governanceFetch<T>(path: string, facilityId?: string): Promise<T> {
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

async function governancePost<T>(
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

export async function fetchStagingDuplicateGovernanceQueue(
  facilityId: string | undefined,
  params?: {
    batchId?: string;
    filter?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ items: StagingDuplicateGovernanceRow[]; total: number }> {
  return governanceFetch(
    `/duplicates${facilityQs(facilityId, {
      batchId: params?.batchId,
      filter: params?.filter,
      q: params?.q,
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
    })}`,
    facilityId
  );
}

export async function resolveStagingDuplicateGovernance(
  stagingRowId: string,
  facilityId: string | undefined,
  body: {
    decision: DuplicateGovernanceStatus;
    note: string;
    confirmExactSourcePreserved: true;
    linkedConceptId?: string;
    linkedProductId?: string;
    duplicateOfStagingRowId?: string;
  }
): Promise<StagingDuplicateGovernanceRow> {
  return governancePost(`/duplicates/${encodeURIComponent(stagingRowId)}/resolve`, facilityId, {
    facilityId,
    ...body,
  });
}

export async function blockStagingDuplicateGovernance(
  stagingRowId: string,
  facilityId: string | undefined,
  note: string
): Promise<StagingDuplicateGovernanceRow> {
  return governancePost(`/duplicates/${encodeURIComponent(stagingRowId)}/block`, facilityId, {
    facilityId,
    note,
  });
}

export async function unblockStagingDuplicateGovernance(
  stagingRowId: string,
  facilityId: string | undefined,
  note: string
): Promise<StagingDuplicateGovernanceRow> {
  return governancePost(`/duplicates/${encodeURIComponent(stagingRowId)}/unblock`, facilityId, {
    facilityId,
    note,
  });
}
