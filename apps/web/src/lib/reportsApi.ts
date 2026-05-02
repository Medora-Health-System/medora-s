/**
 * ED operational reports (S19) — GET `/api/backend/reports/ed/*` (Nest, ADMIN role).
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const API_BASE = "/api/backend";

export type EdReportSlug =
  | "door-to-ekg"
  | "door-to-provider"
  | "door-to-door"
  | "medication-administration";

export type EdReportQuery = {
  from: string;
  to: string;
  providerId?: string;
  export?: "json" | "csv";
};

function buildQueryString(q: EdReportQuery): string {
  const p = new URLSearchParams();
  p.set("from", q.from);
  p.set("to", q.to);
  if (q.providerId?.trim()) p.set("providerId", q.providerId.trim());
  if (q.export === "csv") p.set("export", "csv");
  return p.toString();
}

export async function fetchEdReportJson(
  facilityId: string,
  slug: EdReportSlug,
  query: EdReportQuery
): Promise<unknown> {
  const qs = buildQueryString({ ...query, export: "json" });
  const res = await fetch(`${API_BASE}/reports/ed/${slug}?${qs}`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId, Accept: "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return parseApiResponse(res);
}

export async function fetchEdReportCsv(facilityId: string, slug: EdReportSlug, query: EdReportQuery): Promise<string> {
  const qs = buildQueryString({ ...query, export: "csv" });
  const res = await fetch(`${API_BASE}/reports/ed/${slug}?${qs}`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId, Accept: "text/csv" },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return await res.text();
}
