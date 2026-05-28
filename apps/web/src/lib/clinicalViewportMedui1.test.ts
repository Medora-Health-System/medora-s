/**
 * Phase MEDUI.1 — clinical responsive workspace & tablet optimization (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  APP_SHELL_COMPACT_NAV_MEDIA,
  APP_SHELL_DESKTOP_NAV_MEDIA,
  APP_SHELL_TABLET_NAV_MEDIA,
  appShellForceSidebarCollapsed,
  appShellUsesMobileDrawer,
  appShellUsesPersistentSidebar,
  resolveAppShellNavLayout,
} from "@/components/app-shell/appShellNavHelpers";
import {
  CLINICAL_MIN_TOUCH_TARGET_PX,
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  clinicalReadableText,
  clinicalVitalsGridStyle,
  resolveClinicalViewportMode,
  shouldCollapseSidebar,
  shouldUseFocusedWorkspace,
} from "@/lib/clinicalViewport";
import {
  ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
  erTrackboardPatientListStyle,
  erTrackboardUsesStackedCardLayout,
  resolveErTrackboardLayoutMode,
} from "@/features/emergency/erTrackboardResponsiveLayout";
import {
  emergencyChartPatientSummaryShellStyle,
  emergencyChartUsesStickyPatientHeader,
  emergencyChartVitalsDisplayMode,
  erDashboardChipButtonStyle,
  resolveEmergencyChartLayoutMode,
  usesErDesktopTileNav,
  usesErFocusedWorkspace,
} from "@/features/emergency/emergencyChartResponsiveLayout";
import {
  observationBoardPatientListStyle,
  observationBoardSnapshotGridStyle,
  observationBoardTouchControlStyle,
  resolveObservationBoardLayoutMode,
} from "@/features/hospitalization/observationBoardResponsiveLayout";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("MEDUI.1 clinical viewport system", () => {
  it("resolves compact, tablet, and desktop breakpoints", () => {
    expect(resolveClinicalViewportMode(390)).toBe("compact");
    expect(resolveClinicalViewportMode(767)).toBe("compact");
    expect(resolveClinicalViewportMode(768)).toBe("tablet");
    expect(resolveClinicalViewportMode(1199)).toBe("tablet");
    expect(resolveClinicalViewportMode(CLINICAL_VIEWPORT_DESKTOP_MIN)).toBe("desktop");
  });

  it("exposes focused workspace and readable vitals flags for tablet", () => {
    expect(shouldUseFocusedWorkspace("tablet")).toBe(true);
    expect(shouldCollapseSidebar("tablet")).toBe(true);
    expect(clinicalReadableText.fontSize).toBeGreaterThanOrEqual(15);
  });
});

describe("MEDUI.1 app shell tablet navigation", () => {
  const appShell = () => readWebSource("src/components/app-shell/AppShell.tsx");
  const helpers = () => readWebSource("src/components/app-shell/appShellNavHelpers.ts");

  it("defines compact, tablet, and desktop nav media queries", () => {
    expect(APP_SHELL_DESKTOP_NAV_MEDIA).toContain(String(CLINICAL_VIEWPORT_DESKTOP_MIN));
    expect(APP_SHELL_TABLET_NAV_MEDIA).toContain("768");
    expect(APP_SHELL_COMPACT_NAV_MEDIA).toContain("767");
    expect(helpers()).toContain("resolveAppShellNavLayout");
  });

  it("tablet mode does not force full-width permanent expanded sidebar", () => {
    expect(appShellForceSidebarCollapsed("tablet")).toBe(true);
    expect(appShellUsesPersistentSidebar("tablet")).toBe(true);
    expect(appShellUsesMobileDrawer("tablet")).toBe(false);
    const src = appShell();
    expect(src).toContain("forceSidebarCollapsed");
    expect(src).toContain("sidebarCollapsedEffective");
    expect(src).toContain('data-nav-viewport-mode={navViewportMode}');
  });

  it("desktop sidebar preserved at desktop breakpoint", () => {
    expect(resolveAppShellNavLayout(1280)).toBe("desktop");
    expect(appShellUsesPersistentSidebar("desktop")).toBe(true);
    expect(appShellForceSidebarCollapsed("desktop")).toBe(false);
    const src = appShell();
    expect(src).toContain('data-testid="app-shell-desktop-sidebar"');
    expect(src).toContain("SIDEBAR_WIDTH_EXPANDED");
  });

  it("compact layout preserves mobile drawer", () => {
    expect(resolveAppShellNavLayout(390)).toBe("compact");
    expect(appShellUsesMobileDrawer("compact")).toBe(true);
    const src = appShell();
    expect(src).toContain('data-testid="app-shell-mobile-menu-button"');
    expect(src).toContain('data-testid="app-shell-mobile-nav-drawer"');
    expect(src).toContain("mobileDrawerNav && mobileNavOpen");
  });
});

describe("MEDUI.1 ED trackboard tablet readability", () => {
  it("uses tabletCompactBoard single-column layout between 768 and 1199 (MEDUI.2B)", () => {
    expect(resolveErTrackboardLayoutMode(768)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1024)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1199)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1200)).toBe("desktopDense");
    const style = erTrackboardPatientListStyle("tabletCompactBoard");
    expect(style.flexDirection).toBe("column");
    expect(style.gridTemplateColumns).toBeUndefined();
  });

  it("keeps touch-sized controls on tablet and compact", () => {
    expect(ER_TRACKBOARD_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(CLINICAL_MIN_TOUCH_TARGET_PX);
    expect(erTrackboardUsesStackedCardLayout("tabletCompactBoard")).toBe(false);
    expect(erTrackboardUsesStackedCardLayout("compactStacked")).toBe(true);
    expect(erTrackboardUsesStackedCardLayout("desktopDense")).toBe(false);
  });

  it("preserves billing classification badge on trackboard cards", () => {
    const src = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(src).toContain("BillingClassificationBadgeInteractive");
    expect(src).toContain("resolveErTrackboardLayoutMode");
  });
});

describe("MEDUI.1 ED active workspace focused tablet mode", () => {
  it("uses tabletFocused layout between 768 and 1199", () => {
    expect(resolveEmergencyChartLayoutMode(768)).toBe("tabletFocused");
    expect(resolveEmergencyChartLayoutMode(1024)).toBe("tabletFocused");
    expect(resolveEmergencyChartLayoutMode(1199)).toBe("tabletFocused");
    expect(resolveEmergencyChartLayoutMode(1200)).toBe("desktopSplit");
    expect(usesErFocusedWorkspace("tabletFocused")).toBe(true);
    expect(usesErDesktopTileNav("tabletFocused")).toBe(false);
    expect(usesErDesktopTileNav("desktopSplit")).toBe(true);
  });

  it("uses sticky patient header and readable vitals on tablet", () => {
    expect(emergencyChartUsesStickyPatientHeader("tabletFocused")).toBe(true);
    expect(emergencyChartPatientSummaryShellStyle("tabletFocused").position).toBe("sticky");
    expect(emergencyChartVitalsDisplayMode("tabletFocused")).toBe("tabletReadable");
    const chip = erDashboardChipButtonStyle(true, false, "tabletFocused");
    expect(chip.minHeight).toBeGreaterThanOrEqual(44);
    expect(chip.fontSize).toBeGreaterThanOrEqual(15);
  });

  it("dashboard pills use scroll-safe chip rail on tablet/mobile", () => {
    const nav = readWebSource("src/features/emergency/EmergencyErWorkspaceSectionNav.tsx");
    expect(nav).toContain("erDashboardChipRailStyle");
    expect(nav).toContain('data-testid="emergency-workspace-section-nav-mobile"');
    expect(nav).toContain("erDashboardChipButtonStyle(selected, q.disabled, layoutMode)");
  });

  it("preserves all clinical workspace sections and billing badge", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    for (const section of [
      "visitSummary",
      "diagnostics",
      "triage",
      "results",
      "mar",
      "orders",
      "notes",
      "nursing",
      "providerMse",
      "disposition",
    ]) {
      expect(active).toContain(`activeSection === "${section}"`);
    }
    expect(active).toContain("BillingClassificationBadgeInteractive");
    expect(active).toContain("clinicalPatientSummaryStackStyle");
  });
});

describe("MEDUI.1 vitals readability", () => {
  it("defines readable tablet 2-column vitals grid without tiny fixed width", () => {
    const grid = clinicalVitalsGridStyle("tabletReadable");
    expect(grid.display).toBe("grid");
    expect(grid.gridTemplateColumns).toBe("1fr 1fr");
    const strip = readWebSource("src/features/emergency/EmergencyWorkspaceClinicalStrip.tsx");
    expect(strip).toContain("clinicalVitalsGridStyle");
    expect(strip).toContain("clinicalVitalsValueStyle");
    expect(strip).not.toContain("minWidth: 520");
  });
});

describe("MEDUI.1 observation board tablet optimization", () => {
  it("uses 2-column operational snapshot grid on tablet", () => {
    const grid = observationBoardSnapshotGridStyle("tabletReadable");
    expect(grid.display).toBe("grid");
    expect(grid.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("uses readable full-width patient cards and touch actions", () => {
    expect(resolveObservationBoardLayoutMode(900)).toBe("tabletReadable");
    const list = observationBoardPatientListStyle("tabletReadable");
    expect(list.flexDirection).toBe("column");
    const board = readWebSource("src/features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("stackedLayout={stackedCardLayout}");
    expect(board).toContain("observationBoardTouchControlStyle");
    const touched = observationBoardTouchControlStyle({ padding: "4px 8px" }, "tabletReadable");
    expect(touched.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe("MEDUI.1 safety / regression guards", () => {
  it("does not create duplicate tablet routes", () => {
    const appRoutes = readWebSource("app/app/layout.tsx");
    expect(appRoutes).not.toMatch(/\/tablet/i);
    for (const item of SIDEBAR_NAV_ITEMS) {
      expect(item.href).not.toMatch(/tablet/i);
    }
  });

  it("does not change clinical API fetch strings in touched workspace files", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain("apiFetch(");
    expect(active).not.toMatch(/apiFetch\([^)]*tablet/i);
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("fetchOpenEncounters");
    expect(trackboard).not.toMatch(/fetchOpenEncountersTablet/i);
  });

  it("does not touch save/autosave code paths in active workspace", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain("onEmbeddedEncounterUpdate");
    expect(active).not.toContain("autosaveTablet");
    expect(active).not.toMatch(/localStorage\.setItem\([^)]*draft/i);
  });

  it("preserves desktop dense layouts at >=1200px", () => {
    expect(resolveErTrackboardLayoutMode(1280)).toBe("desktopDense");
    expect(resolveEmergencyChartLayoutMode(1280)).toBe("desktopSplit");
    expect(resolveObservationBoardLayoutMode(1280)).toBe("desktopDense");
    expect(resolveClinicalViewportMode(1280)).toBe("desktop");
  });

  it("preserves compact stacked layouts below 768px", () => {
    expect(resolveErTrackboardLayoutMode(390)).toBe("compactStacked");
    expect(resolveEmergencyChartLayoutMode(390)).toBe("mobileStacked");
    expect(resolveObservationBoardLayoutMode(390)).toBe("compactStacked");
    expect(resolveAppShellNavLayout(390)).toBe("compact");
  });
});
