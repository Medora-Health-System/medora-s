import {
  resolveDepartmentCode,
  resolveProfessionGroup,
  resolveWorkspacePermissions,
  type WorkspaceTileId,
} from "@medora/shared";
import type { HospitalTechnicianSection } from "./hospitalTechnicianSections";
import {
  HOSPITAL_FLOOR_DEPARTMENT_CODES,
  isHospitalFloorDepartmentCode,
  type HospitalTechnicianSessionInput,
} from "./hospitalTechnicianWorkspace";

export type HospitalTechnicianTileId = "VITALS" | "NOTES" | "SUMMARY";

/** Future placeholders — not rendered in MEDUI.HOSP.TECH.1. */
export type HospitalTechnicianFutureTileId = "TASKS" | "FLOWSHEET";

export const HOSPITAL_TECHNICIAN_ALL_TILE_IDS: readonly HospitalTechnicianTileId[] = [
  "VITALS",
  "NOTES",
  "SUMMARY",
] as const;

export const HOSPITAL_TECHNICIAN_FUTURE_TILE_IDS: readonly HospitalTechnicianFutureTileId[] = [
  "TASKS",
  "FLOWSHEET",
] as const;

const TILE_TO_SECTION: Record<HospitalTechnicianTileId, HospitalTechnicianSection> = {
  VITALS: "vitals",
  NOTES: "notes",
  SUMMARY: "summary",
};

const SECTION_TO_TILE: Record<HospitalTechnicianSection, HospitalTechnicianTileId> = {
  vitals: "VITALS",
  notes: "NOTES",
  summary: "SUMMARY",
};

const HOSPITAL_TECHNICIAN_TILE_SET = new Set<string>(HOSPITAL_TECHNICIAN_ALL_TILE_IDS);

function toHospitalTechnicianTileIds(tiles: WorkspaceTileId[]): HospitalTechnicianTileId[] {
  return tiles.filter((tile): tile is HospitalTechnicianTileId =>
    HOSPITAL_TECHNICIAN_TILE_SET.has(tile)
  );
}

function resolveHospitalTechnicianAuthContext(input: HospitalTechnicianSessionInput) {
  const profession = resolveProfessionGroup({ roleCodes: input.roleCodes });
  const department = resolveDepartmentCode({
    departmentCode: input.departmentCode,
    prismaDepartmentCode: input.prismaDepartmentCode,
    roleCodes: input.roleCodes,
    clinicalWorkspace: "GENERAL",
  });
  const permissions = resolveWorkspacePermissions({
    profession,
    department,
  });
  return { profession, department, permissions };
}

/** True when user is TECHNICIAN assigned to an inpatient floor department. */
export function isHospitalFloorTechnicianProfile(input: HospitalTechnicianSessionInput): boolean {
  const { profession, department } = resolveHospitalTechnicianAuthContext(input);
  if (profession !== "TECHNICIAN") return false;
  return department != null && isHospitalFloorDepartmentCode(department);
}

/** Profession + department tiles for hospital floor technician workspace. */
export function getVisibleHospitalTechnicianTiles(
  input: HospitalTechnicianSessionInput
): HospitalTechnicianTileId[] {
  const { permissions } = resolveHospitalTechnicianAuthContext(input);
  return toHospitalTechnicianTileIds(permissions.visibleTiles);
}

export function getDefaultHospitalTechnicianTile(
  input: HospitalTechnicianSessionInput
): HospitalTechnicianTileId {
  const visible = getVisibleHospitalTechnicianTiles(input);
  return visible[0] ?? "VITALS";
}

export function hospitalTechnicianTileToSection(tileId: HospitalTechnicianTileId): HospitalTechnicianSection {
  return TILE_TO_SECTION[tileId];
}

export function hospitalTechnicianSectionToTileId(
  section: HospitalTechnicianSection
): HospitalTechnicianTileId {
  return SECTION_TO_TILE[section];
}

export function isHospitalTechnicianSectionVisible(
  section: HospitalTechnicianSection,
  input: HospitalTechnicianSessionInput
): boolean {
  const tileId = hospitalTechnicianSectionToTileId(section);
  return getVisibleHospitalTechnicianTiles(input).includes(tileId);
}

export function hospitalTechnicianWorkspacePermissions(input: HospitalTechnicianSessionInput) {
  return resolveHospitalTechnicianAuthContext(input).permissions;
}

/** Floor departments that share the same Vitals | Notes | Summary tile matrix. */
export function hospitalFloorDepartmentCodesForTests(): readonly string[] {
  return HOSPITAL_FLOOR_DEPARTMENT_CODES;
}
