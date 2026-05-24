/**
 * Go-live readiness (S20) — GET `/api/admin/go-live-readiness` (Nest, ADMIN role).
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

export type GoLiveOverallStatus = "ready" | "attention" | "blocked";

export type GoLiveCheckStatus = "pass" | "warn" | "fail";

export type GoLiveReadinessCheck = {
  key: string;
  label: string;
  status: GoLiveCheckStatus;
  value: string | number | boolean | null;
  detail: string | null;
};

export type GoLiveRecentCriticalEvent = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  encounterId: string | null;
  category: string;
  highlightTags: string[];
};

export type GoLiveReadinessPayload = {
  status: GoLiveOverallStatus;
  generatedAt: string;
  facilityId: string;
  checks: GoLiveReadinessCheck[];
  metrics: {
    openEncounters: number;
    blockedClosure: number;
    missingVitals: number;
    unsignedProviderDocs: number;
    unresolvedOrders: number;
    doorToProviderAvgMinutes: number | null;
    doorToDoorAvgMinutes: number | null;
    medicationAdministrationsToday: number;
    lastExternalBillingExportAt: string | null;
    alertWebhookConfigured: boolean;
  };
  recentCriticalEvents: GoLiveRecentCriticalEvent[];
};

export async function fetchGoLiveReadiness(facilityId: string): Promise<GoLiveReadinessPayload> {
  const headers: Record<string, string> = { "x-facility-id": facilityId };
  const response = await fetch(`${ADMIN_API_BASE}/go-live-readiness`, {
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
    throw new Error(normalizeUserFacingError(message, "fr") || `La requête a échoué (${response.status}).`);
  }
  return (await parseApiResponse(response)) as GoLiveReadinessPayload;
}
