/**
 * MEDUI.D5A.5C — Facility Administrator clinical authoring authority.
 *
 * Binding distinction (existing RoleCode model — no new role system):
 * - Facility administrator: facility-scoped UserRole with RoleCode.ADMIN
 * - Platform / Medora operator: RoleCode.MEDORA_SUPER_ADMIN
 *
 * Facility ADMIN defaults to clinical authoring for enabled modules at THAT facility.
 * Platform SUPER_ADMIN alone does NOT inherit facility clinical authoring.
 * Facility membership remains the scoping gate (DentalCareReadAccessGuard).
 *
 * Signing: follows existing ambulatory enterprise pattern (ADMIN may sign provider docs).
 * No schema: no durable explicit admin clinical restriction exists yet (documented deferral).
 */

import { PLATFORM_OPERATOR_ROLE_CODE } from "../constants/roles.js";

export const D5A5C_CERTIFICATION_ID = "MEDUI.D5A.5C" as const;

function normalizeRoleCodes(roleCodes: readonly string[] | null | undefined): string[] {
  return (roleCodes ?? []).map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean);
}

/** Facility administrator = RoleCode.ADMIN on a facility membership (not platform operator alone). */
export function isFacilityAdministratorRoleCodes(
  roleCodes: readonly string[] | null | undefined
): boolean {
  return normalizeRoleCodes(roleCodes).includes("ADMIN");
}

/** Platform / Medora operator — must not silently inherit facility clinical authoring. */
export function isPlatformOperatorOnlyRoleCodes(
  roleCodes: readonly string[] | null | undefined
): boolean {
  const roles = normalizeRoleCodes(roleCodes);
  return roles.includes(PLATFORM_OPERATOR_ROLE_CODE) && !roles.includes("ADMIN") && !roles.includes("PROVIDER");
}

/**
 * Clinical authoring eligibility for enabled facility clinical modules.
 * PROVIDER clinical privilege OR facility ADMIN (default full operational authority).
 * Explicit restriction mechanism: not yet persisted — default ALLOW for facility ADMIN.
 */
export function hasFacilityClinicalAuthoringRoleCodes(
  roleCodes: readonly string[] | null | undefined
): boolean {
  const roles = normalizeRoleCodes(roleCodes);
  if (roles.includes("PROVIDER")) return true;
  if (roles.includes("ADMIN")) return true;
  return false;
}

/**
 * MEDUI.D5A.5C — conceptual facility clinical authoring check (reusable).
 * Callers supply facility-scoped roleCodes from membership resolution.
 */
export function resolveFacilityClinicalAuthoringAuthority(input: {
  roleCodes: readonly string[] | null | undefined;
  moduleEnabled: boolean;
  encounterStatus?: string | null;
  /** Reserved: future onboarding restriction flag (not persisted yet). */
  explicitClinicalAuthoringDenied?: boolean | null;
}): {
  certificationId: typeof D5A5C_CERTIFICATION_ID;
  allowed: boolean;
  isFacilityAdministrator: boolean;
  isPlatformOperatorOnly: boolean;
  reason:
    | "MODULE_DISABLED"
    | "NO_FACILITY_CLINICAL_AUTHORITY"
    | "EXPLICIT_RESTRICTION"
    | "ENCOUNTER_NOT_OPEN"
    | null;
} {
  const isFacilityAdministrator = isFacilityAdministratorRoleCodes(input.roleCodes);
  const isPlatformOperatorOnly = isPlatformOperatorOnlyRoleCodes(input.roleCodes);
  const encounterOpen =
    input.encounterStatus == null ||
    String(input.encounterStatus).trim() === "" ||
    String(input.encounterStatus).toUpperCase() === "OPEN";

  if (!input.moduleEnabled) {
    return {
      certificationId: D5A5C_CERTIFICATION_ID,
      allowed: false,
      isFacilityAdministrator,
      isPlatformOperatorOnly,
      reason: "MODULE_DISABLED",
    };
  }
  if (input.explicitClinicalAuthoringDenied === true) {
    return {
      certificationId: D5A5C_CERTIFICATION_ID,
      allowed: false,
      isFacilityAdministrator,
      isPlatformOperatorOnly,
      reason: "EXPLICIT_RESTRICTION",
    };
  }
  if (!hasFacilityClinicalAuthoringRoleCodes(input.roleCodes)) {
    return {
      certificationId: D5A5C_CERTIFICATION_ID,
      allowed: false,
      isFacilityAdministrator,
      isPlatformOperatorOnly,
      reason: "NO_FACILITY_CLINICAL_AUTHORITY",
    };
  }
  if (!encounterOpen) {
    return {
      certificationId: D5A5C_CERTIFICATION_ID,
      allowed: false,
      isFacilityAdministrator,
      isPlatformOperatorOnly,
      reason: "ENCOUNTER_NOT_OPEN",
    };
  }
  return {
    certificationId: D5A5C_CERTIFICATION_ID,
    allowed: true,
    isFacilityAdministrator,
    isPlatformOperatorOnly,
    reason: null,
  };
}
