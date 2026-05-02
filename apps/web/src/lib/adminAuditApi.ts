/**
 * Admin audit log (S18) — Next `/api/admin/*` proxy to Nest `admin/audit/*`.
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

async function adminApiFetch(
  path: string,
  options: RequestInit & { facilityId?: string } = {}
): Promise<unknown> {
  const { facilityId: providedFacilityId, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers && typeof fetchOptions.headers === "object" && !(fetchOptions.headers instanceof Headers)
      ? (fetchOptions.headers as Record<string, string>)
      : {}),
  };
  if (providedFacilityId) headers["x-facility-id"] = providedFacilityId;

  const response = await fetch(`${ADMIN_API_BASE}${path}`, {
    method: fetchOptions.method ?? "GET",
    headers,
    credentials: "include",
    ...(fetchOptions.body !== undefined && { body: fetchOptions.body }),
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
    throw new Error(normalizeUserFacingError(message) || `La requête a échoué (${response.status}).`);
  }

  return await parseApiResponse(response);
}

export type AdminAuditEventRow = {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  actor: { userId: string | null; displayName: string; roleHint: string | null };
  facilityId: string | null;
  encounterId: string | null;
  metadataSummary: Record<string, string | number | boolean>;
  highlightTags: string[];
};

export type AdminAuditEventsResponse = {
  events: AdminAuditEventRow[];
  nextCursor: string | null;
};

export type AdminAuditEventsQuery = {
  from?: string;
  to?: string;
  actorUserId?: string;
  entity?: string;
  action?: string;
  encounterId?: string;
  limit?: number;
  cursor?: string;
};

export async function fetchAdminAuditEvents(
  facilityId: string,
  query: AdminAuditEventsQuery
): Promise<AdminAuditEventsResponse> {
  const sp = new URLSearchParams();
  if (query.from) sp.set("from", query.from);
  if (query.to) sp.set("to", query.to);
  if (query.actorUserId?.trim()) sp.set("actorUserId", query.actorUserId.trim());
  if (query.entity?.trim()) sp.set("entity", query.entity.trim());
  if (query.action?.trim()) sp.set("action", query.action.trim());
  if (query.encounterId?.trim()) sp.set("encounterId", query.encounterId.trim());
  if (query.limit != null) sp.set("limit", String(query.limit));
  if (query.cursor) sp.set("cursor", query.cursor);
  const qs = sp.toString();
  const path = `/audit/events${qs ? `?${qs}` : ""}`;
  return adminApiFetch(path, { facilityId }) as Promise<AdminAuditEventsResponse>;
}
