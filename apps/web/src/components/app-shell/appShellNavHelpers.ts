import type { GroupedSidebarSection } from "./sidebarNavConfig";
import {
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MIN,
  resolveClinicalViewportMode,
  type ClinicalViewportMode,
} from "@/lib/clinicalViewport";

/** Desktop persistent expanded sidebar (>=1200px). */
export const APP_SHELL_DESKTOP_NAV_MEDIA = `(min-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN}px)`;

/** Tablet collapsed icon sidebar (768–1199px). */
export const APP_SHELL_TABLET_NAV_MEDIA = `(min-width: ${CLINICAL_VIEWPORT_TABLET_MIN}px) and (max-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN - 0.02}px)`;

/** Compact drawer navigation (<768px). */
export const APP_SHELL_COMPACT_NAV_MEDIA = `(max-width: ${CLINICAL_VIEWPORT_TABLET_MIN - 0.02}px)`;

export function resolveAppShellNavLayout(width: number): ClinicalViewportMode {
  return resolveClinicalViewportMode(width);
}

export function appShellUsesPersistentSidebar(mode: ClinicalViewportMode): boolean {
  return mode === "tablet" || mode === "desktop";
}

export function appShellUsesMobileDrawer(mode: ClinicalViewportMode): boolean {
  return mode === "compact";
}

export function appShellForceSidebarCollapsed(mode: ClinicalViewportMode): boolean {
  return mode === "tablet";
}

export function isSidebarNavItemActive(pathname: string, href: string, mounted: boolean): boolean {
  if (!mounted) return false;
  return pathname === href || (href !== "/app" && pathname.startsWith(`${href}/`));
}

export function resolveActiveNavLabel(
  pathname: string,
  groupedNavSections: readonly GroupedSidebarSection[],
  t: (key: string) => string,
  mounted: boolean
): string | null {
  if (!mounted) return null;
  for (const section of groupedNavSections) {
    for (const item of section.items) {
      if (isSidebarNavItemActive(pathname, item.href, mounted)) {
        return t(item.label);
      }
    }
  }
  return null;
}
