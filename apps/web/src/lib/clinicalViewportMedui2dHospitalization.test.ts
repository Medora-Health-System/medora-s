/**
 * Phase MEDUI.2D extension — hospitalization / observation tablet census density (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  OBSERVATION_BOARD_CENSUS_ACTION_MIN_PX,
  OBSERVATION_BOARD_CENSUS_CARD_TARGET_MAX_HEIGHT_PX,
  OBSERVATION_BOARD_TOUCH_TARGET_MIN_PX,
  observationBoardCardInnerStyle,
  observationBoardCensusActionButtonStyle,
  observationBoardIdentityLineStyle,
  observationBoardPatientListStyle,
  observationBoardSnapshotGridStyle,
  observationBoardStatChipShellStyle,
  observationBoardUsesCompactCensus,
  observationBoardUsesStackedCards,
  resolveObservationBoardLayoutMode,
} from "@/features/hospitalization/observationBoardResponsiveLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("MEDUI.2D hospitalization / observation tablet census", () => {
  it("uses tabletCompactBoard horizontal census mode between 768 and 1199", () => {
    expect(resolveObservationBoardLayoutMode(768)).toBe("tabletCompactBoard");
    expect(resolveObservationBoardLayoutMode(1199)).toBe("tabletCompactBoard");
    expect(observationBoardUsesCompactCensus("tabletCompactBoard")).toBe(true);
    expect(observationBoardUsesStackedCards("tabletCompactBoard")).toBe(false);
  });

  it("uses compact card inner padding and list gap on tablet", () => {
    const inner = observationBoardCardInnerStyle("tabletCompactBoard");
    expect(inner.padding).toContain("10px");
    expect(inner.gap).toBeLessThanOrEqual(8);
    const list = observationBoardPatientListStyle("tabletCompactBoard");
    expect(list.gap).toBeLessThanOrEqual(8);
    expect(list.minWidth).toBe(0);
  });

  it("activates compact operational snapshot grid on tablet", () => {
    const grid = observationBoardSnapshotGridStyle("tabletCompactBoard");
    expect(grid.display).toBe("grid");
    expect(grid.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(grid.gap).toBeLessThanOrEqual(6);
    const chip = observationBoardStatChipShellStyle("tabletCompactBoard");
    expect(chip.padding).toContain("4px");
  });

  it("clusters status pills inline on tablet census cards", () => {
    const board = readWebSource("src/features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("observationBoardPrimaryBadgeRowStyle");
    expect(board).toContain("usesCompactCensus");
    expect(board).toMatch(/usesCompactCensus\s*\?/);
    expect(board).toContain("ObservationDispositionBoardChips encounter={encounter} t={t} compact");
    expect(board).toContain("ObservationOpsChips");
    expect(board).toContain("ObservationEscalationHintBadges");
    expect(board).toContain("ObservationDispositionBoardChips");
  });

  it("keeps census actions touch-safe on tablet (>=40px)", () => {
    expect(OBSERVATION_BOARD_CENSUS_ACTION_MIN_PX).toBeGreaterThanOrEqual(40);
    const action = observationBoardCensusActionButtonStyle({ padding: "4px 10px" }, "tabletCompactBoard");
    expect(action.minHeight).toBe(OBSERVATION_BOARD_CENSUS_ACTION_MIN_PX);
    const board = readWebSource("src/features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("observationBoardCensusActionButtonStyle");
  });

  it("documents compressed census card height target", () => {
    expect(OBSERVATION_BOARD_CENSUS_CARD_TARGET_MAX_HEIGHT_PX).toBeLessThanOrEqual(170);
    const line = observationBoardIdentityLineStyle("tabletCompactBoard", { fontSize: 12 });
    expect(line.margin).toBe("1px 0 0 0");
  });

  it("preserves operational safety indicators on census cards", () => {
    const board = readWebSource("src/features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("badgeVitalsStale");
    expect(board).toContain("badgeReassessmentOverdue");
    expect(board).toContain("badgeBoarding");
    expect(board).toContain("badgeReadyDischarge");
    expect(board).toContain("obs.losLabel");
    expect(board).toContain("dischargeEncounter");
  });

  it("leaves desktop dense layout unchanged at >=1200px", () => {
    expect(resolveObservationBoardLayoutMode(1280)).toBe("desktopDense");
    expect(observationBoardUsesCompactCensus("desktopDense")).toBe(false);
    const desktopAction = observationBoardCensusActionButtonStyle({ padding: "4px 10px" }, "desktopDense");
    expect(desktopAction.minHeight).toBeUndefined();
  });

  it("preserves phone stacked layout below 768px", () => {
    expect(resolveObservationBoardLayoutMode(390)).toBe("compactStacked");
    expect(observationBoardUsesStackedCards("compactStacked")).toBe(true);
    expect(observationBoardUsesCompactCensus("compactStacked")).toBe(false);
    const phoneAction = observationBoardCensusActionButtonStyle({ padding: "4px 10px" }, "compactStacked");
    expect(phoneAction.minHeight).toBe(OBSERVATION_BOARD_TOUCH_TARGET_MIN_PX);
  });

  it("does not change board workflow or routing", () => {
    const board = readWebSource("src/features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("fetchHospitalisationEncounters");
    // Multiline-safe: prettier may break claimSelf(encounter.id, …) across lines.
    // Invariant: Provider / Nurse / Technician self-assign remains on the board (no tablet APIs).
    expect(board).toMatch(/claimSelf\s*\(\s*encounter\.id[\s\S]*?["']PROVIDER["']/);
    expect(board).toMatch(/claimSelf\s*\(\s*encounter\.id[\s\S]*?["']NURSE["']/);
    expect(board).toMatch(/claimSelf\s*\(\s*encounter\.id[\s\S]*?["']TECHNICIAN["']/);
    expect(board).not.toMatch(/fetchHospitalisationEncountersTablet/i);
    expect(board).not.toMatch(/\/tablet/i);
  });
});
