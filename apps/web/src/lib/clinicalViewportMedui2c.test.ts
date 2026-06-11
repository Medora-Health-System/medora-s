/**
 * Phase MEDUI.2C — Orders/MAR tablet compact density + login locale boundary (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLINICAL_MIN_TOUCH_TARGET_PX,
  CLINICAL_VIEWPORT_DESKTOP_MIN,
} from "@/lib/clinicalViewport";
import {
  clinicalTabletCompactPanelPadding,
  clinicalTabletCompactRowGapPx,
  clinicalTabletUsesCompactPanel,
  resolveClinicalTabletPanelDensityMode,
} from "@/lib/clinicalTabletPanelDensity";
import {
  DIAGNOSIS_ORDERS_TOUCH_TARGET_MIN_PX,
  diagnosisOrdersDomainSummaryTileStyle,
  diagnosisOrdersListStyle,
  diagnosisOrdersOrderCardShellStyle,
  diagnosisOrdersUsesTabletCompactDensity,
  resolveDiagnosisOrdersLayoutMode,
} from "@/features/emergency/diagnosisOrdersResponsiveLayout";
import { clinicalSafeScrollPaddingStyle } from "@/lib/clinicalTouchNavigation";
import { defaultLanguage } from "@/i18n/config";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("MEDUI.2C clinical tablet panel density", () => {
  it("activates compact density on tablet widths only", () => {
    expect(resolveClinicalTabletPanelDensityMode(767)).toBe("default");
    expect(resolveClinicalTabletPanelDensityMode(768)).toBe("compact");
    expect(resolveClinicalTabletPanelDensityMode(1024)).toBe("compact");
    expect(resolveClinicalTabletPanelDensityMode(CLINICAL_VIEWPORT_DESKTOP_MIN)).toBe("default");
    expect(clinicalTabletUsesCompactPanel("compact")).toBe(true);
  });

  it("defines compact panel padding and row gap tokens", () => {
    expect(clinicalTabletCompactPanelPadding).toContain("8px");
    expect(clinicalTabletCompactRowGapPx).toBeGreaterThanOrEqual(6);
    expect(clinicalTabletCompactRowGapPx).toBeLessThanOrEqual(8);
  });
});

describe("MEDUI.2C Orders tablet compact mode", () => {
  it("uses tablet card layout through MEDUI desktop breakpoint", () => {
    expect(resolveDiagnosisOrdersLayoutMode(1024)).toBe("tabletCard");
    expect(resolveDiagnosisOrdersLayoutMode(1199)).toBe("tabletCard");
    expect(resolveDiagnosisOrdersLayoutMode(CLINICAL_VIEWPORT_DESKTOP_MIN)).toBe("desktopDense");
  });

  it("uses compact spacing on tablet card mode", () => {
    expect(diagnosisOrdersUsesTabletCompactDensity("tabletCard")).toBe(true);
    expect(diagnosisOrdersUsesTabletCompactDensity("mobileCard")).toBe(false);
    expect(diagnosisOrdersUsesTabletCompactDensity("desktopDense")).toBe(false);
    const list = diagnosisOrdersListStyle("tabletCard");
    expect(list.gap).toBe(clinicalTabletCompactRowGapPx);
    const card = diagnosisOrdersOrderCardShellStyle("tabletCard");
    expect(card.padding).toBe(clinicalTabletCompactPanelPadding);
    const tile = diagnosisOrdersDomainSummaryTileStyle("tabletCard");
    expect(tile.minHeight).toBeLessThan(72);
  });

  it("keeps order category buttons at least 44px on tablet/mobile", () => {
    expect(DIAGNOSIS_ORDERS_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(CLINICAL_MIN_TOUCH_TARGET_PX);
    const orders = readWebSource("src/features/emergency/EmergencyErOrdersPanel.tsx");
    expect(orders).toContain("erOrdersTouchButtonStyle");
    expect(orders).toContain("diagnosisOrdersQuickActionGridStyle");
  });

  it("preserves desktop dense orders table at >=1200px", () => {
    expect(resolveDiagnosisOrdersLayoutMode(1280)).toBe("desktopDense");
    const orders = readWebSource("src/features/emergency/EmergencyErOrdersPanel.tsx");
    expect(orders).toContain("diagnosisOrdersTableStyle(layoutMode, 720)");
  });

  it("preserves phone card layout below 768px", () => {
    expect(resolveDiagnosisOrdersLayoutMode(390)).toBe("mobileCard");
    const card = diagnosisOrdersOrderCardShellStyle("mobileCard");
    expect(card.padding).toBe("10px 12px");
  });
});

describe("MEDUI.2C MAR tablet compact mode", () => {
  it("wires tablet panel density in MAR tab", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("resolveClinicalTabletPanelDensityMode");
    expect(mar).toContain("clinicalTabletUsesCompactPanel");
    expect(mar).toContain("marAdministerMinHeight");
    expect(mar).toContain("marTableMetricCellStyle");
  });

  it("keeps administer control touch-safe on tablet", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("CLINICAL_MIN_TOUCH_TARGET_PX");
    expect(mar).toContain('t("marTab.administer")');
  });

  it("gates legacy administration history behind MAR_TAB_SHOW_LEGACY_SECTIONS", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("MAR_TAB_SHOW_LEGACY_SECTIONS");
    expect(mar).toContain('t("marTab.historyTitle")');
    expect(mar).toContain("clinicalTabletCompactHistoryItemStyle");
  });

  it("does not alter MAR modal recording logic", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("openModal(row");
    expect(mar).toContain("modalAction");
    expect(mar).toContain("administeredAt:");
    expect(mar).not.toContain("marCompactModal");
  });
});

describe("MEDUI.2C bottom rail scroll safety", () => {
  it("preserves bottom rail safe padding in active workspace", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain("clinicalSafeScrollPaddingStyle");
    const pad = clinicalSafeScrollPaddingStyle(true);
    expect(pad.paddingBottom).toBeGreaterThanOrEqual(88);
  });
});

describe("MEDUI.2C login locale boundary", () => {
  it("defaults login locale resolver to English without preference", () => {
    expect(defaultLanguage).toBe("en");
    expect(resolveClientUiLanguage({})).toBe("en");
  });

  it("uses shared locale resolver in provider and readStoredUiLanguage", () => {
    const provider = readWebSource("src/i18n/provider.tsx");
    const stored = readWebSource("src/i18n/readStoredUiLanguage.ts");
    expect(provider).toContain("resolveClientUiLanguage");
    expect(stored).toContain("resolveClientUiLanguage");
  });

  it("exposes login language toggle without hardcoded French labels", () => {
    const login = readWebSource("app/login/page.tsx");
    expect(login).toContain('t("auth.login.languageLabel")');
    expect(login).toContain('setLanguage("en")');
    expect(login).toContain('setLanguage("fr")');
    expect(login).not.toMatch(/>\s*Connexion\s*</);
    expect(login).not.toMatch(/>\s*Sign in\s*</);
  });

  it("persists cached facility UI language from authenticated provider", () => {
    const provider = readWebSource("src/i18n/provider.tsx");
    expect(provider).toContain("persistFacilityUiLanguage");
  });
});

describe("MEDUI.2C safety guards", () => {
  it("does not change order lifecycle or MAR API strings", () => {
    const orders = readWebSource("src/features/emergency/EmergencyErOrdersPanel.tsx");
    expect(orders).toContain("runOrderItemLifecycleAction");
    expect(orders).not.toMatch(/fetchOrdersTablet/i);
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("apiFetch(");
    expect(mar).not.toMatch(/marTablet/i);
  });
});
