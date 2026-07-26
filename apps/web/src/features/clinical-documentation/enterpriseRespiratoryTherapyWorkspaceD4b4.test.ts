import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("EnterpriseRespiratoryTherapyWorkspaceD4b4", () => {
  it("exports a care-setting-aware shell that composes EDOC and MAR boundaries", () => {
    const src = readFileSync(
      join(__dirname, "EnterpriseRespiratoryTherapyWorkspaceD4b4.tsx"),
      "utf8"
    );
    expect(src).toContain("enterprise-respiratory-therapy-workspace-d4b4");
    expect(src).toContain("ClinicalDocumentationHub");
    expect(src).toContain("marBoundary");
    expect(src).toContain("nursingBoundary");
    expect(src).toContain("techBoundary");
    expect(src).toContain("ventManualEntry");
    expect(src).not.toContain("createProviderOrder");
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
    expect(ed).toContain("EnterpriseRespiratoryTherapyWorkspaceD4b4");
    expect(obs).toContain("EnterpriseRespiratoryTherapyWorkspaceD4b4");
    expect(ip).toContain("EnterpriseRespiratoryTherapyWorkspaceD4b4");
  });
});
