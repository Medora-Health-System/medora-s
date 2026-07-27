import type { DepartmentCode } from "./departmentResolver.js";
import { mapLegacyPrismaDepartmentCodeToClinicalDepartment } from "./clinicalDepartmentRegistry.js";
import { resolveFacilityServiceLines } from "./facilityServiceLines.js";
import {
  normalizeFacilityType,
  type MedoraFacilityType,
  type MedoraServiceLine,
} from "./facilityTypeRegistry.js";

export type FreestandingErTechnicianAccessInput = {
  roleCodes: readonly string[];
  facilityType?: MedoraFacilityType | string | null;
  facilityServiceLines?: readonly string[] | null;
  departmentCode?: DepartmentCode | string | null;
  encounterType?: string | null;
  encounterDepartmentCode?: string | null;
};

const FREESTANDING_FACILITY_TYPES = new Set<MedoraFacilityType>(["FREESTANDING_ER"]);
const TECHNICIAN_ROLE_CODES = new Set(["LAB", "RADIOLOGY"]);
const STANDARD_TRACKBOARD_ROLES = new Set([
  "FRONT_DESK",
  "RN",
  "PROVIDER",
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
]);

function normalizeRoleCodes(roleCodes: readonly string[] | undefined): string[] {
  return (roleCodes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean);
}

function isFreestandingErOrUrgentCareFacility(
  facilityType: MedoraFacilityType | string | null | undefined,
  facilityServiceLines?: readonly string[] | null
): boolean {
  const type = normalizeFacilityType(facilityType);
  if (FREESTANDING_FACILITY_TYPES.has(type)) return true;
  if (type === "URGENT_CARE") {
    const lines = resolveFacilityServiceLines({
      facilityType: type,
      configuredServiceLines: facilityServiceLines ?? null,
    });
    return lines.includes("EMERGENCY");
  }
  return false;
}

function isLabOrRadTechnicianRole(roleCodes: readonly string[]): boolean {
  const roles = normalizeRoleCodes(roleCodes);
  if (roles.some((code) => STANDARD_TRACKBOARD_ROLES.has(code) && code !== "ADMIN")) {
    if (roles.includes("RN") || roles.includes("PROVIDER")) {
      return false;
    }
  }
  return roles.some((code) => TECHNICIAN_ROLE_CODES.has(code));
}

function resolveClinicalDepartment(departmentCode?: string | null): DepartmentCode | string | null {
  const explicit = String(departmentCode ?? "")
    .trim()
    .toUpperCase();
  if (!explicit) return null;
  return mapLegacyPrismaDepartmentCodeToClinicalDepartment(explicit) ?? explicit;
}

/** Department assignment compatible with freestanding ER lab/rad technician read scope. */
export function departmentAllowsFreestandingErTechnicianRead(
  departmentCode?: string | null
): boolean {
  const clinical = resolveClinicalDepartment(departmentCode);
  if (clinical == null) {
    return true;
  }
  return (
    clinical === "EMERGENCY" ||
    clinical === "LABORATORY" ||
    clinical === "RADIOLOGY" ||
    clinical === "OBSERVATION"
  );
}

function resolveServiceLines(input: FreestandingErTechnicianAccessInput): MedoraServiceLine[] {
  return resolveFacilityServiceLines({
    facilityType: input.facilityType,
    configuredServiceLines: input.facilityServiceLines ?? null,
  });
}

function baseFreestandingErTechnicianEligible(input: FreestandingErTechnicianAccessInput): boolean {
  if (!isLabOrRadTechnicianRole(input.roleCodes)) {
    return false;
  }
  if (!departmentAllowsFreestandingErTechnicianRead(input.departmentCode)) {
    return false;
  }
  if (!isFreestandingErOrUrgentCareFacility(input.facilityType, input.facilityServiceLines)) {
    return false;
  }
  return true;
}

/**
 * LAB/RADIOLOGY technicians may read open ED trackboard rows at freestanding ER / urgent care
 * when the facility exposes the EMERGENCY service line.
 */
export function canReadFreestandingErTrackboard(input: FreestandingErTechnicianAccessInput): boolean {
  if (!baseFreestandingErTechnicianEligible(input)) {
    return false;
  }
  return resolveServiceLines(input).includes("EMERGENCY");
}

/**
 * Observation/inpatient board rows for same technicians when OBSERVATION service line is active.
 */
export function canReadFreestandingErObservationPatients(
  input: FreestandingErTechnicianAccessInput
): boolean {
  if (!baseFreestandingErTechnicianEligible(input)) {
    return false;
  }
  const lines = resolveServiceLines(input);
  return lines.includes("OBSERVATION") && lines.includes("EMERGENCY");
}

/**
 * Orders/results operational context — same facility gate as trackboard read (not MAR).
 */
export function canReadFreestandingErOrdersResultsContext(
  input: FreestandingErTechnicianAccessInput
): boolean {
  return canReadFreestandingErTrackboard(input) || canReadFreestandingErObservationPatients(input);
}

/** Explicit negative guard — technicians never receive MAR equivalence through this module. */
export function canAccessMarAsFreestandingErTechnician(_input: FreestandingErTechnicianAccessInput): boolean {
  return false;
}

/** Whether standard clinical trackboard roles already grant access (unchanged behavior). */
export function hasStandardTrackboardClinicalRole(roleCodes: readonly string[]): boolean {
  const roles = normalizeRoleCodes(roleCodes);
  return roles.some((code) => STANDARD_TRACKBOARD_ROLES.has(code));
}
