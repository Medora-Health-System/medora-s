import type { DepartmentCode } from "./departmentResolver.js";
import type { ProfessionGroup } from "./professionResolver.js";

/** Workspace tiles across clinical departments (ED tiles + future department queues). */
export type WorkspaceTileId =
  | "TRIAGE"
  | "MEDICAL_EXAM"
  | "ORDERS"
  | "MEDICATIONS"
  | "RESULTS"
  | "DIAGNOSTICS"
  | "NURSING_ASSESSMENT"
  | "NOTES"
  | "DISPOSITION"
  | "SUMMARY"
  | "LAB_QUEUE"
  | "RADIOLOGY_QUEUE"
  | "VITALS";

export const ED_WORKSPACE_TILE_IDS: readonly WorkspaceTileId[] = [
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

const ED_TILE_SET = new Set<string>(ED_WORKSPACE_TILE_IDS);

export type WorkspacePermissions = {
  visibleTiles: WorkspaceTileId[];
  canDocumentTriage: boolean;
  canDocumentVitals: boolean;
  canDocumentNotes: boolean;
  canAdministerMedication: boolean;
  canPerformMedicalExam: boolean;
  canAccessDiagnostics: boolean;
  canDischargePatient: boolean;
};

export type ResolveWorkspacePermissionsInput = {
  profession: ProfessionGroup;
  department: DepartmentCode | null;
  /** Facility scope — reserved for future facility-specific policy; unused in MEDUI.AUTH.ROLE.1. */
  facilityId?: string | null;
};

const ADMIN_TILES: WorkspaceTileId[] = [...ED_WORKSPACE_TILE_IDS];

const PROVIDER_EMERGENCY_TILES: WorkspaceTileId[] = [
  "MEDICAL_EXAM",
  "ORDERS",
  "RESULTS",
  "DIAGNOSTICS",
  "NOTES",
  "DISPOSITION",
  "SUMMARY",
];

const RN_EMERGENCY_TILES: WorkspaceTileId[] = [
  "TRIAGE",
  "ORDERS",
  "MEDICATIONS",
  "RESULTS",
  "NURSING_ASSESSMENT",
  "NOTES",
  "DISPOSITION",
  "SUMMARY",
];

const TECHNICIAN_EMERGENCY_TILES: WorkspaceTileId[] = [
  "TRIAGE",
  "ORDERS",
  "RESULTS",
  "NOTES",
  "DISPOSITION",
  "SUMMARY",
];

const TECHNICIAN_ICU_TILES: WorkspaceTileId[] = ["VITALS", "NOTES", "SUMMARY"];

const TECHNICIAN_LAB_TILES: WorkspaceTileId[] = [
  "LAB_QUEUE",
  "ORDERS",
  "RESULTS",
  "NOTES",
  "SUMMARY",
];

const TECHNICIAN_RAD_TILES: WorkspaceTileId[] = [
  "RADIOLOGY_QUEUE",
  "ORDERS",
  "RESULTS",
  "NOTES",
  "SUMMARY",
];

const UNKNOWN_TILES: WorkspaceTileId[] = ["ORDERS", "RESULTS", "SUMMARY"];

const NO_PERMISSIONS: Omit<WorkspacePermissions, "visibleTiles"> = {
  canDocumentTriage: false,
  canDocumentVitals: false,
  canDocumentNotes: false,
  canAdministerMedication: false,
  canPerformMedicalExam: false,
  canAccessDiagnostics: false,
  canDischargePatient: false,
};

const ADMIN_PERMISSIONS: Omit<WorkspacePermissions, "visibleTiles"> = {
  canDocumentTriage: true,
  canDocumentVitals: true,
  canDocumentNotes: true,
  canAdministerMedication: true,
  canPerformMedicalExam: true,
  canAccessDiagnostics: true,
  canDischargePatient: true,
};

function resolveEmergencyPermissions(profession: ProfessionGroup): WorkspacePermissions {
  switch (profession) {
    case "ADMIN":
      return { visibleTiles: ADMIN_TILES, ...ADMIN_PERMISSIONS };
    case "PROVIDER":
      return {
        visibleTiles: PROVIDER_EMERGENCY_TILES,
        canDocumentTriage: false,
        canDocumentVitals: false,
        canDocumentNotes: true,
        canAdministerMedication: false,
        canPerformMedicalExam: true,
        canAccessDiagnostics: true,
        canDischargePatient: true,
      };
    case "RN":
      return {
        visibleTiles: RN_EMERGENCY_TILES,
        canDocumentTriage: true,
        canDocumentVitals: true,
        canDocumentNotes: true,
        canAdministerMedication: true,
        canPerformMedicalExam: false,
        canAccessDiagnostics: false,
        canDischargePatient: true,
      };
    case "TECHNICIAN":
      return {
        visibleTiles: TECHNICIAN_EMERGENCY_TILES,
        canDocumentTriage: true,
        canDocumentVitals: true,
        canDocumentNotes: true,
        canAdministerMedication: false,
        canPerformMedicalExam: false,
        canAccessDiagnostics: false,
        canDischargePatient: true,
      };
    default:
      return {
        visibleTiles: UNKNOWN_TILES,
        ...NO_PERMISSIONS,
        canDocumentNotes: false,
      };
  }
}

function resolveTechnicianDepartmentPermissions(
  department: DepartmentCode
): WorkspacePermissions {
  switch (department) {
    case "ICU":
      return {
        visibleTiles: TECHNICIAN_ICU_TILES,
        canDocumentTriage: false,
        canDocumentVitals: true,
        canDocumentNotes: true,
        canAdministerMedication: false,
        canPerformMedicalExam: false,
        canAccessDiagnostics: false,
        canDischargePatient: false,
      };
    case "LABORATORY":
      return {
        visibleTiles: TECHNICIAN_LAB_TILES,
        canDocumentTriage: false,
        canDocumentVitals: false,
        canDocumentNotes: true,
        canAdministerMedication: false,
        canPerformMedicalExam: false,
        canAccessDiagnostics: false,
        canDischargePatient: false,
      };
    case "RADIOLOGY":
      return {
        visibleTiles: TECHNICIAN_RAD_TILES,
        canDocumentTriage: false,
        canDocumentVitals: false,
        canDocumentNotes: true,
        canAdministerMedication: false,
        canPerformMedicalExam: false,
        canAccessDiagnostics: false,
        canDischargePatient: false,
      };
    case "EMERGENCY":
      return resolveEmergencyPermissions("TECHNICIAN");
    default:
      return {
        visibleTiles: UNKNOWN_TILES,
        ...NO_PERMISSIONS,
      };
  }
}

/**
 * Profession + department + facility authorization matrix.
 * Bounds match current pilot capabilities — does not expand permissions beyond existing behavior.
 */
export function resolveWorkspacePermissions(
  input: ResolveWorkspacePermissionsInput
): WorkspacePermissions {
  const { profession, department } = input;

  if (profession === "ADMIN") {
    return { visibleTiles: ADMIN_TILES, ...ADMIN_PERMISSIONS };
  }

  if (profession === "TECHNICIAN" && department != null) {
    return resolveTechnicianDepartmentPermissions(department);
  }

  if (department === "EMERGENCY" || department == null) {
    return resolveEmergencyPermissions(profession);
  }

  return {
    visibleTiles: UNKNOWN_TILES,
    ...NO_PERMISSIONS,
  };
}

/** Restrict workspace tiles to those rendered in the ED active workspace dashboard. */
export function filterEdWorkspaceTiles(tiles: readonly WorkspaceTileId[]): WorkspaceTileId[] {
  return tiles.filter((tile): tile is WorkspaceTileId => ED_TILE_SET.has(tile));
}
