/**
 * Phase MEDUI.2B — ED trackboard tablet compact board density (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ER_TRACKBOARD_TABLET_COMPACT_CARD_PADDING,
  ER_TRACKBOARD_TABLET_COMPACT_LIST_GAP_PX,
  ER_TRACKBOARD_TABLET_READABLE_CARD_PADDING_PX,
  ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
  erTrackboardCardInnerStyle,
  erTrackboardPatientListStyle,
  erTrackboardTouchActionGroupStyle,
  erTrackboardUsesStackedCardLayout,
  resolveErTrackboardLayoutMode,
} from "@/features/emergency/erTrackboardResponsiveLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("MEDUI.2B ED trackboard tablet compact board", () => {
  it("uses tabletCompactBoard mode between 768 and 1199", () => {
    expect(resolveErTrackboardLayoutMode(767)).toBe("compactStacked");
    expect(resolveErTrackboardLayoutMode(768)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1024)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1199)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1200)).toBe("desktopDense");
  });

  it("uses smaller card padding than expanded tablet readable reference", () => {
    const inner = erTrackboardCardInnerStyle("tabletCompactBoard");
    expect(inner.padding).toBe(ER_TRACKBOARD_TABLET_COMPACT_CARD_PADDING);
    expect(ER_TRACKBOARD_TABLET_COMPACT_CARD_PADDING).toContain("10px");
    expect(ER_TRACKBOARD_TABLET_READABLE_CARD_PADDING_PX).toBe(16);
    expect(inner.gap).toBeLessThanOrEqual(8);
  });

  it("keeps action buttons at least 44px on tablet compact board", () => {
    expect(ER_TRACKBOARD_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("erTrackboardTouchControlStyle");
    expect(trackboard).toContain("ER_TRACKBOARD_TOUCH_TARGET_MIN_PX");
  });

  it("groups Chart / Nurse actions in a touch row on tablet compact board", () => {
    const actions = erTrackboardTouchActionGroupStyle("tabletCompactBoard");
    expect(actions.display).toBe("flex");
    expect(actions.flexDirection).toBe("row");
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveEdBoardPatientNameHref");
    expect(trackboard).toContain("resolveEdBoardPatientNameHref");
    expect(trackboard).toContain("assignNurseMeShort");
    expect(trackboard).toContain("erTrackboardTouchActionGroupStyle");
  });

  it("preserves billing classification badge on trackboard cards", () => {
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("BillingClassificationBadgeInteractive");
    expect(trackboard).toContain("erTrackboardPrimaryBadgeRowStyle");
  });

  it("leaves desktopDense unchanged at >=1200px", () => {
    expect(resolveErTrackboardLayoutMode(1200)).toBe("desktopDense");
    expect(resolveErTrackboardLayoutMode(1440)).toBe("desktopDense");
    expect(erTrackboardUsesStackedCardLayout("desktopDense")).toBe(false);
    const desktopList = erTrackboardPatientListStyle("desktopDense");
    expect(desktopList.gap).toBe(6);
    const desktopActions = erTrackboardTouchActionGroupStyle("desktopDense");
    expect(desktopActions.display).toBe("flex");
  });

  it("preserves compact phone stacked layout below 768px", () => {
    expect(resolveErTrackboardLayoutMode(390)).toBe("compactStacked");
    expect(erTrackboardUsesStackedCardLayout("compactStacked")).toBe(true);
    expect(erTrackboardUsesStackedCardLayout("tabletCompactBoard")).toBe(false);
    const phoneList = erTrackboardPatientListStyle("compactStacked");
    expect(phoneList.flexDirection).toBe("column");
  });

  it("uses horizontal card row on tablet compact board (not stacked sections)", () => {
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("stackedLayout={stackedCardLayout}");
    expect(trackboard).toContain("erTrackboardUsesStackedCardLayout");
  });

  it("does not touch clinical API fetch strings", () => {
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("fetchOpenEncounters");
    expect(trackboard).not.toMatch(/fetchOpenEncountersTablet/i);
    expect(trackboard).not.toMatch(/apiFetch\([^)]*tablet/i);
  });

  it("does not change billing conversion code paths", () => {
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).not.toContain("convertEncounterBilling");
    expect(trackboard).not.toContain("billingClassificationConvert");
    const billingBadge = readWebSource("src/components/encounters/BillingClassificationBadgeInteractive.tsx");
    expect(billingBadge).toContain("billingClassification");
  });

  it("does not remove clinical patient card fields", () => {
    const trackboard = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("fullPatientName");
    expect(trackboard).toContain("roomValue={room}");
    expect(trackboard).toContain("primaryStatusLabel");
    expect(trackboard).toContain("opsChips");
    expect(trackboard).toContain("emergencyChartPath");
    expect(trackboard).toContain("emergencyActiveWorkspacePath");
  });

  it("uses compact list gap on tablet compact board", () => {
    const list = erTrackboardPatientListStyle("tabletCompactBoard");
    expect(list.gap).toBe(ER_TRACKBOARD_TABLET_COMPACT_LIST_GAP_PX);
    expect(ER_TRACKBOARD_TABLET_COMPACT_LIST_GAP_PX).toBeGreaterThanOrEqual(6);
    expect(ER_TRACKBOARD_TABLET_COMPACT_LIST_GAP_PX).toBeLessThanOrEqual(8);
  });
});
