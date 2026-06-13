import type { ErWorkspaceSection } from "./erWorkspaceSections.js";
import {
  canDocumentEdTriage,
  filterEdWorkspaceTiles,
  resolveDepartmentCode,
  resolveProfessionGroup,
  resolveWorkspacePermissions,
  type WorkspaceTileId,
} from "@medora/shared";

export type EdWorkspaceTileId =
  | "TRIAGE"
  | "MEDICAL_EXAM"
  | "ORDERS"
  | "MEDICATIONS"
  | "RESULTS"
  | "DIAGNOSTICS"
  | "NURSING_ASSESSMENT"
  | "NOTES"
  | "DISPOSITION"
  | "SUMMARY";

export type EdWorkspaceRoleGroup = "PROVIDER" | "RN" | "TECH" | "ADMIN" | "UNKNOWN";

/** Full dashboard tile registry — order preserved for Admin / UX sketches. */
export const ED_WORKSPACE_ALL_TILE_IDS: readonly EdWorkspaceTileId[] = [
  "TRIAGE",
  "MEDICAL_EXAM",
  "ORDERS",
  "MEDICATIONS",
  "RESULTS",
  "DIAGNOSTICS",
  "NURSING_ASSESSMENT",
  "NOTES",
  "DISPOSITION",
  "SUMMARY",
] as const;

const TILE_TO_SECTION: Record<EdWorkspaceTileId, ErWorkspaceSection> = {
  TRIAGE: "triage",
  MEDICAL_EXAM: "providerMse",
  ORDERS: "orders",
  MEDICATIONS: "mar",
  RESULTS: "results",
  DIAGNOSTICS: "diagnostics",
  NURSING_ASSESSMENT: "nursing",
  NOTES: "notes",
  DISPOSITION: "disposition",
  SUMMARY: "visitSummary",
};

const SECTION_TO_TILE: Record<ErWorkspaceSection, EdWorkspaceTileId> = {
  triage: "TRIAGE",
  providerMse: "MEDICAL_EXAM",
  orders: "ORDERS",
  mar: "MEDICATIONS",
  results: "RESULTS",
  diagnostics: "DIAGNOSTICS",
  nursing: "NURSING_ASSESSMENT",
  notes: "NOTES",
  disposition: "DISPOSITION",
  visitSummary: "SUMMARY",
};

export type EdWorkspaceRoleInput = {
  roleCodes: string[];
  canPrescribe?: boolean;
  canAdministerMedication?: boolean;
  canManageOrders?: boolean;
  /** MEDUI.AUTH.ROLE.1 — explicit clinical department when assigned on UserRole. */
  assignedDepartmentCode?: string | null;
  /** Prisma `Department.code` when departmentId is resolved server-side. */
  prismaDepartmentCode?: string | null;
  facilityId?: string | null;
};

function normalizeRoleCodes(roleCodes: readonly string[]): string[] {
  return roleCodes.map((code) => code.trim().toUpperCase()).filter(Boolean);
}

function toEdWorkspaceTileIds(tiles: WorkspaceTileId[]): EdWorkspaceTileId[] {
  return filterEdWorkspaceTiles(tiles) as EdWorkspaceTileId[];
}

function resolveEdAuthContext(input: EdWorkspaceRoleInput) {
  const profession = resolveProfessionGroup({
    roleCodes: input.roleCodes,
    canPrescribe: input.canPrescribe,
    canAdministerMedication: input.canAdministerMedication,
  });
  const department = resolveDepartmentCode({
    departmentCode: input.assignedDepartmentCode,
    prismaDepartmentCode: input.prismaDepartmentCode,
    roleCodes: input.roleCodes,
    clinicalWorkspace: "ED",
  });
  const permissions = resolveWorkspacePermissions({
    profession,
    department,
    facilityId: input.facilityId ?? null,
  });
  return { profession, department, permissions };
}

/** Derive clinical capability flags from enrolled facility role codes (mirrors useFacilityAndRoles). */
export function deriveEdWorkspaceCapabilities(roleCodes: readonly string[]): {
  canPrescribe: boolean;
  canAdministerMedication: boolean;
  canManageOrders: boolean;
} {
  const roles = normalizeRoleCodes(roleCodes);
  return {
    canPrescribe: roles.includes("PROVIDER") || roles.includes("ADMIN"),
    canAdministerMedication:
      roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN"),
    canManageOrders:
      roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("LAB") ||
      roles.includes("RADIOLOGY"),
  };
}

/**
 * Resolve ED workspace role group from enrolled facility roles.
 * Backward-compatible alias over {@link resolveProfessionGroup}.
 */
export function resolveEdWorkspaceRoleGroup(input: EdWorkspaceRoleInput): EdWorkspaceRoleGroup {
  const { profession } = resolveEdAuthContext(input);
  switch (profession) {
    case "ADMIN":
      return "ADMIN";
    case "PROVIDER":
      return "PROVIDER";
    case "RN":
      return "RN";
    case "TECHNICIAN":
      return "TECH";
    default:
      return "UNKNOWN";
  }
}

/** MEDUI.AUTH.ROLE.1 — profession + department workspace tiles, filtered to ED dashboard tiles. */
export function getVisibleEdWorkspaceTiles(input: EdWorkspaceRoleInput): EdWorkspaceTileId[] {
  const { permissions } = resolveEdAuthContext(input);
  return toEdWorkspaceTileIds(permissions.visibleTiles);
}

/** Hide triage tile for floor tech when encounter is not ED-eligible (MEDUI.ED.ROLE.1A). */
export function applyEdWorkspaceEncounterTileFilter(
  tiles: EdWorkspaceTileId[],
  input: EdWorkspaceRoleInput & {
    encounterType?: string | null;
    departmentCode?: string | null;
    facilityUnit?: string | null;
  }
): EdWorkspaceTileId[] {
  if (!tiles.includes("TRIAGE")) return tiles;
  if (
    canDocumentEdTriage({
      roleCodes: input.roleCodes,
      encounterType: input.encounterType,
      departmentCode: input.departmentCode,
      facilityUnit: input.facilityUnit,
    })
  ) {
    return tiles;
  }
  return tiles.filter((id) => id !== "TRIAGE");
}

export function getDefaultEdWorkspaceTile(input: EdWorkspaceRoleInput): EdWorkspaceTileId {
  const { profession } = resolveEdAuthContext(input);
  switch (profession) {
    case "PROVIDER":
      return "MEDICAL_EXAM";
    case "RN":
    case "TECHNICIAN":
    case "ADMIN":
      return "TRIAGE";
    default:
      return "SUMMARY";
  }
}

export function edWorkspaceTileToSection(tileId: EdWorkspaceTileId): ErWorkspaceSection {
  return TILE_TO_SECTION[tileId];
}

export function erWorkspaceSectionToTileId(section: ErWorkspaceSection): EdWorkspaceTileId {
  return SECTION_TO_TILE[section];
}

export function isErWorkspaceSectionVisible(
  section: ErWorkspaceSection,
  input: EdWorkspaceRoleInput
): boolean {
  const tileId = erWorkspaceSectionToTileId(section);
  return getVisibleEdWorkspaceTiles(input).includes(tileId);
}
