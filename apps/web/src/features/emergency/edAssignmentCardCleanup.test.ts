import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edAssignmentCardCleanup (MEDUI.EDBOARD.UI_CLEANUP)", () => {
  const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
  const routes = readSrc("features/emergency/emergencyRoutes.ts");
  const workspace = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");

  it("hides Provider: me / Nurse: me after self-assignment (Assign me only when unassigned)", () => {
    expect(trackboard).toContain("isProvider && !isPhysMine");
    expect(trackboard).toContain("isNurse && !isNurseMine");
    expect(trackboard).toContain("assignProviderMeShort");
    expect(trackboard).toContain("assignNurseMeShort");
    expect(trackboard).not.toContain("assignProviderMine");
    expect(trackboard).not.toContain("assignNurseMine");
  });

  it("keeps Assign me API wiring and clinician name display", () => {
    expect(trackboard).toContain("assignProviderSelf");
    expect(trackboard).toContain("assignNurseSelf");
    expect(trackboard).toContain("claimSelf");
    expect(trackboard).toContain("emergencyTrackboard.physicianShort");
    expect(trackboard).toContain("emergencyTrackboard.nurseShort");
  });

  it("removes redundant Chart control from ED cards", () => {
    expect(trackboard).not.toContain('t("emergencyTrackboard.chartLink")');
    expect(trackboard).not.toContain("emergencyChartPath(encounter.id)");
  });

  it("patient-name navigation remains the primary ED entry", () => {
    expect(trackboard).toContain("resolveEdBoardPatientNameHref");
    expect(trackboard).toContain("ed-board-patient-name-");
    expect(routes).toContain("emergencyActiveWorkspacePath");
    expect(routes).toContain("emergencyChartPath");
  });

  it("full encounter chart remains reachable from active workspace", () => {
    expect(workspace).toContain("emergencyChartPath");
    expect(workspace).toContain('t("emergencyWorkspace.linkFullEncounter")');
  });
});
