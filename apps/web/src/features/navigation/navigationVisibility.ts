import {
  canReadFreestandingErObservationPatients,
  getVisibleNavigationAreas,
  isNavigationAreaVisible,
  type NavigationArea,
  type NavigationProfileInput,
} from "@medora/shared";
import type { SidebarNavItem } from "@/components/app-shell/sidebarNavConfig";

export type { NavigationArea, NavigationProfileInput };

export const OBSERVATION_BOARD_HREF = "/app/hospitalisation";

export function buildNavigationProfileFromSession(input: {
  roleCodes: readonly string[];
  departmentCode?: string | null;
  prismaDepartmentCode?: string | null;
  facilityType?: string | null;
  facilityServiceLines?: readonly string[] | null;
}): NavigationProfileInput {
  return {
    roleCodes: input.roleCodes,
    departmentCode: input.departmentCode ?? null,
    prismaDepartmentCode: input.prismaDepartmentCode ?? null,
    facilityType: input.facilityType ?? null,
    facilityServiceLines: input.facilityServiceLines ?? null,
  };
}

/** MEDUI.NAV.ROLE.1 — filter sidebar entries by profession + department areas (routes unchanged). */
export function filterSidebarNavItemsByNavigationAreas(
  items: SidebarNavItem[],
  profile: NavigationProfileInput
): SidebarNavItem[] {
  const visibleAreas = getVisibleNavigationAreas(profile);
  return items
    .filter((item) => isNavigationAreaVisible(visibleAreas, item.navAreas))
    .map((item) => applyObservationBoardNavLabel(item, profile));
}

/** Freestanding ER lab/rad technicians see "Observation" instead of hospitalisation label. */
export function applyObservationBoardNavLabel(
  item: SidebarNavItem,
  profile: NavigationProfileInput
): SidebarNavItem {
  if (item.href !== OBSERVATION_BOARD_HREF) {
    return item;
  }
  if (
    canReadFreestandingErObservationPatients({
      roleCodes: profile.roleCodes,
      facilityType: profile.facilityType,
      facilityServiceLines: profile.facilityServiceLines,
      departmentCode: profile.departmentCode ?? profile.prismaDepartmentCode ?? null,
    })
  ) {
    return { ...item, label: "nav.observation" };
  }
  return item;
}

/**
 * Mirrors `app/app/layout.tsx` role + navigation-area filtering for tests.
 * MEDUI.OBS.TECH.1 — ensures LAB/RAD technicians see observation board when eligible.
 */
export function filterSidebarNavItemsForSession(
  items: SidebarNavItem[],
  input: {
    roleCodes: readonly string[];
    profile: NavigationProfileInput;
  }
): SidebarNavItem[] {
  const roleSet = new Set(input.roleCodes.map((code) => code.trim().toUpperCase()));
  const roleFiltered = items.filter((item) => item.roles.some((role) => roleSet.has(role)));
  return filterSidebarNavItemsByNavigationAreas(roleFiltered, input.profile);
}

/** Ensures shared navigation resolver is wired (import guard for tests). */
export function navigationVisibilityUsesSharedResolver(): boolean {
  return typeof getVisibleNavigationAreas === "function";
}
