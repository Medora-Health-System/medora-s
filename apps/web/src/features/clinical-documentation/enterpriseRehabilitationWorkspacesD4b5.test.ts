import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("EnterpriseRehabilitationWorkspacesD4b5", () => {
  it("exports a discipline-mode shell with PT/OT/SLP separation and authority boundaries", () => {
    const src = readFileSync(
      join(__dirname, "EnterpriseRehabilitationWorkspacesD4b5.tsx"),
      "utf8"
    );
    expect(src).toContain("enterprise-rehabilitation-workspaces-d4b5");
    expect(src).toContain("PHYSICAL_THERAPY");
    expect(src).toContain("OCCUPATIONAL_THERAPY");
    expect(src).toContain("SPEECH_LANGUAGE_PATHOLOGY");
    expect(src).toContain("nursingBoundary");
    expect(src).toContain("swallowBoundary");
    expect(src).toContain("techBoundary");
    expect(src).not.toContain("createProviderOrder");
    expect(src).not.toContain("THERAPY_GENERIC");
  });

  it("is hosted on ED, observation, and inpatient nursing surfaces", () => {
    const ed = readFileSync(
      join(__dirname, "../emergency/EmergencyActiveWorkspaceView.tsx"),
      "utf8"
    );
    const obs = readFileSync(
      join(__dirname, "../observation-workspace/ObservationWorkspacePanel.tsx"),
      "utf8"
    );
    const ip = readFileSync(
      join(__dirname, "../inpatient-workspace/InpatientNursingAssessmentSection.tsx"),
      "utf8"
    );
    expect(ed).toContain("EnterpriseRehabilitationWorkspacesD4b5");
    expect(obs).toContain("EnterpriseRehabilitationWorkspacesD4b5");
    expect(ip).toContain("EnterpriseRehabilitationWorkspacesD4b5");
  });
});
