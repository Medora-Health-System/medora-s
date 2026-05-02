/**
 * ED operational reports (S19) — GET `/api/backend/reports/ed/*` (Nest, ADMIN role).
 * JSON: `format=json` (paginated). CSV: `format=csv` (server streaming; open via navigation, not fetch+blob).
 * Legacy `export=json|csv` maps to `format` in the API DTO.
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
  format?: "json" | "csv";
  limit?: number;
  cursor?: string;
};

export type EdReportJsonResponse = {
  reportType: string;
  generatedAt: string;
  from: string;
  to: string;
  format: "json";
  rowCount: number;
  truncated: boolean;
  nextCursor: string | null;
  rows: Record<string, unknown>[];
};

function buildQueryString(q: EdReportQuery): string {
  const p = new URLSearchParams();
  p.set("from", q.from);
  p.set("to", q.to);
  if (q.providerId?.trim()) p.set("providerId", q.providerId.trim());
  p.set("format", q.format ?? "json");
  if (q.limit != null && Number.isFinite(q.limit)) p.set("limit", String(Math.trunc(q.limit)));
  if (q.cursor?.trim()) p.set("cursor", q.cursor.trim());
  return p.toString();
}

/**
 * Same-origin CSV export URL (cookies + facility cookie via Next proxy).
 * Use `window.location.href = url` or `window.open(url, "_blank")` — do not fetch the full body in JS.
 */
export function buildEdReportCsvDownloadUrl(
  slug: EdReportSlug,
  query: Pick<EdReportQuery, "from" | "to" | "providerId">
): string {
  const p = new URLSearchParams();
  p.set("from", query.from);
  p.set("to", query.to);
  if (query.providerId?.trim()) p.set("providerId", query.providerId.trim());
  p.set("format", "csv");
  return `${API_BASE}/reports/ed/${slug}?${p.toString()}`;
}

export async function fetchEdReportJson(
  facilityId: string,
  slug: EdReportSlug,
  query: EdReportQuery
): Promise<EdReportJsonResponse> {
  const qs = buildQueryString({ ...query, format: "json" });
  const res = await fetch(`${API_BASE}/reports/ed/${slug}?${qs}`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId, Accept: "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as EdReportJsonResponse;
}
