import type { ErWorkspaceSection } from "./erWorkspaceSections.js";

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

const ADMIN_TILES: EdWorkspaceTileId[] = [...ED_WORKSPACE_ALL_TILE_IDS];

/** Provider: ME | O | R | Dx | N | D | S */
const PROVIDER_TILES: EdWorkspaceTileId[] = [
  "MEDICAL_EXAM",
  "ORDERS",
  "RESULTS",
  "DIAGNOSTICS",
  "NOTES",
  "DISPOSITION",
  "SUMMARY",
];

/** RN: T | O | M | R | NA | N | D | S */
const RN_TILES: EdWorkspaceTileId[] = [
  "TRIAGE",
  "ORDERS",
  "MEDICATIONS",
  "RESULTS",
  "NURSING_ASSESSMENT",
  "NOTES",
  "DISPOSITION",
  "SUMMARY",
];

/** Lab / Radiology technician: T | O | R | N | D | S */
const TECH_TILES: EdWorkspaceTileId[] = [
  "TRIAGE",
  "ORDERS",
  "RESULTS",
  "NOTES",
  "DISPOSITION",
  "SUMMARY",
];

/** Safe minimal fallback when role group cannot be resolved. */
const UNKNOWN_TILES: EdWorkspaceTileId[] = ["ORDERS", "RESULTS", "SUMMARY"];

const TECH_ROLE_CODES = new Set(["LAB", "RADIOLOGY"]);

export type EdWorkspaceRoleInput = {
  roleCodes: string[];
  canPrescribe?: boolean;
  canAdministerMedication?: boolean;
  canManageOrders?: boolean;
};

function normalizeRoleCodes(roleCodes: readonly string[]): string[] {
  return roleCodes.map((code) => code.trim().toUpperCase()).filter(Boolean);
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
 * Priority: ADMIN → PROVIDER → RN → TECH → UNKNOWN.
 */
export function resolveEdWorkspaceRoleGroup(input: EdWorkspaceRoleInput): EdWorkspaceRoleGroup {
  const roles = normalizeRoleCodes(input.roleCodes);
  const caps = deriveEdWorkspaceCapabilities(roles);
  const canPrescribe = input.canPrescribe ?? caps.canPrescribe;
  const canAdministerMedication =
    input.canAdministerMedication ?? caps.canAdministerMedication;

  if (roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN")) {
    return "ADMIN";
  }
  if (roles.includes("PROVIDER") || canPrescribe) {
    return "PROVIDER";
  }
  if (roles.includes("RN") || canAdministerMedication) {
    return "RN";
  }
  if (roles.some((code) => TECH_ROLE_CODES.has(code))) {
    return "TECH";
  }
  return "UNKNOWN";
}

export function getVisibleEdWorkspaceTiles(input: EdWorkspaceRoleInput): EdWorkspaceTileId[] {
  switch (resolveEdWorkspaceRoleGroup(input)) {
    case "ADMIN":
      return ADMIN_TILES;
    case "PROVIDER":
      return PROVIDER_TILES;
    case "RN":
      return RN_TILES;
    case "TECH":
      return TECH_TILES;
    default:
      return UNKNOWN_TILES;
  }
}

export function getDefaultEdWorkspaceTile(input: EdWorkspaceRoleInput): EdWorkspaceTileId {
  switch (resolveEdWorkspaceRoleGroup(input)) {
    case "PROVIDER":
      return "MEDICAL_EXAM";
    case "RN":
    case "TECH":
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
