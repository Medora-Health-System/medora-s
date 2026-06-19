import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getVisibleEdWorkspaceTiles,
  resolveEdWorkspaceRoleGroup,
} from "./edWorkspaceTileVisibility";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edWorkspaceRoleVisibility (MEDUI.ED.ROLE.1)", () => {
  const activeView = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const roleHook = readSrc("hooks/useFacilityAndRoles.ts");
  const visibility = readSrc("features/emergency/edWorkspaceTileVisibility.ts");

  it("EmergencyActiveWorkspaceView imports getVisibleEdWorkspaceTiles", () => {
    expect(activeView).toContain("getVisibleEdWorkspaceTiles");
    expect(activeView).toContain("edWorkspaceTileVisibility");
  });

  it("EmergencyActiveWorkspaceView passes session roleCodes and capabilities into helper", () => {
    expect(activeView).toContain("roleCodes: roles");
    expect(activeView).toContain("canPrescribe");
    expect(activeView).toContain("deriveEdWorkspaceCapabilities(roles)");
    expect(activeView).toContain("edWorkspaceRoleInput");
  });

  it("tile rendering filters by visible tile ids while registry remains complete", () => {
    expect(activeView).toContain("erDashboardTilesAll");
    expect(activeView).toContain("visibleEdWorkspaceSections.has(tile.id)");
    expect(activeView).toContain('kind: "section"');
  });

  it("active tile falls back when section is not role-visible", () => {
    expect(activeView).toContain("isErWorkspaceSectionVisible");
    expect(activeView).toContain("getDefaultEdWorkspaceTile");
  });

  it("Summary remains visible for Provider, RN, Technician, Unknown", () => {
    for (const roleCodes of [["PROVIDER"], ["RN"], ["LAB"], ["FRONT_DESK"]] as const) {
      expect(getVisibleEdWorkspaceTiles({ roleCodes: [...roleCodes] })).toContain("SUMMARY");
    }
  });

  it("Orders remains visible for Provider, RN, Technician, Unknown", () => {
    for (const roleCodes of [["PROVIDER"], ["RN"], ["RADIOLOGY"], ["BILLING"]] as const) {
      expect(getVisibleEdWorkspaceTiles({ roleCodes: [...roleCodes] })).toContain("ORDERS");
    }
  });

  it("RN keeps Disposition", () => {
    expect(getVisibleEdWorkspaceTiles({ roleCodes: ["RN"] })).toContain("DISPOSITION");
  });

  it("Technician keeps Notes and Disposition", () => {
    const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] });
    expect(tiles).toContain("NOTES");
    expect(tiles).toContain("DISPOSITION");
  });

  it("Provider hides MAR tile but Orders remains visible as mini-MAR", () => {
    const providerTiles = getVisibleEdWorkspaceTiles({ roleCodes: ["PROVIDER"] });
    expect(providerTiles).not.toContain("MEDICATIONS");
    expect(providerTiles).toContain("ORDERS");
    expect(activeView).toContain("EmergencyErOrdersPanel");
  });

  it("no duplicate useFacilityAndRoles in nested ED workspace components checked via single hook call", () => {
    const hookCalls = activeView.match(/useFacilityAndRoles\(\)/g) ?? [];
    expect(hookCalls.length).toBe(1);
  });

  it("useFacilityAndRoles derives roleCodes from facilityRoles for active facility", () => {
    expect(roleHook).toContain("facilityRoles");
    expect(roleHook).toContain("setRoles(r)");
    expect(roleHook).toContain('fr.role === "MEDORA_SUPER_ADMIN"');
  });

  it("edWorkspaceTileVisibility consumes roleCodes not displayName or email", () => {
    expect(visibility).toContain("roleCodes");
    expect(visibility).not.toMatch(/displayName|email|username/i);
    expect(resolveEdWorkspaceRoleGroup({ roleCodes: ["PROVIDER"] })).toBe("PROVIDER");
  });

  it("Administration sees entire dashboard", () => {
    expect(getVisibleEdWorkspaceTiles({ roleCodes: ["ADMIN"] })).toHaveLength(11);
  });
});
