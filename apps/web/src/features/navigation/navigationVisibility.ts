import {
  filterHrefListForFreestandingErRnProviderSidebar,
  isNavigationAreaVisible,
  resolveCapabilityAwareNavigationAreas,
  type NavigationArea,
  type NavigationProfileInput,
} from "@medora/shared";
import type { SidebarNavItem } from "@/components/app-shell/sidebarNavConfig";

export type { NavigationArea, NavigationProfileInput };

/** Canonical Hospital Care landing (module identity — not role-aliased). */
export const HOSPITAL_CARE_NAV_HREF = "/app/hospitalisation";

/** @deprecated Use HOSPITAL_CARE_NAV_HREF — kept for test imports during D3CA closure. */
export const OBSERVATION_BOARD_HREF = HOSPITAL_CARE_NAV_HREF;

export type CapabilityNavigationProfileInput = NavigationProfileInput & {
  careProfileJson?: unknown;
  facilityCountry?: string | null;
};

export function buildNavigationProfileFromSession(input: {
  roleCodes: readonly string[];
  departmentCode?: string | null;
  prismaDepartmentCode?: string | null;
  facilityType?: string | null;
  facilityServiceLines?: readonly string[] | null;
  careProfileJson?: unknown;
  facilityCountry?: string | null;
}): CapabilityNavigationProfileInput {
  return {
    roleCodes: input.roleCodes,
    departmentCode: input.departmentCode ?? null,
    prismaDepartmentCode: input.prismaDepartmentCode ?? null,
    facilityType: input.facilityType ?? null,
    facilityServiceLines: input.facilityServiceLines ?? null,
    careProfileJson: input.careProfileJson,
    facilityCountry: input.facilityCountry ?? null,
  };
}

/**
 * MEDUI.D4C.2A — filter sidebar by facility capabilities ∩ role areas.
 * Uses `resolveFacilityNavigation` (via capability resolver); Admin cannot restore absent care settings.
 */
export function filterSidebarNavItemsByNavigationAreas(
  items: SidebarNavItem[],
  profile: CapabilityNavigationProfileInput
): SidebarNavItem[] {
  const visibleAreas = resolveCapabilityAwareNavigationAreas(profile);
  const areaFiltered = items.filter((item) =>
    isNavigationAreaVisible(visibleAreas, item.navAreas)
  );
  return filterHrefListForFreestandingErRnProviderSidebar(areaFiltered, {
    roleCodes: profile.roleCodes,
    facilityType: profile.facilityType,
    facilityServiceLines: profile.facilityServiceLines,
  });
}

/**
 * Mirrors `app/app/layout.tsx` role + navigation-area filtering for tests.
 * D3CA.CLOSURE — Hospital Care label is always `nav.hospitalisation` (no Observation alias).
 */
export function filterSidebarNavItemsForSession(
  items: SidebarNavItem[],
  input: {
    roleCodes: readonly string[];
    profile: CapabilityNavigationProfileInput;
  }
): SidebarNavItem[] {
  const roleSet = new Set(input.roleCodes.map((code) => code.trim().toUpperCase()));
  const roleFiltered = items.filter((item) => item.roles.some((role) => roleSet.has(role)));
  return filterSidebarNavItemsByNavigationAreas(roleFiltered, input.profile);
}

/** Ensures shared capability navigation resolver is wired (import guard for tests). */
export function navigationVisibilityUsesSharedResolver(): boolean {
  return typeof resolveCapabilityAwareNavigationAreas === "function";
}
