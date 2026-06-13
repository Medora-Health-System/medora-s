import type { DepartmentCode } from "./departmentResolver.js";
import { isClinicalDepartmentCode, resolveDepartmentCode } from "./departmentResolver.js";
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
};

export type NavigationProfileInput = {
  roleCodes: readonly string[];
  departmentCode?: string | null;
  prismaDepartmentCode?: string | null;
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

/**
 * Profession + department → visible navigation areas (sidebar filtering only).
 */
export function resolveNavigationAreas(input: ResolveNavigationAreasInput): NavigationArea[] {
  const { professionGroup } = input;
  const department = normalizeClinicalDepartment(input.departmentCode);

  if (professionGroup === "ADMIN") {
    return ALL_NAVIGATION_AREAS;
  }
  if (professionGroup === "UNKNOWN") {
    return ["DASHBOARD"];
  }
  if (professionGroup === "PHARMACY") {
    return ["DASHBOARD", "PHARMACY"];
  }
  if (professionGroup === "BILLING") {
    return ["DASHBOARD", "BILLING"];
  }
  if (professionGroup === "FRONT_DESK") {
    return ["DASHBOARD"];
  }

  if (professionGroup === "PROVIDER" || professionGroup === "RN") {
    if (department === "EMERGENCY" || department == null) {
      return ["DASHBOARD", "EMERGENCY"];
    }
    if (department && HOSPITAL_DEPARTMENTS.has(department)) {
      return ["DASHBOARD", "HOSPITAL"];
    }
    if (department === "LABORATORY") {
      return ["DASHBOARD", "LABORATORY"];
    }
    if (department === "RADIOLOGY") {
      return ["DASHBOARD", "RADIOLOGY"];
    }
    return ["DASHBOARD", "EMERGENCY"];
  }

  if (professionGroup === "TECHNICIAN") {
    if (department === "EMERGENCY" || department == null) {
      return ["DASHBOARD", "EMERGENCY"];
    }
    if (department && HOSPITAL_DEPARTMENTS.has(department)) {
      return ["DASHBOARD", "HOSPITAL"];
    }
    if (department === "LABORATORY") {
      return ["DASHBOARD", "LABORATORY"];
    }
    if (department === "RADIOLOGY") {
      return ["DASHBOARD", "RADIOLOGY"];
    }
    return ["DASHBOARD"];
  }

  return ["DASHBOARD"];
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

  const areas = resolveNavigationAreas({ professionGroup, departmentCode });
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
