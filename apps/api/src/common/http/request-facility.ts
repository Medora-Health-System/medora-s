/**
 * Facility context after AuthGuard + RolesGuard.
 * Prefer the membership-checked `req.facilityId`, then the UI-selected header,
 * then any JWT facility. Never invent a facility from search text.
 */
export function resolveAuthorizedFacilityId(req: {
  facilityId?: unknown;
  user?: { facilityId?: unknown } | null;
  headers?: Record<string, unknown> | null;
}): string | undefined {
  const header = req.headers?.["x-facility-id"];
  const headerId = typeof header === "string" ? header : Array.isArray(header) ? String(header[0] ?? "") : "";
  const candidates = [req.facilityId, headerId, req.user?.facilityId];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return undefined;
}
