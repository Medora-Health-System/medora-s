import { describe, expect, it } from "vitest";
import {
  CLINICAL_MIN_TOUCH_TARGET_PX,
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MAX,
  CLINICAL_VIEWPORT_TABLET_MIN,
  clinicalTabletCardGridStyle,
  clinicalTouchTargetStyle,
  clinicalVitalsGridStyle,
  isClinicalTablet,
  isTouchOptimized,
  resolveClinicalViewportMode,
  resolveClinicalVitalsDisplayMode,
  resolveClinicalWorkspaceDensity,
  shouldCollapseSidebar,
  shouldUseFocusedWorkspace,
  shouldUseReadableVitals,
} from "./clinicalViewport";

describe("clinicalViewport", () => {
  it("resolves compact, tablet, and desktop modes", () => {
    expect(resolveClinicalViewportMode(390)).toBe("compact");
    expect(resolveClinicalViewportMode(767)).toBe("compact");
    expect(resolveClinicalViewportMode(CLINICAL_VIEWPORT_TABLET_MIN)).toBe("tablet");
    expect(resolveClinicalViewportMode(1024)).toBe("tablet");
    expect(resolveClinicalViewportMode(CLINICAL_VIEWPORT_TABLET_MAX)).toBe("tablet");
    expect(resolveClinicalViewportMode(CLINICAL_VIEWPORT_DESKTOP_MIN)).toBe("desktop");
    expect(resolveClinicalViewportMode(1440)).toBe("desktop");
  });

  it("resolves workspace density from viewport width", () => {
    expect(resolveClinicalWorkspaceDensity(390)).toBe("compactStacked");
    expect(resolveClinicalWorkspaceDensity(900)).toBe("tabletReadable");
    expect(resolveClinicalWorkspaceDensity(1280)).toBe("desktopDense");
  });

  it("exposes touch and sidebar helpers", () => {
    expect(isTouchOptimized("compact")).toBe(true);
    expect(isTouchOptimized("tablet")).toBe(true);
    expect(isTouchOptimized("desktop")).toBe(false);
    expect(isClinicalTablet("tablet")).toBe(true);
    expect(shouldCollapseSidebar("tablet")).toBe(true);
    expect(shouldCollapseSidebar("desktop")).toBe(false);
    expect(shouldUseFocusedWorkspace("tablet")).toBe(true);
    expect(shouldUseReadableVitals("tablet")).toBe(true);
  });

  it("defines minimum touch target size", () => {
    expect(CLINICAL_MIN_TOUCH_TARGET_PX).toBeGreaterThanOrEqual(44);
    expect(clinicalTouchTargetStyle().minHeight).toBe(CLINICAL_MIN_TOUCH_TARGET_PX);
  });

  it("uses single-column card grid helper for tablet readability", () => {
    const grid = clinicalTabletCardGridStyle();
    expect(grid.display).toBe("flex");
    expect(grid.flexDirection).toBe("column");
  });

  it("uses readable 2-column vitals grid on tablet", () => {
    const tablet = clinicalVitalsGridStyle("tabletReadable");
    expect(tablet.display).toBe("grid");
    expect(tablet.gridTemplateColumns).toBe("1fr 1fr");
    const compactDense = clinicalVitalsGridStyle("tabletCompactDense");
    expect(compactDense.gridTemplateColumns).toBe("1fr 1fr");
    const compact = clinicalVitalsGridStyle("compactStack");
    expect(compact.flexDirection).toBe("column");
  });

  it("resolves vitals display mode from viewport width", () => {
    expect(resolveClinicalVitalsDisplayMode(390)).toBe("compactStack");
    expect(resolveClinicalVitalsDisplayMode(900)).toBe("tabletReadable");
    expect(resolveClinicalVitalsDisplayMode(1280)).toBe("desktopDense");
  });
});
