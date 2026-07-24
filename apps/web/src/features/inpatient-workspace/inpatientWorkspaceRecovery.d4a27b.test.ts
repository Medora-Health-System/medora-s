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

  it("keeps H&P / progress governed; Notes tab reuses ED notes engine (D4A.3.3)", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain("governedHpOnly");
    expect(panel).toContain("governedProgressOnly");
    expect(panel).toContain("EmergencyErNotesPanel");
    expect(panel).toContain('case "notes"');
    expect(panel).toContain("InpatientNursingAssessmentSection");
    expect(panel).not.toContain("NursingRapidReassessmentPanel");
  });

  it("API exposes workspace-bootstrap and HF2 authority resolves mismatches", () => {
    const ctl = readFileSync(
      join(root, "../../../../api/src/encounters/inpatient-operations.controller.ts"),
      "utf8"
    );
    const svc = readFileSync(
      join(root, "../../../../api/src/encounters/inpatient-operations.service.ts"),
      "utf8"
    );
    const authority = readFileSync(
      join(root, "../../../../api/src/encounters/hospital-encounter-authority.service.ts"),
      "utf8"
    );
    const sharedAuthority = readFileSync(
      join(
        root,
        "../../../../../packages/shared/src/encounters/hospitalEncounterAuthorityD4a28Hf2.ts"
      ),
      "utf8"
    );
    const clientErrors = read("inpatientBootstrapClientErrors.ts");
    const view = read("InpatientActiveWorkspaceView.tsx");

    expect(ctl).toContain("workspace-bootstrap");
    expect(svc).toContain("getWorkspaceBootstrap");
    // D4A.2.8-HF2: authoritative resolver replaces buildEncounterMismatchResolution wiring
    expect(svc).toContain("encounterAuthority.resolveRequestedEncounter");
    expect(svc).toContain("FACILITY_MISMATCH");
    expect(svc).toContain("redirectedFromEncounterId");
    expect(svc).toContain("writersEnabled: false");
    expect(svc).toContain("INPATIENT_WORKSPACE_OPENED");
    expect(svc).not.toContain("enablePlacement");
    expect(svc).not.toContain("buildEncounterMismatchResolution");

    expect(authority).toContain("resolveHospitalEncounterAuthority");
    expect(authority).toContain("findEncounterByIdForAuthority");
    expect(authority).toContain("allowLineageRedirect");
    expect(sharedAuthority).toContain("export function resolveHospitalEncounterAuthority");
    expect(sharedAuthority).toContain('category: "FACILITY_MISMATCH"');
    expect(sharedAuthority).toContain('category: "ED_ENCOUNTER_REJECTED"');
    expect(sharedAuthority).toContain('category: "WRONG_ENCOUNTER_TYPE"');

    expect(clientErrors).toContain('code === "FACILITY_MISMATCH"');
    expect(view).toContain("redirectedFromEncounterId");
    expect(view).toContain("writersEnabled");
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
