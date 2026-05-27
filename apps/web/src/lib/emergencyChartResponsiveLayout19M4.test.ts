/**
 * Phase 19M.4 — emergency chart / active workspace responsive layout (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EMERGENCY_CHART_DESKTOP_NAV_MEDIA,
  EMERGENCY_CHART_TOUCH_TARGET_MIN_PX,
  emergencyChartContentStackStyle,
  erDashboardChipRailStyle,
  erDashboardTileGridStyle,
  resolveEmergencyChartLayoutMode,
  usesErDesktopTileNav,
} from "../features/emergency/emergencyChartResponsiveLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("emergencyChartResponsiveLayout (19M.4)", () => {
  it("resolves layout modes by viewport width", () => {
    expect(resolveEmergencyChartLayoutMode(390)).toBe("mobileStacked");
    expect(resolveEmergencyChartLayoutMode(1023)).toBe("mobileStacked");
    expect(resolveEmergencyChartLayoutMode(1024)).toBe("tabletStacked");
    expect(resolveEmergencyChartLayoutMode(1279)).toBe("tabletStacked");
    expect(resolveEmergencyChartLayoutMode(1280)).toBe("desktopSplit");
  });

  it("uses desktop tile nav at >=1024px", () => {
    expect(usesErDesktopTileNav("mobileStacked")).toBe(false);
    expect(usesErDesktopTileNav("tabletStacked")).toBe(true);
    expect(usesErDesktopTileNav("desktopSplit")).toBe(true);
  });

  it("preserves 10-tile desktop grid helper for >=1024px nav", () => {
    expect(erDashboardTileGridStyle().gridTemplateColumns).toBe("repeat(10, minmax(0, 1fr))");
  });

  it("defines scroll-safe chip rail for mobile nav", () => {
    const rail = erDashboardChipRailStyle();
    expect(rail.overflowX).toBe("auto");
    expect(rail.minWidth).toBe(0);
    expect(rail.width).toBe("100%");
  });

  it("stacks chart content vertically", () => {
    const stack = emergencyChartContentStackStyle();
    expect(stack.display).toBe("flex");
    expect(stack.flexDirection).toBe("column");
    expect(stack.minWidth).toBe(0);
  });

  it("defines touch-friendly minimum target size", () => {
    expect(EMERGENCY_CHART_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
  });

  it("exports desktop nav media query", () => {
    expect(EMERGENCY_CHART_DESKTOP_NAV_MEDIA).toBe("(min-width: 1024px)");
  });
});

describe("Emergency active workspace + chart responsive wiring (19M.4)", () => {
  const activeSource = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
  const chartSource = readWebSource("src/features/emergency/EmergencyChartView.tsx");
  const navSource = readWebSource("src/features/emergency/EmergencyErWorkspaceSectionNav.tsx");

  it("active workspace uses responsive layout mode instead of inline 10-column grid", () => {
    expect(activeSource).toContain("resolveEmergencyChartLayoutMode");
    expect(activeSource).toContain("EmergencyErWorkspaceSectionNav");
    expect(activeSource).toContain('data-testid="emergency-active-workspace-content"');
    expect(activeSource).not.toContain('gridTemplateColumns: "repeat(10, minmax(0, 1fr))"');
  });

  it("mobile nav uses chip rail with aria-current and touch targets", () => {
    expect(navSource).toContain('data-testid="emergency-workspace-section-nav-mobile"');
    expect(navSource).toContain('data-testid="emergency-workspace-section-nav-desktop"');
    expect(navSource).toContain("aria-current");
    expect(navSource).toContain("erDashboardChipButtonStyle");
    expect(navSource).toContain("scrollIntoView");
  });

  it("chart view adds mobile section jump nav without removing sections", () => {
    expect(chartSource).toContain("EmergencyChartSectionJumpNav");
    expect(chartSource).toContain('data-testid="emergency-chart-content-stack"');
    expect(chartSource).toContain('aria-labelledby="section-triage"');
    expect(chartSource).toContain('aria-labelledby="section-handoff"');
  });

  it("preserves all clinical workspace sections", () => {
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
      expect(activeSource).toContain(`activeSection === "${section}"`);
    }
  });

  it("does not change save or disposition wiring", () => {
    expect(activeSource).toContain("EmergencyDispositionPanel");
    expect(activeSource).toContain("onEmbeddedEncounterUpdate");
    expect(activeSource).not.toMatch(/apiFetch\([^)]*disposition/i);
  });

  it("clinical strip cards allow full-width wrap on narrow viewports", () => {
    const stripSource = readWebSource("src/features/emergency/EmergencyWorkspaceClinicalStrip.tsx");
    expect(stripSource).toContain('maxWidth: "100%"');
    expect(stripSource).toContain('minWidth: 0');
  });
});
