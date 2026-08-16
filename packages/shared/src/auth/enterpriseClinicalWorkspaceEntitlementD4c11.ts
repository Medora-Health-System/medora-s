/**
 * MEDUI.D4C.11 — Clinical workspace entitlement resolver.
 * Facility membership ∩ module enabled ∩ profession/assignment ∩ capability.
 */

import {
  canonicalizeWorkforceProfession,
  hasDentalProfessionAssignment,
  hasClinicProfessionAssignment,
  isDentalWorkforceProfession,
  isProviderFamilyProfession,
  type WorkforceProfessionCode,
} from "./enterpriseWorkforceProfessionD4c11.js";
import {
  hasFacilityClinicalAuthoringRoleCodes,
  isPlatformOperatorOnlyRoleCodes,
} from "./enterpriseFacilityAdministratorClinicalAuthoringD5a5c.js";

export const D4C11_WORKSPACE_ENTITLEMENT_ID = "MEDUI.D4C.11" as const;

export type ClinicalWorkspaceId = "CLINIC" | "DENTAL" | "EMERGENCY" | "HOSPITAL";

export type ClinicalWorkspaceEntitlement = {
  certificationId: typeof D4C11_WORKSPACE_ENTITLEMENT_ID;
  workspace: ClinicalWorkspaceId;
  allowed: boolean;
  reason:
    | "NO_FACILITY_MEMBERSHIP"
    | "MODULE_DISABLED"
    | "NO_PROFESSION_ASSIGNMENT"
    | "PLATFORM_OPERATOR_ONLY"
    | "EXPLICIT_RESTRICTION"
    | "FACILITY_ADMIN_DEFAULT"
    | "PROFESSION_ASSIGNMENT"
    | null;
  professionCodes: string[];
};

function normalizeList(values: readonly string[] | null | undefined): string[] {
  return (values ?? []).map((v) => String(v ?? "").trim().toUpperCase()).filter(Boolean);
}

function hasDentalDepartment(departmentCodes: readonly string[]): boolean {
  return departmentCodes.includes("DENTAL");
}

function hasClinicDepartment(departmentCodes: readonly string[]): boolean {
  return (
    departmentCodes.includes("PRIMARY_CARE") ||
    departmentCodes.includes("CLINIC") ||
    departmentCodes.includes("URGENT_CARE")
  );
}

/**
 * Authoritative clinical workspace entitlement.
 * MEDICINE+CLINIC does not imply Dental. DENTIST+DENTAL does not imply Clinic.
 * Dual assignments grant both. Facility ADMIN defaults to enabled modules.
 */
export function resolveClinicalWorkspaceEntitlement(input: {
  roleCodes?: readonly string[] | null;
  professionCodes?: readonly string[] | null;
  departmentCodes?: readonly string[] | null;
  workspace: ClinicalWorkspaceId;
  moduleEnabled: boolean;
  hasFacilityMembership?: boolean;
  explicitRestrictionDenied?: boolean | null;
}): ClinicalWorkspaceEntitlement {
  const roleCodes = normalizeList(input.roleCodes);
  const professionCodes = normalizeList(input.professionCodes).map(
    (c) => canonicalizeWorkforceProfession(c) ?? c
  );
  const departmentCodes = normalizeList(input.departmentCodes);
  const hasMembership = input.hasFacilityMembership !== false;

  const base = {
    certificationId: D4C11_WORKSPACE_ENTITLEMENT_ID,
    workspace: input.workspace,
    professionCodes,
  } as const;

  if (!hasMembership) {
    return { ...base, allowed: false, reason: "NO_FACILITY_MEMBERSHIP" };
  }
  if (!input.moduleEnabled) {
    return { ...base, allowed: false, reason: "MODULE_DISABLED" };
  }
  if (input.explicitRestrictionDenied === true) {
    return { ...base, allowed: false, reason: "EXPLICIT_RESTRICTION" };
  }
  if (isPlatformOperatorOnlyRoleCodes(roleCodes) && !hasFacilityClinicalAuthoringRoleCodes(roleCodes)) {
    return { ...base, allowed: false, reason: "PLATFORM_OPERATOR_ONLY" };
  }

  const isFacilityAdmin = roleCodes.includes("ADMIN");

  if (input.workspace === "DENTAL") {
    if (isFacilityAdmin) {
      return { ...base, allowed: true, reason: "FACILITY_ADMIN_DEFAULT" };
    }
    if (hasDentalProfessionAssignment(professionCodes)) {
      return { ...base, allowed: true, reason: "PROFESSION_ASSIGNMENT" };
    }
    // Provider-family medicine (MD/DO/PA/NP/MEDICINE) without dental profession must not inherit Dental.
    if (
      professionCodes.some((p) => isProviderFamilyProfession(p) && !isDentalWorkforceProfession(p)) &&
      !hasDentalProfessionAssignment(professionCodes)
    ) {
      return { ...base, allowed: false, reason: "NO_PROFESSION_ASSIGNMENT" };
    }
    if (roleCodes.includes("PROVIDER") && !hasDentalProfessionAssignment(professionCodes)) {
      // Inferred MEDICINE when professionCodes empty / department not DENTAL
      if (!hasDentalDepartment(departmentCodes)) {
        return { ...base, allowed: false, reason: "NO_PROFESSION_ASSIGNMENT" };
      }
    }
    // Legacy support roles: RN / FRONT_DESK / BILLING / PCT keep dental shell when line on
    if (
      roleCodes.includes("FRONT_DESK") ||
      roleCodes.includes("BILLING") ||
      roleCodes.includes("RN") ||
      roleCodes.includes("PATIENT_CARE_TECH")
    ) {
      return { ...base, allowed: true, reason: "PROFESSION_ASSIGNMENT" };
    }
    if (hasDentalDepartment(departmentCodes) && roleCodes.includes("PROVIDER")) {
      return { ...base, allowed: true, reason: "PROFESSION_ASSIGNMENT" };
    }
    return { ...base, allowed: false, reason: "NO_PROFESSION_ASSIGNMENT" };
  }

  if (input.workspace === "CLINIC") {
    if (isFacilityAdmin) {
      return { ...base, allowed: true, reason: "FACILITY_ADMIN_DEFAULT" };
    }
    if (hasClinicProfessionAssignment(professionCodes)) {
      return { ...base, allowed: true, reason: "PROFESSION_ASSIGNMENT" };
    }
    // Legacy clinic: PROVIDER/RN/FRONT_DESK/BILLING without dental-only professions
    const dentalOnly =
      professionCodes.length > 0 &&
      professionCodes.every((p) => isDentalWorkforceProfession(p) || p === "DENTIST");
    if (dentalOnly && !hasClinicProfessionAssignment(professionCodes)) {
      return { ...base, allowed: false, reason: "NO_PROFESSION_ASSIGNMENT" };
    }
    if (
      roleCodes.includes("PROVIDER") ||
      roleCodes.includes("RN") ||
      roleCodes.includes("FRONT_DESK") ||
      roleCodes.includes("BILLING") ||
      roleCodes.includes("PHARMACY") ||
      roleCodes.includes("LAB") ||
      roleCodes.includes("RADIOLOGY") ||
      roleCodes.includes("PATIENT_CARE_TECH")
    ) {
      // If only dental professions present, deny clinic even with PROVIDER role from dentist mapping
      if (
        professionCodes.length > 0 &&
        !hasClinicProfessionAssignment(professionCodes) &&
        hasDentalProfessionAssignment(professionCodes)
      ) {
        return { ...base, allowed: false, reason: "NO_PROFESSION_ASSIGNMENT" };
      }
      return { ...base, allowed: true, reason: "PROFESSION_ASSIGNMENT" };
    }
    if (hasClinicDepartment(departmentCodes) && roleCodes.includes("PROVIDER")) {
      return { ...base, allowed: true, reason: "PROFESSION_ASSIGNMENT" };
    }
    return { ...base, allowed: false, reason: "NO_PROFESSION_ASSIGNMENT" };
  }

  // EMERGENCY / HOSPITAL — role-based membership; not expanded in this milestone
  return { ...base, allowed: hasMembership && input.moduleEnabled, reason: null };
}

export function listActiveWorkforceProfessions(
  professionCodes: readonly string[] | null | undefined
): WorkforceProfessionCode[] {
  const out: WorkforceProfessionCode[] = [];
  for (const raw of professionCodes ?? []) {
    const c = canonicalizeWorkforceProfession(raw);
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}
