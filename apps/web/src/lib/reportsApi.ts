/**
 * ED operational reports (S19) — GET `/api/backend/reports/ed/*` (Nest, ADMIN role).
 * Query: `format=json`, optional `limit`, `cursor` (JSON pages). Legacy `export=json` maps to `format`.
 * Server CSV streaming is deferred (S19B+); export uses paginated JSON merged client-side.
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const API_BASE = "/api/backend";

export type EdReportSlug =
  | "door-to-ekg"
  | "door-to-provider"
  | "door-to-door"
  | "medication-administration";

const ED_REPORT_PAGE_SIZE_FULL = 500;

export type EdReportQuery = {
  from: string;
  to: string;
  providerId?: string;
  /** Always `json` for API calls from this client. */
  format?: "json";
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

/** Fetches all JSON pages for the given range (for file download). Same filters as preview; uses max page size per request. */
export async function fetchEdReportAllRowsForExport(
  facilityId: string,
  slug: EdReportSlug,
  query: Pick<EdReportQuery, "from" | "to" | "providerId">
): Promise<EdReportJsonResponse> {
  const rows: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  let truncated = false;
  let first: EdReportJsonResponse | null = null;
  for (;;) {
    const data = await fetchEdReportJson(facilityId, slug, {
      ...query,
      format: "json",
      limit: ED_REPORT_PAGE_SIZE_FULL,
      ...(cursor ? { cursor } : {}),
    });
    if (!first) first = data;
    rows.push(...data.rows);
    truncated ||= data.truncated;
    if (!data.nextCursor) break;
    cursor = data.nextCursor;
  }
  if (!first) {
    throw new Error("Unexpected empty report response");
  }
  return {
    ...first,
    rowCount: rows.length,
    rows,
    truncated,
    nextCursor: null,
  };
}
