/**
 * Phase 5G — Release of Information (ROI) API client (`/api/backend/roi-requests` → Nest).
 */

import { pickProductUiCopy, type SupportedLanguage } from "@/i18n/config";
import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const BASE = "/api/backend";

const ROI_REQUEST_FAILED = {
  en: (status: number) => `Request failed (${status}).`,
  fr: (status: number) => `Échec (${status}).`,
  es: (status: number) => `La solicitud falló (${status}).`,
};

async function roiFetch(
  path: string,
  options: RequestInit & { facilityId: string; language?: SupportedLanguage } = { facilityId: "" }
): Promise<unknown> {
  const { facilityId, language = "en", ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-facility-id": facilityId,
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${BASE}${path}`, {
    method: fetchOptions.method ?? "GET",
    headers,
    credentials: "include",
    ...(fetchOptions.body !== undefined && { body: fetchOptions.body }),
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => "");
    let message = pickProductUiCopy(language, ROI_REQUEST_FAILED, ROI_REQUEST_FAILED.es)(response.status);
    try {
      if (txt.trim()) {
        const json = JSON.parse(txt);
        if (typeof json?.message === "string") message = json.message;
        else if (Array.isArray(json?.message)) message = json.message.join(" ");
      }
    } catch {
      if (txt?.trim()) message = txt;
    }
    throw new Error(normalizeUserFacingError(message, language) || message);
  }

  if (response.status === 204) return null;
  const ct = response.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) {
    return await response.text();
  }
  return await parseApiResponse(response);
}

export type RoiRequestRow = {
  id: string;
  facilityId: string;
  patientId: string;
  encounterId: string | null;
  requestType: string;
  status: string;
  purpose: string;
  recipientName: string | null;
  recipientOrganization: string | null;
  deliveryMethod: string | null;
  encounterChartExportId: string | null;
  createdAt: string;
  approvedAt: string | null;
  fulfilledAt: string | null;
};

export async function fetchRoiRequests(
  facilityId: string,
  opts?: { status?: string; language?: SupportedLanguage }
): Promise<{ items: RoiRequestRow[] }> {
  const q = opts?.status ? `?status=${encodeURIComponent(opts.status)}` : "";
  return roiFetch(`/roi-requests${q}`, {
    facilityId,
    language: opts?.language,
  }) as Promise<{ items: RoiRequestRow[] }>;
}

export async function createRoiRequest(
  facilityId: string,
  body: {
    patientId: string;
    encounterId?: string | null;
    requestType: string;
    purpose: string;
    recipientName?: string | null;
    recipientOrganization?: string | null;
    deliveryMethod?: string | null;
    authorizationReference?: string | null;
  },
  language?: SupportedLanguage
): Promise<RoiRequestRow> {
  return roiFetch("/roi-requests", {
    method: "POST",
    facilityId,
    language,
    body: JSON.stringify(body),
  }) as Promise<RoiRequestRow>;
}

export async function approveRoiRequest(facilityId: string, id: string, language?: SupportedLanguage) {
  return roiFetch(`/roi-requests/${encodeURIComponent(id)}/approve`, {
    method: "PATCH",
    facilityId,
    language,
    body: JSON.stringify({}),
  }) as Promise<RoiRequestRow>;
}

export async function denyRoiRequest(
  facilityId: string,
  id: string,
  denialReason: string | null,
  language?: SupportedLanguage
) {
  return roiFetch(`/roi-requests/${encodeURIComponent(id)}/deny`, {
    method: "PATCH",
    facilityId,
    language,
    body: JSON.stringify({ denialReason }),
  }) as Promise<RoiRequestRow>;
}

export async function cancelRoiRequest(
  facilityId: string,
  id: string,
  cancelledReason: string | null,
  language?: SupportedLanguage
) {
  return roiFetch(`/roi-requests/${encodeURIComponent(id)}/cancel`, {
    method: "PATCH",
    facilityId,
    language,
    body: JSON.stringify({ cancelledReason }),
  }) as Promise<RoiRequestRow>;
}

export async function fulfillRoiRequest(
  facilityId: string,
  id: string,
  body: { snapshotId?: string | null; createSnapshotIfMissing?: boolean },
  language?: SupportedLanguage
): Promise<{ request: RoiRequestRow; snapshotId: string; encounterId: string }> {
  return roiFetch(`/roi-requests/${encodeURIComponent(id)}/fulfill`, {
    method: "PATCH",
    facilityId,
    language,
    body: JSON.stringify(body),
  }) as Promise<{ request: RoiRequestRow; snapshotId: string; encounterId: string }>;
}

export async function fetchRoiMonitoringSummary(
  facilityId: string,
  language: SupportedLanguage = "en"
): Promise<{
  byStatus: { status: string; count: number }[];
  byFacility: { facilityId: string; status: string; count: number }[];
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-facility-id": facilityId,
  };
  const response = await fetch(`/api/admin/roi-monitoring/summary`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const txt = await response.text().catch(() => "");
    let message = pickProductUiCopy(language, ROI_REQUEST_FAILED, ROI_REQUEST_FAILED.es)(response.status);
    try {
      if (txt.trim()) {
        const json = JSON.parse(txt);
        if (typeof json?.message === "string") message = json.message;
      }
    } catch {
      if (txt?.trim()) message = txt;
    }
    throw new Error(normalizeUserFacingError(message, language) || message);
  }
  return (await parseApiResponse(response)) as {
    byStatus: { status: string; count: number }[];
    byFacility: { facilityId: string; status: string; count: number }[];
  };
}
