import type { GroupedSidebarSection } from "./sidebarNavConfig";

/** Desktop persistent sidebar breakpoint (Tailwind `lg`). */
export const APP_SHELL_DESKTOP_NAV_MEDIA = "(min-width: 1024px)";

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
