import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  OBSERVATION_CENSUS_PATH,
  observationActiveWorkspacePath,
  isObservationWorkspaceEnabledInBrowser,
} from "./observationWorkspacePaths";
import {
  OBSERVATION_WORKSPACE_SECTIONS,
  parseObservationWorkspaceSection,
} from "./observationWorkspaceSections";

const root = join(__dirname);

describe("D3D Observation workspace UI contracts", () => {
  it("keeps browser feature flag OFF when public env var is unset", () => {
    const key = "NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED";
    const prior = process.env[key];
    try {
      delete process.env[key];
      expect(isObservationWorkspaceEnabledInBrowser()).toBe(false);
    } finally {
      if (prior === undefined) delete process.env[key];
      else process.env[key] = prior;
    }
  });

  it("census and active workspace routes are distinct", () => {
    expect(OBSERVATION_CENSUS_PATH).toBe("/app/hospitalisation/observation");
    expect(observationActiveWorkspacePath("enc-1")).toBe(
      "/app/hospitalisation/observation/active/enc-1"
    );
  });

  it("exposes required dashboard tabs", () => {
    const ids = OBSERVATION_WORKSPACE_SECTIONS.map((s) => s.id);
    for (const required of [
      "overview",
      "providerNotes",
      "nursing",
      "orders",
      "results",
      "medications",
      "reassessment",
      "carePlan",
      "summary",
      "disposition",
      "timeline",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("parses section query aliases", () => {
    expect(parseObservationWorkspaceSection("providerNotes")).toBe("providerNotes");
    expect(parseObservationWorkspaceSection("mar")).toBe("medications");
    expect(parseObservationWorkspaceSection("nope")).toBeNull();
  });

  it("keeps EN/FR observationD3d module titles", () => {
    expect(en.observationD3d.census.title).toBe("Observation");
    expect(fr.observationD3d.census.title).toBe("Observation");
    expect(en.observationD3d.workspace.title).toBe("Observation workspace");
    expect(fr.observationD3d.workspace.title).toBe("Espace Observation");
  });

  it("retains Observation header assignment actions via shared header opt-in", () => {
    const obs = readFileSync(join(root, "ObservationActiveWorkspaceView.tsx"), "utf8");
    const header = readFileSync(
      join(root, "../inpatient-workspace/EnterpriseHospitalPatientHeader.tsx"),
      "utf8"
    );
    expect(obs).toContain("showAssignmentActions");
    expect(obs).toContain("onAssignToMe");
    expect(obs).toContain("onRemoveAssignment");
    expect(obs).toContain("assignHospitalRoleToMe");
    expect(obs).toContain("unassignHospitalRole");
    expect(obs).toContain("assignmentBusy");
    expect(obs).toContain("loadBootstrap()");
    expect(header).toContain('data-testid="hospital-header-assign-me"');
    expect(header).toContain('data-testid="hospital-header-remove-assignment"');
    expect(header).toContain("showAssignmentActions");
  });

  it("MEDUI.CP.1F — Observation Summary remounts shared Care Plan medical-record projector (no second store)", () => {
    const panel = readFileSync(join(root, "ObservationWorkspacePanel.tsx"), "utf8");
    expect(panel).toContain("InpatientEncounterMedicalRecordSummaryView");
    expect(panel).toContain('careSetting="OBSERVATION"');
    expect(panel).toContain("observation-panel-summary");
    expect(panel).not.toMatch(/ObservationCarePlan|ObservationCarePlanSummary/);
    const summary = readFileSync(
      join(root, "../inpatient-workspace/InpatientEncounterMedicalRecordSummaryView.tsx"),
      "utf8"
    );
    expect(summary).toContain("projectEncounterCarePlanMedicalRecord");
    expect(summary).toContain("buildCarePlanMedicalRecordPrintHtml");
    expect(summary).toContain('careSetting === "OBSERVATION"');
  });
});
