import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ED_LIFECYCLE_BOARD_VIEWS,
  ED_LIFECYCLE_BOARD_VIEW_I18N_KEYS,
  ED_LIFECYCLE_PLACEHOLDER_I18N_KEYS,
  isEdLifecyclePlaceholderView,
} from "./edEncounterLifecycleNavigation";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("ED lifecycle navigation shell (MEDUI.ED.LIFECYCLE.3)", () => {
  it("navigation labels exist via i18n keys and view model constants", () => {
    expect(ED_LIFECYCLE_BOARD_VIEWS).toEqual([
      "trackboard",
      "bedBoard",
      "myPatients",
      "incompleteCharts",
      "allEncounters",
    ]);
    for (const view of ED_LIFECYCLE_BOARD_VIEWS) {
      expect(ED_LIFECYCLE_BOARD_VIEW_I18N_KEYS[view]).toMatch(/^edLifecycle\.navigation\./);
    }
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    for (const view of ED_LIFECYCLE_BOARD_VIEWS) {
      const key = ED_LIFECYCLE_BOARD_VIEW_I18N_KEYS[view].replace("edLifecycle.navigation.", "");
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
  });

  it("Trackboard tab preserves existing trackboard mode", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("ed-lifecycle-nav-${view}");
    expect(trackboard).toContain("setBoardViewMode(view)");
    expect(trackboard).toContain("sortedFiltered.map");
    expect(trackboard).toContain("fetchOpenEncounters");
    expect(trackboard).toContain('useState<EdLifecycleBoardView>("trackboard")');
  });

  it("Bed Board tab preserves existing bed board mode", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("ed-lifecycle-nav-${view}");
    expect(trackboard).toContain('boardViewMode === "bedBoard"');
    expect(trackboard).toContain("BedBoardUnitSection");
    expect(trackboard).toContain("fetchFacilityBedBoard");
  });

  it("My Patients placeholder renders without filtering", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("ed-lifecycle-placeholder-${boardViewMode}");
    expect(trackboard).toContain("ED_LIFECYCLE_PLACEHOLDER_I18N_KEYS");
    expect(trackboard).toContain("isEdLifecyclePlaceholderView");
    expect(trackboard).not.toMatch(/myPatients[\s\S]{0,400}nurseAssignedUserId/);
    expect(trackboard).not.toMatch(/myPatients[\s\S]{0,400}physicianAssignedUserId/);
  });

  it("Incomplete Charts placeholder renders without patient movement", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("ed-lifecycle-placeholder-${boardViewMode}");
    expect(trackboard).toContain("ED_LIFECYCLE_PLACEHOLDER_I18N_KEYS");
    expect(trackboard).not.toContain("resolveEdEncounterLifecycleState");
    expect(trackboard).not.toContain("INCOMPLETE_CHART");
  });

  it("All Encounters placeholder renders without archive query", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("ed-lifecycle-placeholder-${boardViewMode}");
    expect(trackboard).toContain("ED_LIFECYCLE_PLACEHOLDER_I18N_KEYS");
    expect(trackboard).not.toMatch(/allEncounters[\s\S]{0,500}status=CLOSED/);
    expect(trackboard).not.toMatch(/allEncounters[\s\S]{0,500}ARCHIVED/);
  });

  it("Refresh remains available on the lifecycle shell", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("void loadEncounters({ silent: hasLoadedOnceRef.current })");
    expect(trackboard).toContain('t("common.refresh")');
    expect(trackboard).toContain('data-testid="emergency-trackboard-filters"');
  });

  it("No API or data movement introduced for placeholder views", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(isEdLifecyclePlaceholderView("myPatients")).toBe(true);
    expect(isEdLifecyclePlaceholderView("trackboard")).toBe(false);
    expect(trackboard).not.toContain("buildEdEncounterLifecycleProjection");
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toContain("myPatients");
    expect(loadBlock).not.toContain("incompleteCharts");
    expect(loadBlock).not.toContain("allEncounters");
  });

  it("Assignment does not affect global Trackboard shell visibility", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("assignProviderSelf");
    expect(trackboard).toContain("assignNurseSelf");
    const emergencyOnlyBlock = trackboard.slice(
      trackboard.indexOf("const emergencyOnly"),
      trackboard.indexOf("const filtered")
    );
    expect(emergencyOnlyBlock).not.toContain("nurseAssignedUserId");
    expect(emergencyOnlyBlock).not.toContain("physicianAssignedUserId");
    expect(emergencyOnlyBlock).not.toContain("boardViewMode");
  });

  it("i18n EN/FR keys exist for navigation and placeholders", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain('trackboard: "Trackboard"');
    expect(en).toContain('bedBoard: "Bed Board"');
    expect(en).toContain('myPatients: "My Patients"');
    expect(en).toContain('incompleteCharts: "Incomplete Charts"');
    expect(en).toContain('allEncounters: "All Encounters"');
    expect(en).toContain(
      'myPatients: "My Patients will show encounters assigned to you."'
    );
    expect(fr).toContain('trackboard: "Tableau de suivi"');
    expect(fr).toContain('bedBoard: "Plan des lits"');
    expect(fr).toContain('myPatients: "Mes patients"');
    expect(fr).toContain('incompleteCharts: "Dossiers incomplets"');
    expect(fr).toContain('allEncounters: "Tous les dossiers"');
    for (const view of ["myPatients", "incompleteCharts", "allEncounters"] as const) {
      expect(ED_LIFECYCLE_PLACEHOLDER_I18N_KEYS[view]).toBeDefined();
    }
  });
});
