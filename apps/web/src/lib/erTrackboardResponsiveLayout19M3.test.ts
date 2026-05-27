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

describe("erTrackboardResponsiveLayout (19M.3)", () => {
  it("resolves layout mode by viewport width", () => {
    expect(resolveErTrackboardLayoutMode(390)).toBe("mobileCard");
    expect(resolveErTrackboardLayoutMode(767)).toBe("mobileCard");
    expect(resolveErTrackboardLayoutMode(768)).toBe("tabletCard");
    expect(resolveErTrackboardLayoutMode(1023)).toBe("tabletCard");
    expect(resolveErTrackboardLayoutMode(1024)).toBe("desktopDense");
  });

  it("uses stacked cards below desktop breakpoint", () => {
    expect(erTrackboardUsesStackedCardLayout("mobileCard")).toBe(true);
    expect(erTrackboardUsesStackedCardLayout("tabletCard")).toBe(true);
    expect(erTrackboardUsesStackedCardLayout("desktopDense")).toBe(false);
  });

  it("uses two-column safe grid on tablet", () => {
    const style = erTrackboardPatientListStyle("tabletCard");
    expect(style.display).toBe("grid");
    expect(style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("uses single-column list on mobile", () => {
    const style = erTrackboardPatientListStyle("mobileCard");
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
    expect(trackboardSource).toContain("emergencyChartPath");
    expect(trackboardSource).toContain("emergencyActiveWorkspacePath");
  });

  it("applies touch-safe controls on mobile/tablet", () => {
    expect(trackboardSource).toContain("erTrackboardTouchControlStyle");
    expect(trackboardSource).toContain("ER_TRACKBOARD_TOUCH_TARGET_MIN_PX");
  });

  it("stacks compact patient card without fixed min-width on mobile path", () => {
    expect(compactRowSource).toContain('data-testid="medora-compact-patient-card-stacked"');
    expect(compactRowSource).toContain("stackedLayout");
    expect(compactRowSource).toMatch(/minWidth: 0[\s\S]*medora-compact-patient-card-stacked/);
  });

  it("preserves desktop dense row path by default", () => {
    expect(compactRowSource).toContain('flex: "1 1 220px"');
    expect(compactRowSource).toContain("stackedLayout = false");
  });

  it("does not change fetch or assignment logic", () => {
    expect(trackboardSource).toContain("fetchOpenEncounters");
    expect(trackboardSource).toContain("assignProviderSelf");
    expect(trackboardSource).toContain("assignNurseSelf");
    expect(trackboardSource).toContain("acuityFromEsi");
    expect(trackboardSource).toContain("erDispositionBadgeFromEncounterJson");
  });

  it("uses i18n labels for status and filters (French-safe)", () => {
    expect(trackboardSource).toContain('t("emergencyTrackboard.searchLabel")');
    expect(trackboardSource).toContain("erDispositionBadgeDisplayLabel");
    expect(trackboardSource).toContain("tEncounterStatus");
  });
});
