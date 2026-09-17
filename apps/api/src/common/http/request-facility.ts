/**
 * Facility context for tenant-scoped requests.
 *
 * RolesGuard must evaluate the UI-selected `x-facility-id` first, then fall back
 * to the JWT facility only when no explicit header exists, and must verify active
 * UserRole membership before writing `request.facilityId`.
 * Controllers/services then consume that membership-checked value.
 * `x-facility-id` is a requested context, not proof of authorization.
 * Never invent a facility from search text.
 */

function firstNonEmptyFacilityId(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string" && first.trim()) return first.trim();
  }
  return "";
}

/**
 * Requested facility before membership is proven.
 * Explicit `x-facility-id` wins over a stale JWT facility.
 */
export function resolveRequestedFacilityId(input: {
  userFacilityId?: unknown;
  headerFacilityId?: unknown;
}): string {
  return (
    firstNonEmptyFacilityId(input.headerFacilityId) ||
    firstNonEmptyFacilityId(input.userFacilityId)
  );
}

/**
 * Facility context after AuthGuard + RolesGuard.
 * Prefer the membership-checked `req.facilityId`, then the JWT facility the
 * guard copied onto the user. Do not independently trust an unvalidated header.
 */
export function resolveAuthorizedFacilityId(req: {
  facilityId?: unknown;
  user?: { facilityId?: unknown } | null;
  headers?: Record<string, unknown> | null;
}): string | undefined {
  const candidates = [req.facilityId, req.user?.facilityId];
  for (const candidate of candidates) {
    const id = firstNonEmptyFacilityId(candidate);
    if (id) return id;
  }
  return undefined;
}
