import {
  enterpriseProcedureById,
  type EnterpriseProcedureExecutionRole,
  type EnterpriseProcedureExecutionRoleCategory,
} from "./enterpriseProcedureCatalog.js";

export type ProcedureExecutionProfile = {
  executionRoleCategory: EnterpriseProcedureExecutionRoleCategory;
  acknowledgeRoles: EnterpriseProcedureExecutionRole[];
  completeRoles: EnterpriseProcedureExecutionRole[];
  canProviderExecute: boolean;
  canNurseExecute: boolean;
  canTechExecute: boolean;
};

export type ResolveProcedureExecutionProfileInput = {
  enterpriseProcedureId?: string | null;
};

const EMPTY_PROFILE: ProcedureExecutionProfile = {
  executionRoleCategory: "NURSING",
  acknowledgeRoles: ["RN"],
  completeRoles: ["RN"],
  canProviderExecute: false,
  canNurseExecute: true,
  canTechExecute: false,
};

function buildProfileFlags(profile: Pick<ProcedureExecutionProfile, "completeRoles">): Pick<
  ProcedureExecutionProfile,
  "canProviderExecute" | "canNurseExecute" | "canTechExecute"
> {
  const completeRoles = profile.completeRoles;
  return {
    canProviderExecute: completeRoles.includes("PROVIDER"),
    canNurseExecute: completeRoles.includes("RN") || completeRoles.includes("RT"),
    canTechExecute:
      completeRoles.includes("LAB_TECH") || completeRoles.includes("RADIOLOGY_TECH"),
  };
}

/**
 * MEDPROC.4 — resolves enterprise catalog execution profile (metadata only; no PHI).
 */
export function resolveProcedureExecutionProfile(
  input: ResolveProcedureExecutionProfileInput
): ProcedureExecutionProfile | null {
  const enterpriseProcedureId = String(input.enterpriseProcedureId ?? "").trim();
  if (!enterpriseProcedureId) return null;

  const entry = enterpriseProcedureById(enterpriseProcedureId);
  if (!entry) return null;

  return {
    executionRoleCategory: entry.executionRoleCategory,
    acknowledgeRoles: [...entry.acknowledgeRoles],
    completeRoles: [...entry.completeRoles],
    ...buildProfileFlags(entry),
  };
}

/** Legacy CARE fallback when enterpriseProcedureId is absent. */
export function resolveLegacyCareExecutionProfile(): ProcedureExecutionProfile {
  return { ...EMPTY_PROFILE };
}

/**
 * Maps catalog execution roles to requestor RoleCode strings.
 * RT has no dedicated RoleCode yet — RN may fulfill RT tasks in clinic MVP.
 */
export function requestorRoleCodesMatchExecutionRole(
  roleCodes: readonly string[],
  executionRole: EnterpriseProcedureExecutionRole
): boolean {
  const normalized = new Set(roleCodes.map((code) => String(code ?? "").trim().toUpperCase()));
  if (normalized.has("ADMIN")) return true;

  switch (executionRole) {
    case "PROVIDER":
      return normalized.has("PROVIDER");
    case "RN":
      return normalized.has("RN");
    case "RT":
      return normalized.has("RN");
    case "LAB_TECH":
      return normalized.has("LAB");
    case "RADIOLOGY_TECH":
      return normalized.has("RADIOLOGY");
    default:
      return false;
  }
}

export function requestorRoleCodesMatchAnyExecutionRole(
  roleCodes: readonly string[],
  executionRoles: readonly EnterpriseProcedureExecutionRole[]
): boolean {
  return executionRoles.some((role) => requestorRoleCodesMatchExecutionRole(roleCodes, role));
}

export function requestorMayAcknowledgeEnterpriseProcedure(
  roleCodes: readonly string[],
  profile: ProcedureExecutionProfile | null
): boolean {
  if (!profile) return requestorRoleCodesMatchExecutionRole(roleCodes, "RN");
  return requestorRoleCodesMatchAnyExecutionRole(roleCodes, profile.acknowledgeRoles);
}

export function requestorMayCompleteEnterpriseProcedure(
  roleCodes: readonly string[],
  profile: ProcedureExecutionProfile | null
): boolean {
  if (!profile) return requestorRoleCodesMatchExecutionRole(roleCodes, "RN");
  return requestorRoleCodesMatchAnyExecutionRole(roleCodes, profile.completeRoles);
}

export function requestorMayStartEnterpriseProcedure(
  roleCodes: readonly string[],
  profile: ProcedureExecutionProfile | null
): boolean {
  return requestorMayAcknowledgeEnterpriseProcedure(roleCodes, profile);
}
