/**
 * Backup & recovery readiness (S21) — GET `/api/admin/backup-readiness` (Nest, ADMIN).
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

export type BackupReadinessCheckStatus = "pass" | "warn" | "fail";
export type BackupReadinessOverallStatus = "ready" | "attention" | "blocked";

export type BackupReadinessCheck = {
  key: string;
  status: BackupReadinessCheckStatus;
  label: string;
  detail: string | null;
};

export type BackupReadinessPayload = {
  status: BackupReadinessOverallStatus;
  checks: BackupReadinessCheck[];
  generatedAt: string;
};

export async function fetchBackupReadiness(facilityId: string): Promise<BackupReadinessPayload> {
  const res = await fetch(`${ADMIN_API_BASE}/backup-readiness`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as BackupReadinessPayload;
}
