/**
 * D4A.2.8-HF3 — Facility context synchronization helpers (server + shared pure logic).
 * Keeps httpOnly `facilityId` and readable `medora_facility_id` aligned.
 */

export type FacilityContextSource =
  | "explicit_header"
  | "http_only_cookie"
  | "readable_cookie_fallback"
  | "auth_default"
  | "none";

export type ResolveProxyFacilityIdInput = {
  headerFacilityId?: string | null;
  httpOnlyFacilityId?: string | null;
  readableFacilityId?: string | null;
  authDefaultFacilityId?: string | null;
};

export type ResolveProxyFacilityIdResult = {
  facilityId: string | null;
  source: FacilityContextSource;
  cookieMismatch: boolean;
  previousHttpOnlyFacilityId: string | null;
  previousReadableFacilityId: string | null;
};

function trimId(v: string | null | undefined): string {
  return String(v ?? "").trim();
}

/**
 * Pure proxy facility resolution (HF3).
 * Priority: explicit x-facility-id → synchronized httpOnly cookie → readable fallback → auth default.
 * When cookies disagree: prefer httpOnly (server-owned) and flag mismatch (never silent arbitrary pick).
 */
export function resolveProxyFacilityId(
  input: ResolveProxyFacilityIdInput
): ResolveProxyFacilityIdResult {
  const header = trimId(input.headerFacilityId);
  const httpOnly = trimId(input.httpOnlyFacilityId);
  const readable = trimId(input.readableFacilityId);
  const authDefault = trimId(input.authDefaultFacilityId);

  const cookieMismatch = Boolean(httpOnly && readable && httpOnly !== readable);

  if (header) {
    return {
      facilityId: header,
      source: "explicit_header",
      cookieMismatch,
      previousHttpOnlyFacilityId: httpOnly || null,
      previousReadableFacilityId: readable || null,
    };
  }

  if (httpOnly) {
    return {
      facilityId: httpOnly,
      source: "http_only_cookie",
      cookieMismatch,
      previousHttpOnlyFacilityId: httpOnly || null,
      previousReadableFacilityId: readable || null,
    };
  }

  if (readable) {
    return {
      facilityId: readable,
      source: "readable_cookie_fallback",
      cookieMismatch: false,
      previousHttpOnlyFacilityId: null,
      previousReadableFacilityId: readable,
    };
  }

  if (authDefault) {
    return {
      facilityId: authDefault,
      source: "auth_default",
      cookieMismatch: false,
      previousHttpOnlyFacilityId: null,
      previousReadableFacilityId: null,
    };
  }

  return {
    facilityId: null,
    source: "none",
    cookieMismatch: false,
    previousHttpOnlyFacilityId: null,
    previousReadableFacilityId: null,
  };
}

export function userHasFacilityMembership(
  facilityRoles: Array<{ facilityId?: string | null } | null | undefined> | null | undefined,
  facilityId: string
): boolean {
  const target = trimId(facilityId);
  if (!target || !Array.isArray(facilityRoles)) return false;
  return facilityRoles.some((fr) => trimId(fr?.facilityId) === target);
}

/** Lexicographic first membership — same deterministic rule as login/MFA (no DB preference field). */
export function defaultFacilityIdFromRoles(
  facilityRoles: Array<{ facilityId?: string | null } | null | undefined> | null | undefined
): string | null {
  if (!Array.isArray(facilityRoles) || facilityRoles.length === 0) return null;
  const ids = [
    ...new Set(
      facilityRoles
        .map((fr) => trimId(fr?.facilityId))
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "en"));
  return ids[0] ?? null;
}

export function logFacilityContextEvent(
  event:
    | "facility_switch_success"
    | "facility_switch_denied"
    | "facility_cookie_mismatch"
    | "facility_context_forwarded",
  fields: Record<string, unknown>
): void {
  // PHI-safe: IDs and route/source only — never patient clinical fields.
  console.info(
    JSON.stringify({
      event,
      ...fields,
    })
  );
}
