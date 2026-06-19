import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ED_WORKSPACE_ALL_TILE_IDS,
  edWorkspaceTileToSection,
  getVisibleEdWorkspaceTiles,
} from "./edWorkspaceTileVisibility";
import { parseErWorkspaceSection } from "./erWorkspaceSections";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataWorkspaceNavigation (MEDUI.ED.CLINICAL_DATA.1)", () => {
  const activeView = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const nav = readSrc("features/emergency/EmergencyErWorkspaceSectionNav.tsx");
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");

  it("Clinical Data tile exists in workspace registry between Diagnostics and Notes", () => {
    const dxIndex = ED_WORKSPACE_ALL_TILE_IDS.indexOf("DIAGNOSTICS");
    const cdIndex = ED_WORKSPACE_ALL_TILE_IDS.indexOf("CLINICAL_DATA");
    const notesIndex = ED_WORKSPACE_ALL_TILE_IDS.indexOf("NOTES");
    expect(cdIndex).toBeGreaterThan(dxIndex);
    expect(cdIndex).toBeLessThan(notesIndex);
    expect(notesIndex).toBeGreaterThan(cdIndex);
  });

  it("Clinical Data maps to activeSection clinicalData", () => {
    expect(edWorkspaceTileToSection("CLINICAL_DATA")).toBe("clinicalData");
    expect(parseErWorkspaceSection("clinicalData")).toBe("clinicalData");
    expect(parseErWorkspaceSection("clinicaldata")).toBe("clinicalData");
  });

  it("activeSection clinicalData renders EmergencyClinicalDataPanel", () => {
    expect(activeView).toContain('activeSection === "clinicalData"');
    expect(activeView).toContain("EmergencyClinicalDataPanel");
  });

  it("Clinical Data tile has ed-dashboard-tile-clinical-data test id", () => {
    expect(activeView).toContain('dataTestId: "ed-dashboard-tile-clinical-data"');
    expect(activeView).toContain('id: "clinicalData"');
    expect(activeView).toContain('initials: "CD"');
  });

  it("dashboard short label includes Clinical Data", () => {
    expect(nav).toContain('CD: "Clinical Data"');
  });

  it("Provider dashboard includes Clinical Data tile", () => {
    const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["PROVIDER"] });
    expect(tiles).toContain("CLINICAL_DATA");
  });

  it("RN dashboard does not include Clinical Data tile (Nursing Assessment unchanged)", () => {
    const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["RN"] });
    expect(tiles).not.toContain("CLINICAL_DATA");
    expect(tiles).toContain("NURSING_ASSESSMENT");
  });

  it("Nursing Assessment tile remains in registry and RN visibility", () => {
    expect(ED_WORKSPACE_ALL_TILE_IDS).toContain("NURSING_ASSESSMENT");
    expect(activeView).toContain('activeSection === "nursing"');
    expect(activeView).toContain("EmergencyNursingReassessmentPanel");
  });

  it("Provider tile order unchanged except Clinical Data between Diagnosis and Notes", () => {
    const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["PROVIDER"] });
    const dx = tiles.indexOf("DIAGNOSTICS");
    const cd = tiles.indexOf("CLINICAL_DATA");
    const notes = tiles.indexOf("NOTES");
    expect(dx).toBeGreaterThanOrEqual(0);
    expect(cd).toBe(dx + 1);
    expect(notes).toBe(cd + 1);
  });

  it("EmergencyClinicalDataPanel exposes panel test id", () => {
    expect(panel).toContain('data-testid="emergency-clinical-data-panel"');
  });
});
