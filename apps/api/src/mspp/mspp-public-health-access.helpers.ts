import { MsppRoleCode } from "@prisma/client";

/**
 * Helpers for MSPP national roles vs shared `/public-health/*` UI modules.
 * Facility-scoped API authorization remains on `RolesGuard` + facility `UserRole` (RN/PROVIDER/ADMIN).
 */

function asSet(roles: Iterable<MsppRoleCode | string>): Set<string> {
  return new Set([...roles].map((r) => String(r)));
}

/** Active delegated MSPP access administrator (not platform principal). */
export function isMsppAdmin(msppRoles: Iterable<MsppRoleCode | string>): boolean {
  return asSet(msppRoles).has(MsppRoleCode.MSPP_ADMIN);
}

/** Summary route `/public-health/summary` — MSPP admin or explicit module role. */
export function canAccessMsppPublicHealthSummary(msppRoles: Iterable<MsppRoleCode | string>): boolean {
  const s = asSet(msppRoles);
  return s.has(MsppRoleCode.MSPP_ADMIN) || s.has(MsppRoleCode.MSPP_PUBLIC_HEALTH);
}

/** Disease reports UI — MSPP admin or explicit module role. */
export function canAccessMsppDiseaseReports(msppRoles: Iterable<MsppRoleCode | string>): boolean {
  const s = asSet(msppRoles);
  return s.has(MsppRoleCode.MSPP_ADMIN) || s.has(MsppRoleCode.MSPP_DISEASE_REPORTS);
}

/** Vaccinations UI — MSPP admin or explicit module role. */
export function canAccessMsppVaccinations(msppRoles: Iterable<MsppRoleCode | string>): boolean {
  const s = asSet(msppRoles);
  return s.has(MsppRoleCode.MSPP_ADMIN) || s.has(MsppRoleCode.MSPP_VACCINATIONS);
}
