/**
 * Phase 19M.3 — ED trackboard responsive layout (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
  erTrackboardPatientListStyle,
  erTrackboardUsesStackedCardLayout,
  resolveErTrackboardLayoutMode,
} from "../features/emergency/erTrackboardResponsiveLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("erTrackboardResponsiveLayout (19M.3 + MEDUI.2B)", () => {
  it("resolves layout mode by viewport width", () => {
    expect(resolveErTrackboardLayoutMode(390)).toBe("compactStacked");
    expect(resolveErTrackboardLayoutMode(767)).toBe("compactStacked");
    expect(resolveErTrackboardLayoutMode(768)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1023)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1199)).toBe("tabletCompactBoard");
    expect(resolveErTrackboardLayoutMode(1200)).toBe("desktopDense");
  });

  it("uses stacked cards only on compact phone", () => {
    expect(erTrackboardUsesStackedCardLayout("compactStacked")).toBe(true);
    expect(erTrackboardUsesStackedCardLayout("tabletCompactBoard")).toBe(false);
    expect(erTrackboardUsesStackedCardLayout("desktopDense")).toBe(false);
  });

  it("uses single-column compact list on tablet", () => {
    const style = erTrackboardPatientListStyle("tabletCompactBoard");
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
    expect(style.gridTemplateColumns).toBeUndefined();
  });

  it("uses single-column list on compact", () => {
    const style = erTrackboardPatientListStyle("compactStacked");
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
  });

  it("defines touch-friendly minimum target size", () => {
    expect(ER_TRACKBOARD_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
  });
});

describe("EmergencyTrackboardView responsive wiring (19M.3)", () => {
  const trackboardSource = readWebSource("src/features/emergency/EmergencyTrackboardView.tsx");
  const compactRowSource = readWebSource("src/components/medora-card/MedoraCompactPatientCardRow.tsx");

  it("uses responsive layout mode hook", () => {
    expect(trackboardSource).toContain("resolveErTrackboardLayoutMode");
    expect(trackboardSource).toContain('data-testid="emergency-trackboard-layout"');
    expect(trackboardSource).toContain('data-testid="emergency-trackboard-filters"');
    expect(trackboardSource).toContain("stackedLayout={stackedCardLayout}");
  });

  it("preserves critical patient card fields", () => {
    expect(trackboardSource).toContain("fullPatientName");
    expect(trackboardSource).toContain("formatPatientAgeSexLine");
    expect(trackboardSource).toContain("roomValue={room}");
    expect(trackboardSource).toContain("esiDisplayChar");
    expect(trackboardSource).toContain("primaryStatusLabel");
    expect(trackboardSource).toContain("arrivalDisplay");
    expect(trackboardSource).toContain("resolveEdBoardPatientNameHref");
    expect(trackboardSource).toContain("emergencyActiveWorkspacePath");
  });

  it("applies touch-safe controls on mobile/tablet", () => {
    expect(trackboardSource).toContain("erTrackboardTouchControlStyle");
    expect(trackboardSource).toContain("ER_TRACKBOARD_TOUCH_TARGET_MIN_PX");
  });

  it("stacks compact patient card without fixed min-width on mobile path", () => {
    expect(compactRowSource).toContain('data-testid="medora-compact-patient-card-stacked"');
  });
});
