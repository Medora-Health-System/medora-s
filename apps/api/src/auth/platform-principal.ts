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
