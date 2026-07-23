/**
 * D4A.2.7B — Inpatient workspace recovery boundary tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  hospitalOccupantChartPath,
  inpatientNursingWorkspacePath,
  inpatientProviderWorkspacePath,
  inpatientSharedChartPath,
  inpatientTechnicianWorkspacePath,
} from "./inpatientWorkspacePaths";

const root = join(__dirname);

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.INPATIENT_WORKSPACE_RECOVERY.D4A2_7B boundary", () => {
  it("exposes role-specific inpatient routes", () => {
    expect(inpatientProviderWorkspacePath("enc-1")).toBe(
      "/app/hospitalisation/inpatient/active/enc-1/provider"
    );
    expect(inpatientNursingWorkspacePath("enc-1")).toContain("/nursing");
    expect(inpatientTechnicianWorkspacePath("enc-1")).toContain("/technician");
    expect(inpatientSharedChartPath("enc-1")).toContain("/chart");
  });

  it("never routes ED bed occupants to inpatient workspace", () => {
    expect(
      hospitalOccupantChartPath({ encounterId: "e1", unitCode: "ED" })
    ).toContain("/emergency/");
    expect(
      hospitalOccupantChartPath({ encounterId: "e1", unitCode: "OBS" })
    ).toContain("/observation/");
    expect(
      hospitalOccupantChartPath({ encounterId: "e1", unitCode: "MS" })
    ).toContain("/inpatient/active/");
  });

  it("active workspace uses bootstrap API and blocks writers on failure", () => {
    const view = read("InpatientActiveWorkspaceView.tsx");
    expect(view).toContain("fetchInpatientWorkspaceBootstrap");
    expect(view).toContain("InpatientEncounterUnavailablePanel");
    expect(view).toContain("EnterpriseHospitalPatientHeader");
    expect(view).toContain("writersEnabled");
    expect(view).not.toContain('apiFetch(`/encounters/${encounterId}`)');
  });

  it("removes duplicated generic note writers from H&P / progress / nursing", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).not.toContain("EmergencyErNotesPanel");
    expect(panel).toContain("governedHpOnly");
    expect(panel).toContain("governedProgressOnly");
    expect(panel).toContain("governedNursingOnly");
  });

  it("API exposes workspace-bootstrap and service rejects non-inpatient", () => {
    const ctl = readFileSync(
      join(root, "../../../../api/src/encounters/inpatient-operations.controller.ts"),
      "utf8"
    );
    const svc = readFileSync(
      join(root, "../../../../api/src/encounters/inpatient-operations.service.ts"),
      "utf8"
    );
    expect(ctl).toContain("workspace-bootstrap");
    expect(svc).toContain("getWorkspaceBootstrap");
    expect(svc).toContain("buildEncounterMismatchResolution");
    expect(svc).toContain("INPATIENT_WORKSPACE_OPENED");
    expect(svc).not.toContain("enablePlacement");
  });

  it("unit bed board uses hospitalOccupantChartPath", () => {
    const bed = read("UnitBedBoard.tsx");
    expect(bed).toContain("hospitalOccupantChartPath");
    expect(bed).not.toContain("inpatientActiveWorkspacePath(encounterId)");
  });

  it("EN/FR recovery keys mirrored", () => {
    const en = read("../../i18n/messages/inpatientWorkspaceRecoveryD4a27b.en.ts");
    const fr = read("../../i18n/messages/inpatientWorkspaceRecoveryD4a27b.fr.ts");
    for (const key of [
      "unavailable",
      "ED_ENCOUNTER_REJECTED",
      "governedHpOnly",
      "writersDisabled",
      "observationOperations",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });

  it("role pages mount forcedRole workspaces", () => {
    for (const role of ["provider", "nursing", "technician", "chart"]) {
      const page = readFileSync(
        join(
          root,
          `../../../app/app/hospitalisation/inpatient/active/[id]/${role}/page.tsx`
        ),
        "utf8"
      );
      expect(page).toContain("InpatientActiveWorkspaceView");
      expect(page).toContain("forcedRole");
    }
  });
});
