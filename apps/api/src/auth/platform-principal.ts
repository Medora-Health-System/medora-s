/**
 * Single platform (principal) admin account for Medora-S.
 * Facility-scoped ADMIN (`RoleCode.ADMIN`) is separate; do not use this for site admins.
 */
export const PLATFORM_PRINCIPAL_ADMIN_EMAIL = "atranchant@medora.local";

export function normalizeEmailForPrincipalCheck(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isPlatformPrincipalAdminEmail(email: string | null | undefined): boolean {
  return normalizeEmailForPrincipalCheck(email) === PLATFORM_PRINCIPAL_ADMIN_EMAIL;
}

export type PlatformPrincipalAccessInput = {
  email?: string | null;
  isActive?: boolean | null;
  /** Facility context explicitly supplied by the caller (`x-facility-id` / session facility). */
  facilityId?: string | null;
};

export type PlatformPrincipalAccess = {
  granted: boolean;
  /** Denial reason for audit / route diagnostics (never a bypass path). */
  reason: "GRANTED" | "NOT_PLATFORM_PRINCIPAL" | "INACTIVE_ACCOUNT" | "FACILITY_CONTEXT_REQUIRED";
};

/**
 * Single authoritative platform-principal decision reused by guards and services.
 *
 * Platform administration never bypasses authentication or tenant isolation: an explicit,
 * validated facility context is always required, and the caller still resolves the encounter
 * inside that facility.
 */
export function resolvePlatformPrincipalAccess(
  input: PlatformPrincipalAccessInput
): PlatformPrincipalAccess {
  if (!isPlatformPrincipalAdminEmail(input.email)) {
    return { granted: false, reason: "NOT_PLATFORM_PRINCIPAL" };
  }
  if (input.isActive === false) {
    return { granted: false, reason: "INACTIVE_ACCOUNT" };
  }
  if (!String(input.facilityId ?? "").trim()) {
    return { granted: false, reason: "FACILITY_CONTEXT_REQUIRED" };
  }
  return { granted: true, reason: "GRANTED" };
}
