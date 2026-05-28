/**
 * Billing governance analytics (19UCED.9) — GET `/api/admin/billing-governance/summary`.
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";
import type {
  BillingClassification,
  BillingGovernanceAnalyticsResult,
  BillingGovernanceWarning,
} from "@medora/shared";

const ADMIN_API_BASE = "/api/admin";

export type BillingGovernanceSummaryPayload = BillingGovernanceAnalyticsResult;

export type BillingGovernanceSummaryFilters = {
  dateFrom?: string;
  dateTo?: string;
  classification?: BillingClassification;
  includeClosed?: boolean;
  includeOpen?: boolean;
};

function buildQuery(filters: BillingGovernanceSummaryFilters): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.classification) params.set("classification", filters.classification);
  if (filters.includeClosed != null) params.set("includeClosed", String(filters.includeClosed));
  if (filters.includeOpen != null) params.set("includeOpen", String(filters.includeOpen));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function fetchBillingGovernanceSummary(
  facilityId: string,
  filters: BillingGovernanceSummaryFilters = {},
  language: "fr" | "en" = "fr",
): Promise<BillingGovernanceSummaryPayload> {
  const headers: Record<string, string> = { "x-facility-id": facilityId };
  const response = await fetch(`${ADMIN_API_BASE}/billing-governance/summary${buildQuery(filters)}`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const txt = await response.text().catch(() => "");
    let message = `La requête a échoué (${response.status}).`;
    try {
      if (txt.trim()) {
        const json = JSON.parse(txt);
        if (typeof json?.message === "string") message = json.message;
        else if (Array.isArray(json?.message)) message = json.message.join(" ");
        else if (typeof json?.error === "string") message = json.error;
      }
    } catch {
      if (txt?.trim()) message = txt;
    }
    throw new Error(normalizeUserFacingError(message, language) || message);
  }
  return (await parseApiResponse(response)) as BillingGovernanceSummaryPayload;
}

export type { BillingGovernanceWarning };
