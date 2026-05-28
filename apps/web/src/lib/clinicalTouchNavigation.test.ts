import { describe, expect, it } from "vitest";
import {
  CLINICAL_BOTTOM_RAIL_HEIGHT_PX,
  CLINICAL_BOTTOM_RAIL_SAFE_PADDING_PX,
  clinicalBottomRailButtonStyle,
  clinicalBottomRailStyle,
  clinicalSafeScrollPaddingStyle,
  clinicalTouchActionGroupStyle,
  resolveClinicalTouchNavigationMode,
  shouldUseBottomClinicalRail,
  usesBottomClinicalRail,
} from "./clinicalTouchNavigation";
import { CLINICAL_MIN_TOUCH_TARGET_PX } from "./clinicalViewport";

describe("clinicalTouchNavigation", () => {
  it("resolves compact, tablet, and desktop touch navigation modes", () => {
    expect(resolveClinicalTouchNavigationMode(390)).toBe("compactBottomRail");
    expect(resolveClinicalTouchNavigationMode(767)).toBe("compactBottomRail");
    expect(resolveClinicalTouchNavigationMode(768)).toBe("tabletBottomRail");
    expect(resolveClinicalTouchNavigationMode(1199)).toBe("tabletBottomRail");
    expect(resolveClinicalTouchNavigationMode(1200)).toBe("desktopInline");
  });

  it("enables bottom rail on tablet and compact only", () => {
    expect(shouldUseBottomClinicalRail(900)).toBe(true);
    expect(shouldUseBottomClinicalRail(390)).toBe(true);
    expect(shouldUseBottomClinicalRail(1280)).toBe(false);
    expect(usesBottomClinicalRail("tabletBottomRail")).toBe(true);
    expect(usesBottomClinicalRail("compactBottomRail")).toBe(true);
    expect(usesBottomClinicalRail("desktopInline")).toBe(false);
  });

  it("defines bottom rail styles with horizontal scroll and touch targets", () => {
    const rail = clinicalBottomRailStyle("tabletBottomRail");
    expect(rail.position).toBe("fixed");
    expect(rail.overflowX).toBe("auto");
    expect(rail.minHeight).toBe(CLINICAL_BOTTOM_RAIL_HEIGHT_PX);
    const button = clinicalBottomRailButtonStyle(true, false);
    expect(button.minHeight).toBeGreaterThanOrEqual(CLINICAL_MIN_TOUCH_TARGET_PX);
  });

  it("hides bottom rail style on desktop inline mode", () => {
    expect(clinicalBottomRailStyle("desktopInline").display).toBe("none");
  });

  it("adds scroll padding when bottom rail is visible", () => {
    const padded = clinicalSafeScrollPaddingStyle(true);
    expect(padded.paddingBottom).toBe(CLINICAL_BOTTOM_RAIL_SAFE_PADDING_PX);
    expect(padded.scrollPaddingBottom).toBe(CLINICAL_BOTTOM_RAIL_SAFE_PADDING_PX);
    expect(clinicalSafeScrollPaddingStyle(false)).toEqual({});
  });

  it("groups touch actions in a grid on tablet paths", () => {
    const grouped = clinicalTouchActionGroupStyle(true);
    expect(grouped.display).toBe("grid");
    const desktop = clinicalTouchActionGroupStyle(false);
    expect(desktop.display).toBe("flex");
  });
});
