import {
  getVisibleNavigationAreas,
  isNavigationAreaVisible,
  type NavigationArea,
  type NavigationProfileInput,
} from "@medora/shared";
import type { SidebarNavItem } from "@/components/app-shell/sidebarNavConfig";

export type { NavigationArea, NavigationProfileInput };

export function buildNavigationProfileFromSession(input: {
  roleCodes: readonly string[];
  departmentCode?: string | null;
  prismaDepartmentCode?: string | null;
}): NavigationProfileInput {
  return {
    roleCodes: input.roleCodes,
    departmentCode: input.departmentCode ?? null,
    prismaDepartmentCode: input.prismaDepartmentCode ?? null,
  };
}

/** MEDUI.NAV.ROLE.1 — filter sidebar entries by profession + department areas (routes unchanged). */
export function filterSidebarNavItemsByNavigationAreas(
  items: SidebarNavItem[],
  profile: NavigationProfileInput
): SidebarNavItem[] {
  const visibleAreas = getVisibleNavigationAreas(profile);
  return items.filter((item) => isNavigationAreaVisible(visibleAreas, item.navAreas));
}

/** Ensures shared navigation resolver is wired (import guard for tests). */
export function navigationVisibilityUsesSharedResolver(): boolean {
  return typeof getVisibleNavigationAreas === "function";
}
