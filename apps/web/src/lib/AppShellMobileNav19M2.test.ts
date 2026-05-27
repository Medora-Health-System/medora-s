/**
 * Phase 19M.2 — app shell mobile navigation (source-level regression anchors).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  APP_SHELL_DESKTOP_NAV_MEDIA,
  isSidebarNavItemActive,
  resolveActiveNavLabel,
} from "@/components/app-shell/appShellNavHelpers";
import { groupSidebarNavItems, SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

const mockT = (key: string) => key;

describe("19M.2 app shell mobile navigation", () => {
  const appShellSource = () => readWebSource("src/components/app-shell/AppShell.tsx");
  const sidebarNavSource = () => readWebSource("src/components/app-shell/AppShellSidebarNav.tsx");

  it("mobile header menu button exists with accessibility hooks", () => {
    const src = appShellSource();
    expect(src).toContain('data-testid="app-shell-mobile-menu-button"');
    expect(src).toContain("aria-expanded={mobileNavOpen}");
    expect(src).toContain("aria-controls={MOBILE_DRAWER_ID}");
    expect(src).toContain("min-h-[44px]");
    expect(src).toContain('t("appShell.mobileMenuOpen")');
  });

  it("desktop sidebar still renders at desktop layout breakpoint", () => {
    const src = appShellSource();
    expect(src).toContain("APP_SHELL_DESKTOP_NAV_MEDIA");
    expect(readWebSource("src/components/app-shell/appShellNavHelpers.ts")).toContain(APP_SHELL_DESKTOP_NAV_MEDIA);
    expect(src).toContain('data-testid="app-shell-desktop-sidebar"');
    expect(src).toContain("desktopNavLayout ? (");
    expect(src).toContain("SIDEBAR_WIDTH_EXPANDED");
  });

  it("mobile drawer is closed by default and opens via menu button state", () => {
    const src = appShellSource();
    expect(src).toContain("[mobileNavOpen, setMobileNavOpen]");
    expect(src).toContain("useState(false)");
    expect(src).toContain("setMobileNavOpen((open) => !open)");
    expect(src).toContain("!desktopNavLayout && mobileNavOpen");
  });

  it("backdrop closes the mobile drawer", () => {
    const src = appShellSource();
    expect(src).toContain('data-testid="app-shell-mobile-nav-backdrop"');
    expect(src).toContain("onClick={closeMobileNav}");
    expect(src).toContain('t("appShell.mobileMenuBackdrop")');
  });

  it("escape key closes the mobile drawer", () => {
    const src = appShellSource();
    expect(src).toContain('if (event.key === "Escape") setMobileNavOpen(false)');
  });

  it("nav link click closes the mobile drawer", () => {
    const src = appShellSource();
    expect(src).toContain("onNavLinkClick={closeMobileNav}");
    const navSrc = sidebarNavSource();
    expect(navSrc).toContain("onClick={onNavLinkClick}");
  });

  it("drawer uses shared sidebar navigation items", () => {
    const src = appShellSource();
    expect(src).toContain("AppShellSidebarNav");
    expect(src).toContain("groupedNavSections={groupedNavSections}");
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain('t("appShell.mobileNavDrawerLabel")');
  });

  it("main content uses responsive padding and full width without permanent mobile sidebar", () => {
    const src = appShellSource();
    expect(src).toContain('data-testid="app-shell-main-content"');
    expect(src).toContain("px-3 py-3 md:px-5 md:py-5 lg:p-6");
    expect(src).toContain("desktopNavLayout ? (");
    expect(src).toContain(") : null}");
  });

  it("resolveActiveNavLabel picks the current section title from filtered nav items", () => {
    const sections = groupSidebarNavItems(SIDEBAR_NAV_ITEMS);
    expect(
      resolveActiveNavLabel("/app/emergency/trackboard", sections, mockT, true)
    ).toBe("nav.emergency");
    expect(isSidebarNavItemActive("/app/emergency/trackboard/123", "/app/emergency/trackboard", true)).toBe(
      true
    );
  });

  it("i18n keys exist for mobile navigation chrome", () => {
    const en = readWebSource("src/i18n/messages/en.ts");
    const fr = readWebSource("src/i18n/messages/fr.ts");
    for (const key of [
      "mobileMenuOpen",
      "mobileMenuClose",
      "mobileMenuBackdrop",
      "mobileNavDrawerLabel",
      "primaryNavigation",
    ]) {
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
  });

  it("layout still passes groupedNavSections into AppShell (no RBAC nav regression in shell)", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain("groupSidebarNavItems(navItems)");
    expect(layout).toContain("groupedNavSections={groupedNavSections}");
  });

  it("resolves 19M.1 C1 app shell blocker with mobile drawer pattern", () => {
    const src = appShellSource();
    expect(src).toContain("APP_SHELL_DESKTOP_NAV_MEDIA");
    expect(src).toContain('data-testid="app-shell-mobile-nav-drawer"');
    expect(src).not.toMatch(/mobileMenuOpen.*false.*permanent sidebar/i);
  });
});

describe("19M.1 mobile audit anchors after 19M.2", () => {
  it("AppShell now implements mobile drawer (C1 resolved)", () => {
    const src = readWebSource("src/components/app-shell/AppShell.tsx");
    expect(src).toContain('data-testid="app-shell-mobile-menu-button"');
    expect(src).toContain('data-testid="app-shell-mobile-nav-drawer"');
    expect(src).toContain("APP_SHELL_DESKTOP_NAV_MEDIA");
  });
});
