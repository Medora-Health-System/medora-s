/**
 * Phase MEDUI.2D — ED trackboard horizontal census density (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ER_TRACKBOARD_CENSUS_ACTION_MIN_PX,
  ER_TRACKBOARD_CENSUS_CARD_TARGET_MAX_HEIGHT_PX,
  ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
  erTrackboardCensusActionButtonStyle,
  erTrackboardIdentityLineStyle,
  erTrackboardIdentityTitleStyle,
  erTrackboardPatientListStyle,
  erTrackboardUsesCompactCensus,
  erTrackboardUsesStackedCardLayout,
  resolveErTrackboardLayoutMode,
} from "@/features/emergency/erTrackboardResponsiveLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("MEDUI.2D tablet trackboard horizontal census", () => {
  it("uses the horizontal census (non-stacked) layout on tablet", () => {
    expect(resolveErTrackboardLayoutMode(768)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1199)).toBe("tabletCompactBoard");
    expect(erTrackboardUsesCompactCensus("tabletCompactBoard")).toBe(true);
    expect(erTrackboardUsesStackedCardLayout("tabletCompactBoard")).toBe(false);
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("erTrackboardUsesCompactCensus");
    expect(trackboard).toContain("stackedLayout={stackedCardLayout}");
  });

  it("reduces card vertical footprint via compact identity typography", () => {
    const title = erTrackboardIdentityTitleStyle("tabletCompactBoard");
    expect(title.lineHeight).toBeLessThan(1.2);
    const line = erTrackboardIdentityLineStyle("tabletCompactBoard", { fontSize: 12 });
    expect(line.margin).toBe("1px 0 0 0");
    const desktopLine = erTrackboardIdentityLineStyle("desktopDense", { fontSize: 12 });
    expect(desktopLine.margin).toBe("2px 0 0 0");
  });

  it("compacts status pills only on tablet census mode", () => {
    const badge = readWebSource("src/components/medora-card/MedoraCardBadge.tsx");
    expect(badge).toContain("compact");
    expect(badge).toContain('compact ? "2px 8px" : "4px 10px"');
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("compact={usesCompactCensus}");
  });

  it("keeps action buttons touch-safe (>=40px) on tablet census", () => {
    expect(ER_TRACKBOARD_CENSUS_ACTION_MIN_PX).toBeGreaterThanOrEqual(40);
    const action = erTrackboardCensusActionButtonStyle({ padding: "4px 10px" }, "tabletCompactBoard");
    expect(action.minHeight).toBe(ER_TRACKBOARD_CENSUS_ACTION_MIN_PX);
    expect(action.paddingTop).toBe(0);
    expect(action.paddingBottom).toBe(0);
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("erTrackboardCensusActionButtonStyle");
  });

  it("documents a compressed card height target", () => {
    expect(ER_TRACKBOARD_CENSUS_CARD_TARGET_MAX_HEIGHT_PX).toBeLessThanOrEqual(160);
  });

  it("avoids horizontal overflow with min-width safe list and card", () => {
    const list = erTrackboardPatientListStyle("tabletCompactBoard");
    expect(list.minWidth).toBe(0);
    expect(list.flexDirection).toBe("column");
  });

  it("keeps phone census action at the full 44px touch target", () => {
    const phoneAction = erTrackboardCensusActionButtonStyle({ padding: "4px 10px" }, "compactStacked");
    expect(phoneAction.minHeight).toBe(ER_TRACKBOARD_TOUCH_TARGET_MIN_PX);
  });

  it("leaves desktop action style untouched", () => {
    const desktopAction = erTrackboardCensusActionButtonStyle({ padding: "4px 10px" }, "desktopDense");
    expect(desktopAction.minHeight).toBeUndefined();
    expect(desktopAction.padding).toBe("4px 10px");
  });

  it("preserves desktop dense trackboard layout at >=1200px", () => {
    expect(resolveErTrackboardLayoutMode(1280)).toBe("desktopDense");
    expect(erTrackboardUsesCompactCensus("desktopDense")).toBe(false);
    const desktopList = erTrackboardPatientListStyle("desktopDense");
    expect(desktopList.gap).toBe(6);
  });

  it("preserves compact phone trackboard layout below 768px", () => {
    expect(resolveErTrackboardLayoutMode(390)).toBe("compactStacked");
    expect(erTrackboardUsesCompactCensus("compactStacked")).toBe(false);
    expect(erTrackboardUsesStackedCardLayout("compactStacked")).toBe(true);
  });

  it("keeps LOS, room, provider/nurse, and critical status indicators visible", () => {
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("losShort");
    expect(trackboard).toContain("roomValue={room}");
    expect(trackboard).toContain("physicianShort");
    expect(trackboard).toContain("nurseShort");
    expect(trackboard).toContain("primaryStatusLabel");
    expect(trackboard).toContain("acuityLabelKey(acuity)");
    expect(trackboard).toContain("opsChips");
    expect(trackboard).toContain("BillingClassificationBadgeInteractive");
  });

  it("does not change card actions or routing", () => {
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("emergencyChartPath");
    expect(trackboard).toContain("emergencyActiveWorkspacePath");
    expect(trackboard).toContain("claimSelf(encounter.id, \"provider\")");
    expect(trackboard).toContain("claimSelf(encounter.id, \"nurse\")");
    expect(trackboard).not.toMatch(/fetchOpenEncountersTablet/i);
  });
});
