/**
 * Phase 19M.8 — cross-device responsive regression rollup (source-level).
 * Consolidates anchors across 19M.2–19M.7; no Playwright/DOM automation.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_SHELL_DESKTOP_NAV_MEDIA } from "@/components/app-shell/appShellNavHelpers";
import { ANCILLARY_TOUCH_TARGET_MIN_PX } from "@/features/ancillary/ancillaryResponsiveLayout";
import { ED_DISPOSITION_TOUCH_TARGET_MIN_PX } from "@/features/emergency/edDispositionResponsiveLayout";
import { ER_TRACKBOARD_TOUCH_TARGET_MIN_PX } from "@/features/emergency/erTrackboardResponsiveLayout";
import { PROVIDER_DOCUMENTATION_TOUCH_TARGET_MIN_PX } from "@/lib/providerDocumentationWorkspaceLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("19M.8 cross-device QA documentation", () => {
  it("cross-device QA checklist document exists", () => {
    const doc = readFileSync(join(webRoot, "../../docs/ui/cross-device-qa-checklist-19M8.md"), "utf8");
    expect(doc).toContain("Phase 19M.8");
    expect(doc).toContain("19M.1");
    expect(doc).toContain("19M.7");
    expect(doc).toContain("Remaining Known Gaps");
    expect(doc).toContain("Recommended Production Device Policy");
  });
});

describe("19M.8 — no permanent mobile sidebar", () => {
  const appShell = () => readWebSource("src/components/app-shell/AppShell.tsx");

  it("desktop sidebar is conditional on desktop layout breakpoint", () => {
    const src = appShell();
    expect(readWebSource("src/components/app-shell/appShellNavHelpers.ts")).toContain("APP_SHELL_DESKTOP_NAV_MEDIA");
    expect(src).toContain("navViewportMode");
    expect(src).toContain('data-testid="app-shell-desktop-sidebar"');
    expect(src).toContain('data-testid="app-shell-mobile-menu-button"');
    expect(src).toContain('data-testid="app-shell-mobile-nav-drawer"');
    expect(APP_SHELL_DESKTOP_NAV_MEDIA).toContain("1200");
  });

  it("main content uses full width path when not desktop nav", () => {
    const src = appShell();
    expect(src).toContain('data-testid="app-shell-main-content"');
    expect(src).toContain("persistentSidebar ? (");
    expect(src).toContain("mobileDrawerNav && mobileNavOpen");
  });
});

describe("19M.8 — responsive helpers wired on critical surfaces", () => {
  it("provider documentation uses responsive layout helper", () => {
    const src = readWebSource("src/components/encounters/ProviderDocumentationWorkspace.tsx");
    expect(src).toContain("resolveProviderDocumentationLayoutMode");
    expect(src).toContain("providerDocumentationWorkspaceLayoutStyle");
    expect(src).toContain('data-testid="provider-documentation-workspace-layout"');
  });

  it("emergency chart uses responsive layout helper", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    const chart = readWebSource("src/features/emergency/EmergencyChartView.tsx");
    expect(active).toContain("resolveEmergencyChartLayoutMode");
    expect(active).toContain("EmergencyErWorkspaceSectionNav");
    expect(chart).toContain("resolveEmergencyChartLayoutMode");
    expect(chart).toContain("EmergencyChartSectionJumpNav");
  });

  it("disposition uses responsive layout helper", () => {
    const src = readWebSource("src/features/emergency/EmergencyDispositionPanel.tsx");
    expect(src).toContain("resolveEdDispositionLayoutMode");
    expect(src).toContain("EdDispositionPreviewPanel");
    expect(src).toContain('data-testid="ed-disposition-workspace-layout"');
  });

  it("trackboard uses responsive layout helper", () => {
    const src = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(src).toContain("resolveErTrackboardLayoutMode");
    expect(src).toContain('data-testid="emergency-trackboard-layout"');
    expect(src).toContain("stackedLayout={stackedCardLayout}");
  });

  it("ancillary worklists use responsive layout helper", () => {
    expect(readWebSource("app/app/pharmacy-worklist/page.tsx")).toContain("resolveAncillaryLayoutMode");
    expect(readWebSource("app/app/lab-worklist/page.tsx")).toContain("resolveAncillaryLayoutMode");
    expect(readWebSource("app/app/rad-worklist/page.tsx")).toContain("resolveAncillaryLayoutMode");
  });
});

describe("19M.8 — anti-regression patterns (must not return)", () => {
  it("does not reintroduce fixed 10-column mobile nav in active workspace", () => {
    const src = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(src).not.toContain('gridTemplateColumns: "repeat(10, minmax(0, 1fr))"');
    expect(src).toContain("EmergencyErWorkspaceSectionNav");
  });

  it("does not reintroduce fixed 13-column pharmacy table on worklist", () => {
    const src = readWebSource("app/app/pharmacy-worklist/page.tsx");
    expect(src).not.toContain("<table");
    expect(src).toContain("MedoraCard");
  });

  it("does not force provider documentation fixed two-column grid at all widths", () => {
    const src = readWebSource("src/components/encounters/ProviderDocumentationWorkspace.tsx");
    expect(src).not.toMatch(
      /display: "grid", gridTemplateColumns: "minmax\(0, 1fr\) minmax\(260px, 320px\)"/
    );
  });

  it("does not force disposition wideLayout 960px breakpoint", () => {
    const src = readWebSource("src/features/emergency/EmergencyDispositionPanel.tsx");
    expect(src).not.toContain("wideLayout");
    expect(src).not.toContain('matchMedia("(min-width: 960px)")');
  });
});

describe("19M.8 — touch target helpers remain defined", () => {
  it("exports minimum 44px touch targets from phase helpers", () => {
    expect(ER_TRACKBOARD_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
    expect(PROVIDER_DOCUMENTATION_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
    expect(ED_DISPOSITION_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
    expect(ANCILLARY_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
  });

  it("critical surfaces reference touch-friendly styling", () => {
    expect(readWebSource("src/features/emergency/EmergencyTrackboardView.tsx")).toContain(
      "erTrackboardTouchControlStyle"
    );
    expect(readWebSource("src/components/encounters/ProviderDocumentationWorkspace.tsx")).toContain(
      "providerDocumentationTouchFriendlyButtonStyle"
    );
    expect(readWebSource("src/features/emergency/EmergencyDispositionPanel.tsx")).toContain(
      "edDispositionTouchButtonStyle"
    );
    expect(readWebSource("app/app/pharmacy-worklist/page.tsx")).toContain("ancillaryTouchControlStyle");
  });
});

describe("19M.8 — prior phase test files remain present", () => {
  const phaseTests = [
    "mobileTabletResponsivenessAudit19M1.test.ts",
    "AppShellMobileNav19M2.test.ts",
    "erTrackboardResponsiveLayout19M3.test.ts",
    "emergencyChartResponsiveLayout19M4.test.ts",
    "providerDocumentationWorkspaceLayout19M5.test.ts",
    "edDispositionResponsiveLayout19M6.test.ts",
    "ancillaryResponsiveLayout19M7.test.ts",
  ];

  for (const file of phaseTests) {
    it(`19M phase test file still present: ${file}`, () => {
      expect(readWebSource(`src/lib/${file}`)).toContain("19M");
    });
  }
});

describe("19M.8 — EN/FR mobile navigation labels preserved", () => {
  it("app shell mobile i18n keys exist in en and fr", () => {
    const en = readWebSource("src/i18n/messages/en.ts");
    const fr = readWebSource("src/i18n/messages/fr.ts");
    for (const key of [
      "mobileMenuOpen",
      "mobileMenuClose",
      "mobileMenuBackdrop",
      "mobileNavDrawerLabel",
    ]) {
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
  });

  it("provider documentation mobile summary i18n preserved", () => {
    const en = readWebSource("src/i18n/messages/en.ts");
    const fr = readWebSource("src/i18n/messages/fr.ts");
    expect(en).toContain("mobileSummaryPanel");
    expect(fr).toContain("mobileSummaryPanel");
  });
});

describe("19M.8 — order lifecycle handlers unchanged on worklists (layout-only guard)", () => {
  it("pharmacy worklist retains acknowledge/start/complete API paths", () => {
    const src = readWebSource("app/app/pharmacy-worklist/page.tsx");
    expect(src).toContain("/orders/items/${itemId}/acknowledge");
    expect(src).toContain("/orders/items/${itemId}/start");
    expect(src).toContain("/orders/items/${itemId}/complete");
    expect(src).toContain("/pharmacy/dispenses/record-order");
  });

  it("lab worklist retains workflow handlers", () => {
    const src = readWebSource("app/app/lab-worklist/page.tsx");
    expect(src).toContain("handleAcknowledge");
    expect(src).toContain("worklistItemNeedsAcknowledge");
    expect(src).toContain("isLabTechActor");
  });
});
