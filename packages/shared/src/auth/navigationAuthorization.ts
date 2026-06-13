import type { DepartmentCode } from "./departmentResolver.js";
import { isClinicalDepartmentCode, resolveDepartmentCode } from "./departmentResolver.js";
import {
  facilitySupportsObservationAccessForTechnician,
  resolveFacilityServiceLines,
} from "./facilityServiceLines.js";
import { canReadFreestandingErTrackboard } from "./freestandingErTechnicianAccess.js";
import type { MedoraFacilityType, MedoraServiceLine } from "./facilityTypeRegistry.js";
import { normalizeFacilityType } from "./facilityTypeRegistry.js";
import type { ProfessionGroup } from "./professionResolver.js";
import { resolveProfessionGroup } from "./professionResolver.js";

export type NavigationArea =
  | "DASHBOARD"
  | "EMERGENCY"
  | "HOSPITAL"
  | "LABORATORY"
  | "RADIOLOGY"
  | "PHARMACY"
  | "BILLING"
  | "ADMINISTRATION";

export const NAVIGATION_AREAS: readonly NavigationArea[] = [
  "DASHBOARD",
  "EMERGENCY",
  "HOSPITAL",
  "LABORATORY",
  "RADIOLOGY",
  "PHARMACY",
  "BILLING",
  "ADMINISTRATION",
] as const;

const ALL_NAVIGATION_AREAS: NavigationArea[] = [...NAVIGATION_AREAS];

const HOSPITAL_DEPARTMENTS = new Set<DepartmentCode>([
  "ICU",
  "MEDSURG",
  "OBGYN",
  "PEDIATRICS",
  "OBSERVATION",
  "BEHAVIORAL_HEALTH",
  "TELEMETRY",
]);

export type ResolveNavigationAreasInput = {
  professionGroup: ProfessionGroup;
  departmentCode?: DepartmentCode | string | null;
  roleCodes?: readonly string[];
  facilityType?: MedoraFacilityType | string | null;
  facilityServiceLines?: readonly string[] | null;
};

export type NavigationProfileInput = {
  roleCodes: readonly string[];
  departmentCode?: string | null;
  prismaDepartmentCode?: string | null;
  facilityType?: MedoraFacilityType | string | null;
  facilityServiceLines?: readonly string[] | null;
};

function normalizeClinicalDepartment(
  departmentCode?: DepartmentCode | string | null
): DepartmentCode | null {
  const explicit = String(departmentCode ?? "")
    .trim()
    .toUpperCase();
  if (explicit && isClinicalDepartmentCode(explicit)) {
    return explicit;
  }
  return null;
}

function normalizeRoleCodes(roleCodes: readonly string[] | undefined): string[] {
  return (roleCodes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean);
}

function serviceLineToNavigationArea(line: MedoraServiceLine): NavigationArea | null {
  switch (line) {
    case "EMERGENCY":
      return "EMERGENCY";
    case "LABORATORY":
      return "LABORATORY";
    case "RADIOLOGY":
      return "RADIOLOGY";
    case "PHARMACY":
      return "PHARMACY";
    case "OBSERVATION":
    case "ICU":
    case "MEDSURG":
    case "OBGYN":
    case "PEDIATRICS":
    case "BEHAVIORAL_HEALTH":
    case "TELEMETRY":
      return "HOSPITAL";
    default:
      return null;
  }
}

export function getNavigationAreasForServiceLines(
  serviceLines: readonly MedoraServiceLine[]
): Set<NavigationArea> {
  const areas = new Set<NavigationArea>(["DASHBOARD"]);
  for (const line of serviceLines) {
    const area = serviceLineToNavigationArea(line);
    if (area) areas.add(area);
  }
  return areas;
}

function supplementAssignmentNavigationAreas(
  baseAreas: NavigationArea[],
  input: {
    professionGroup: ProfessionGroup;
    departmentCode: DepartmentCode | null;
    roleCodes: readonly string[];
    facilityServiceLines: readonly MedoraServiceLine[];
    facilityType?: MedoraFacilityType | string | null;
  }
): NavigationArea[] {
  const areas = new Set(baseAreas);
  const roles = normalizeRoleCodes(input.roleCodes);
  const lineSet = new Set(input.facilityServiceLines);

  if (input.professionGroup !== "TECHNICIAN" && input.professionGroup !== "PROVIDER" && input.professionGroup !== "RN") {
    return baseAreas;
  }

  if (
    (input.departmentCode === "EMERGENCY" || input.departmentCode == null) &&
    lineSet.has("OBSERVATION")
  ) {
    areas.add("HOSPITAL");
  }

  if (roles.includes("LAB") && lineSet.has("LABORATORY")) {
    areas.add("LABORATORY");
  }
  if (roles.includes("RADIOLOGY") && lineSet.has("RADIOLOGY")) {
    areas.add("RADIOLOGY");
  }
  if (
    input.professionGroup === "TECHNICIAN" &&
    canReadFreestandingErTrackboard({
      roleCodes: roles,
      facilityType: input.facilityType,
      facilityServiceLines: input.facilityServiceLines,
      departmentCode: input.departmentCode,
    })
  ) {
    if (lineSet.has("EMERGENCY")) {
      areas.add("EMERGENCY");
    }
  }
  if (input.departmentCode === "EMERGENCY" && lineSet.has("EMERGENCY")) {
    areas.add("EMERGENCY");
  }

  return [...areas];
}

function applyFacilityServiceLineNavigationFilter(
  baseAreas: NavigationArea[],
  input: {
    professionGroup: ProfessionGroup;
    departmentCode: DepartmentCode | null;
    roleCodes: readonly string[];
    facilityType?: MedoraFacilityType | string | null;
    facilityServiceLines?: readonly string[] | null;
  }
): NavigationArea[] {
  if (input.professionGroup === "ADMIN") {
    return baseAreas;
  }

  const hasFacilityContext =
    Boolean(input.facilityType) ||
    Boolean(input.facilityServiceLines && input.facilityServiceLines.length > 0);
  if (!hasFacilityContext) {
    return baseAreas;
  }

  const serviceLines = resolveFacilityServiceLines({
    facilityType: input.facilityType,
    configuredServiceLines: input.facilityServiceLines ?? null,
  });
  const allowed = getNavigationAreasForServiceLines(serviceLines);

  let filtered = baseAreas.filter((area) => area === "DASHBOARD" || allowed.has(area));

  const supplemented = supplementAssignmentNavigationAreas(filtered, {
    professionGroup: input.professionGroup,
    departmentCode: input.departmentCode,
    roleCodes: input.roleCodes,
    facilityServiceLines: serviceLines,
    facilityType: input.facilityType,
  });
  filtered = supplemented.filter((area) => area === "DASHBOARD" || allowed.has(area));

  if (
    facilitySupportsObservationAccessForTechnician({
      facilityType: input.facilityType,
      facilityServiceLines: serviceLines,
      professionGroup: input.professionGroup,
      departmentCode: input.departmentCode,
      roleCodes: input.roleCodes,
    }) &&
    allowed.has("HOSPITAL") &&
    !filtered.includes("HOSPITAL")
  ) {
    filtered = [...filtered, "HOSPITAL"];
  }

  return filtered;
}

/**
 * Profession + department → visible navigation areas (sidebar filtering only).
 * Facility service lines further restrict areas when supplied (MEDUI.FACILITY.TYPE.1).
 */
export function resolveNavigationAreas(input: ResolveNavigationAreasInput): NavigationArea[] {
  const { professionGroup } = input;
  const department = normalizeClinicalDepartment(input.departmentCode);
  const roleCodes = input.roleCodes ?? [];

  let baseAreas: NavigationArea[];

  if (professionGroup === "ADMIN") {
    baseAreas = ALL_NAVIGATION_AREAS;
  } else if (professionGroup === "UNKNOWN") {
    baseAreas = ["DASHBOARD"];
  } else if (professionGroup === "PHARMACY") {
    baseAreas = ["DASHBOARD", "PHARMACY"];
  } else if (professionGroup === "BILLING") {
    baseAreas = ["DASHBOARD", "BILLING"];
  } else if (professionGroup === "FRONT_DESK") {
    baseAreas = ["DASHBOARD"];
  } else if (professionGroup === "PROVIDER" || professionGroup === "RN") {
    if (department === "EMERGENCY" || department == null) {
      baseAreas = ["DASHBOARD", "EMERGENCY"];
    } else if (department && HOSPITAL_DEPARTMENTS.has(department)) {
      baseAreas = ["DASHBOARD", "HOSPITAL"];
    } else if (department === "LABORATORY") {
      baseAreas = ["DASHBOARD", "LABORATORY"];
    } else if (department === "RADIOLOGY") {
      baseAreas = ["DASHBOARD", "RADIOLOGY"];
    } else {
      baseAreas = ["DASHBOARD", "EMERGENCY"];
    }
  } else if (professionGroup === "TECHNICIAN") {
    if (department === "EMERGENCY" || department == null) {
      baseAreas = ["DASHBOARD", "EMERGENCY"];
    } else if (department && HOSPITAL_DEPARTMENTS.has(department)) {
      baseAreas = ["DASHBOARD", "HOSPITAL"];
    } else if (department === "LABORATORY") {
      baseAreas = ["DASHBOARD", "LABORATORY"];
    } else if (department === "RADIOLOGY") {
      baseAreas = ["DASHBOARD", "RADIOLOGY"];
    } else {
      baseAreas = ["DASHBOARD"];
    }
  } else {
    baseAreas = ["DASHBOARD"];
  }

  return applyFacilityServiceLineNavigationFilter(baseAreas, {
    professionGroup,
    departmentCode: department,
    roleCodes,
    facilityType: input.facilityType,
    facilityServiceLines: input.facilityServiceLines,
  });
}

/** Session adapter — consumes MEDUI.AUTH.ROLE.1 resolvers (no duplicate logic). */
export function resolveNavigationProfile(input: NavigationProfileInput): {
  professionGroup: ProfessionGroup;
  departmentCode: DepartmentCode | null;
  areas: NavigationArea[];
} {
  const professionGroup = resolveProfessionGroup({ roleCodes: input.roleCodes });
  const hasExplicitDepartment =
    Boolean(String(input.departmentCode ?? "").trim()) ||
    Boolean(String(input.prismaDepartmentCode ?? "").trim());

  const departmentCode = resolveDepartmentCode({
    departmentCode: input.departmentCode,
    prismaDepartmentCode: input.prismaDepartmentCode,
    roleCodes: input.roleCodes,
    clinicalWorkspace:
      !hasExplicitDepartment && professionGroup === "TECHNICIAN"
        ? "ED"
        : professionGroup === "TECHNICIAN" &&
            (input.roleCodes.includes("LAB") || input.roleCodes.includes("RADIOLOGY")) &&
            (input.prismaDepartmentCode === "LAB" || input.prismaDepartmentCode === "RAD")
          ? "GENERAL"
          : "ED",
  });

  const areas = resolveNavigationAreas({
    professionGroup,
    departmentCode,
    roleCodes: input.roleCodes,
    facilityType: input.facilityType,
    facilityServiceLines: input.facilityServiceLines,
  });
  return { professionGroup, departmentCode, areas };
}

/** Alias for layout consumers. */
export function getVisibleNavigationAreas(input: NavigationProfileInput): NavigationArea[] {
  return resolveNavigationProfile(input).areas;
}

export const NAVIGATION_AREA_LANDING_PATH: Record<NavigationArea, string> = {
  DASHBOARD: "/app/trackboard",
  EMERGENCY: "/app/emergency/trackboard",
  HOSPITAL: "/app/hospitalisation",
  LABORATORY: "/app/lab-worklist",
  RADIOLOGY: "/app/rad-worklist",
  PHARMACY: "/app/pharmacy",
  BILLING: "/app/billing",
  ADMINISTRATION: "/app/admin",
};

const LANDING_PRIORITY: NavigationArea[] = [
  "EMERGENCY",
  "HOSPITAL",
  "LABORATORY",
  "RADIOLOGY",
  "PHARMACY",
  "BILLING",
  "ADMINISTRATION",
  "DASHBOARD",
];

/**
 * Default `/app` landing from navigation profile (MEDUI.NAV.ROLE.1).
 * Admin lands on dashboard trackboard, not the admin hub.
 */
export function getLandingRouteForNavigationProfile(input: NavigationProfileInput): string {
  const { professionGroup, areas } = resolveNavigationProfile(input);

  if (professionGroup === "ADMIN") {
    return NAVIGATION_AREA_LANDING_PATH.DASHBOARD;
  }

  for (const area of LANDING_PRIORITY) {
    if (areas.includes(area)) {
      return NAVIGATION_AREA_LANDING_PATH[area];
    }
  }

  return NAVIGATION_AREA_LANDING_PATH.DASHBOARD;
}

export function isNavigationAreaVisible(
  visibleAreas: readonly NavigationArea[],
  itemAreas: readonly NavigationArea[] | undefined
): boolean {
  if (!itemAreas || itemAreas.length === 0) {
    return true;
  }
  const visible = new Set(visibleAreas);
  return itemAreas.some((area) => visible.has(area));
}

/** Whether facility type is known for navigation filtering (testing helper). */
export function hasFacilityNavigationContext(input: NavigationProfileInput): boolean {
  return (
    Boolean(input.facilityType && normalizeFacilityType(input.facilityType)) ||
    Boolean(input.facilityServiceLines && input.facilityServiceLines.length > 0)
  );
}
