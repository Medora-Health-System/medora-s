/**
 * Phase MEDUI.2 — enterprise clinical navigation & touch workflow (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLINICAL_BOTTOM_RAIL_SAFE_PADDING_PX,
  clinicalSafeScrollPaddingStyle,
} from "@/lib/clinicalTouchNavigation";
import { CLINICAL_MIN_TOUCH_TARGET_PX } from "@/lib/clinicalViewport";
import { emergencyChartUsesBottomRail } from "@/features/emergency/emergencyChartTouchNavigationMode";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

const ER_CORE_SECTION_IDS = [
  "triage",
  "providerMse",
  "orders",
  "mar",
  "results",
  "diagnostics",
  "nursing",
  "notes",
  "disposition",
  "visitSummary",
] as const;

describe("MEDUI.2 ED workspace touch rail", () => {
  const active = () => readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
  const bottomRail = () => readWebSource("src/features/emergency/EmergencyErWorkspaceBottomRail.tsx");
  const sectionNav = () => readWebSource("src/features/emergency/EmergencyErWorkspaceSectionNav.tsx");

  it("imports clinical touch navigation helpers", () => {
    expect(active()).toContain("clinicalSafeScrollPaddingStyle");
    expect(active()).toContain("EmergencyErWorkspaceBottomRail");
    expect(active()).toContain("emergencyChartUsesBottomRail");
    expect(readWebSource("src/lib/clinicalTouchNavigation.ts")).toContain("resolveClinicalTouchNavigationMode");
  });

  it("bottom rail includes all core ED section IDs", () => {
    const src = bottomRail();
    for (const id of ER_CORE_SECTION_IDS) {
      expect(active()).toContain(`id: "${id}"`);
    }
    expect(src).toContain('data-testid="emergency-workspace-bottom-rail"');
    expect(src).toContain("aria-current");
    expect(src).toContain("aria-label={tile.ariaLabel}");
  });

  it("applies scroll padding when bottom rail is visible", () => {
    const src = active();
    expect(src).toContain("clinicalSafeScrollPaddingStyle");
    expect(src).toContain("usesBottomRail");
    const padding = clinicalSafeScrollPaddingStyle(true);
    expect(padding.scrollPaddingBottom).toBe(CLINICAL_BOTTOM_RAIL_SAFE_PADDING_PX);
  });

  it("hides inline chip rail when bottom rail is active", () => {
    expect(sectionNav()).toContain("emergencyChartUsesBottomRail");
    expect(sectionNav()).toContain("if (bottomRailNav)");
  });

  it("preserves desktop dashboard nav", () => {
    expect(sectionNav()).toContain('data-testid="emergency-workspace-section-nav-desktop"');
    expect(emergencyChartUsesBottomRail("desktopSplit")).toBe(false);
    expect(emergencyChartUsesBottomRail("tabletFocused")).toBe(true);
  });

  it("sticky patient header and touch action bar remain", () => {
    const src = active();
    expect(src).toContain("emergencyChartPatientSummaryShellStyle");
    expect(src).toContain("clinicalStickyActionBarStyle");
    expect(src).toContain("BillingClassificationBadgeInteractive");
  });
});

describe("MEDUI.2 trackboard touch workflow", () => {
  it("uses touch action grouping on trackboard cards", () => {
    const layout = readWebSource("src/features/emergency/erTrackboardResponsiveLayout.ts");
    const view = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(layout).toContain("erTrackboardTouchActionGroupStyle");
    expect(view).toContain("erTrackboardTouchActionGroupStyle");
    expect(view).toContain("BillingClassificationBadgeInteractive");
    expect(view).toContain("erTrackboardTouchControlStyle");
  });
});

describe("MEDUI.2 observation touch workflow", () => {
  it("uses touch action grouping on observation board cards", () => {
    const layout = readWebSource("src/features/hospitalization/observationBoardResponsiveLayout.ts");
    const view = readWebSource("src/features/hospitalization/HospitalizationBoardView.tsx");
    expect(layout).toContain("observationBoardTouchActionGroupStyle");
    expect(view).toContain("observationBoardTouchActionGroupStyle");
    expect(view).toContain("observationBoardTouchControlStyle");
  });
});

describe("MEDUI.2 regression safety", () => {
  it("does not create tablet-only routes", () => {
    const routes = readWebSource("src/components/app-shell/sidebarNavConfig.ts");
    expect(routes).not.toMatch(/\/tablet/i);
  });

  it("does not change save/autosave identifiers in active workspace", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain("onEmbeddedEncounterUpdate");
    expect(active).not.toContain("autosaveTablet");
    expect(active).not.toMatch(/localStorage\.setItem\([^)]*draft/i);
  });

  it("preserves ED section tab state wiring", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain("[activeSection, setActiveSection]");
    expect(active).not.toContain("setActiveSectionTablet");
  });

  it("does not touch API or backend files in MEDUI.2 web diff scope", () => {
    const touchNav = readWebSource("src/lib/clinicalTouchNavigation.ts");
    const bottomRail = readWebSource("src/features/emergency/EmergencyErWorkspaceBottomRail.tsx");
    expect(touchNav).not.toContain("apps/api");
    expect(bottomRail).not.toContain("prisma");
  });

  it("uses minimum 44px touch targets in touch navigation", () => {
    expect(CLINICAL_MIN_TOUCH_TARGET_PX).toBeGreaterThanOrEqual(44);
    expect(readWebSource("src/lib/clinicalTouchNavigation.ts")).toContain("CLINICAL_MIN_TOUCH_TARGET_PX");
  });

  it("does not add fixed overlay on desktop workspace shell", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain('layoutMode !== "desktopSplit"');
    expect(readWebSource("src/features/emergency/EmergencyErWorkspaceBottomRail.tsx")).toContain(
      'if (!usesBottomClinicalRail(touchNavMode)) return null'
    );
  });
});
