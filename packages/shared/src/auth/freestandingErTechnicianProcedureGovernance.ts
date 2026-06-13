import {
  requestorMayAcknowledgeEnterpriseProcedure,
  requestorMayCompleteEnterpriseProcedure,
  type ProcedureExecutionProfile,
} from "../procedures/enterpriseProcedureExecutionProfile.js";
import { normalizeFacilityType, type MedoraFacilityType } from "./facilityTypeRegistry.js";

const FREESTANDING_FACILITY_TYPES = new Set<MedoraFacilityType>(["FREESTANDING_ER", "URGENT_CARE"]);

/** MEDUI.ED.PROCEDURE.TECH.1 — explicit freestanding ER delegated technician procedures only. */
export const FREESTANDING_ER_DELEGATED_TECHNICIAN_PROCEDURE_IDS = [
  "ekg_ecg",
  "ekg_rhythm_strip",
  "blood_draw_specimen_collection",
  "blood_culture_collection",
  "urine_collection",
  "pregnancy_test",
] as const;

export type FreestandingErDelegatedTechnicianProcedureId =
  (typeof FREESTANDING_ER_DELEGATED_TECHNICIAN_PROCEDURE_IDS)[number];

export type EnterpriseProcedureTechnicianAction = "acknowledge" | "start" | "complete";

function normalizeRoleCodes(roleCodes: readonly string[] | undefined): string[] {
  return (roleCodes ?? []).map((code) => String(code ?? "").trim().toUpperCase()).filter(Boolean);
}

export function isFreestandingErOrUrgentCareFacilityType(
  facilityType: MedoraFacilityType | string | null | undefined
): boolean {
  return FREESTANDING_FACILITY_TYPES.has(normalizeFacilityType(facilityType));
}

export function isDelegatedFreestandingErTechnicianProcedure(
  enterpriseProcedureId: string | null | undefined
): enterpriseProcedureId is FreestandingErDelegatedTechnicianProcedureId {
  const id = String(enterpriseProcedureId ?? "").trim();
  return (FREESTANDING_ER_DELEGATED_TECHNICIAN_PROCEDURE_IDS as readonly string[]).includes(id);
}

/** True when requestor is LAB/RADIOLOGY without RN/PROVIDER/ADMIN clinical authority on this check. */
export function requestorIsLabOrRadiologyTechnicianOnly(roleCodes: readonly string[]): boolean {
  const roles = normalizeRoleCodes(roleCodes);
  const hasTechnician = roles.includes("LAB") || roles.includes("RADIOLOGY");
  if (!hasTechnician) return false;
  return !roles.some((code) => code === "RN" || code === "PROVIDER" || code === "ADMIN");
}

function catalogAllowsAction(
  roleCodes: readonly string[],
  profile: ProcedureExecutionProfile | null,
  action: EnterpriseProcedureTechnicianAction
): boolean {
  if (action === "complete") {
    return requestorMayCompleteEnterpriseProcedure(roleCodes, profile);
  }
  return requestorMayAcknowledgeEnterpriseProcedure(roleCodes, profile);
}

/**
 * MEDPROC.4 + freestanding ER scope — technicians (LAB/RADIOLOGY only) may act only at
 * FREESTANDING_ER / URGENT_CARE on the explicit delegated procedure allowlist.
 * RN / PROVIDER / ADMIN paths use catalog rules unchanged.
 */
export function requestorMayPerformEnterpriseProcedureAction(input: {
  roleCodes: readonly string[];
  facilityType?: MedoraFacilityType | string | null;
  enterpriseProcedureId?: string | null;
  profile: ProcedureExecutionProfile | null;
  action: EnterpriseProcedureTechnicianAction;
}): boolean {
  const { roleCodes, facilityType, enterpriseProcedureId, profile, action } = input;
  const roles = normalizeRoleCodes(roleCodes);

  if (roles.includes("ADMIN")) {
    return true;
  }

  if (roles.includes("RN") || roles.includes("PROVIDER")) {
    return catalogAllowsAction(roleCodes, profile, action);
  }

  if (!requestorIsLabOrRadiologyTechnicianOnly(roleCodes)) {
    return catalogAllowsAction(roleCodes, profile, action);
  }

  if (!isFreestandingErOrUrgentCareFacilityType(facilityType)) {
    return false;
  }

  if (!isDelegatedFreestandingErTechnicianProcedure(enterpriseProcedureId)) {
    return false;
  }

  return catalogAllowsAction(roleCodes, profile, action);
}

export function requestorMayAcknowledgeEnterpriseProcedureForFacility(
  roleCodes: readonly string[],
  facilityType: MedoraFacilityType | string | null | undefined,
  enterpriseProcedureId: string | null | undefined,
  profile: ProcedureExecutionProfile | null
): boolean {
  return requestorMayPerformEnterpriseProcedureAction({
    roleCodes,
    facilityType,
    enterpriseProcedureId,
    profile,
    action: "acknowledge",
  });
}

export function requestorMayCompleteEnterpriseProcedureForFacility(
  roleCodes: readonly string[],
  facilityType: MedoraFacilityType | string | null | undefined,
  enterpriseProcedureId: string | null | undefined,
  profile: ProcedureExecutionProfile | null
): boolean {
  return requestorMayPerformEnterpriseProcedureAction({
    roleCodes,
    facilityType,
    enterpriseProcedureId,
    profile,
    action: "complete",
  });
}

export function requestorMayStartEnterpriseProcedureForFacility(
  roleCodes: readonly string[],
  facilityType: MedoraFacilityType | string | null | undefined,
  enterpriseProcedureId: string | null | undefined,
  profile: ProcedureExecutionProfile | null
): boolean {
  return requestorMayPerformEnterpriseProcedureAction({
    roleCodes,
    facilityType,
    enterpriseProcedureId,
    profile,
    action: "start",
  });
}
