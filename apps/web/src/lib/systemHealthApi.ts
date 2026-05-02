/**
 * S17D — GET `/api/admin/system-health` (Nest, ADMIN).
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

export type SystemHealthCheckStatus = "pass" | "warn" | "fail";
export type SystemHealthOverallStatus = "healthy" | "degraded" | "critical";

export type SystemHealthCheck = {
  key: string;
  status: SystemHealthCheckStatus;
  label: string;
  detail: string | null;
};

export type SystemHealthMetrics = {
  apiUptimeSeconds: number;
  databaseReachable: boolean;
  alertWebhookConfigured: boolean;
  alertEnabled: boolean;
  externalBillingAutomationEnabled: boolean;
  recent5xxCount: number;
  recentCriticalAlertsCount: number;
  recentFailedExportsCount: number;
};

export type SystemHealthPayload = {
  status: SystemHealthOverallStatus;
  generatedAt: string;
  checks: SystemHealthCheck[];
  metrics: SystemHealthMetrics;
};

export async function fetchSystemHealth(facilityId: string): Promise<SystemHealthPayload> {
  const res = await fetch(`${ADMIN_API_BASE}/system-health`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as SystemHealthPayload;
}
