/**
 * MEDUI.D4B.8 — Web shell host characterization tests (composition v2).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("EnterpriseProviderClinicalWorkspaceD4b8", () => {
  it("exports a client composition shell hosting ProviderDocumentationWorkspace", () => {
    const src = readFileSync(
      join(__dirname, "EnterpriseProviderClinicalWorkspaceD4b8.tsx"),
      "utf8"
    );
    expect(src).toContain("enterprise-provider-clinical-workspace-d4b8");
    expect(src).toContain("ProviderDocumentationWorkspace");
    expect(src).toContain("epcw-composition-banner");
    expect(src).toContain("epcw-ed-limited-banner");
    expect(src).toContain("foundationBanner");
    expect(src).toContain("PROVIDER_CLINICAL_WORKSPACE_COMPOSITION");
    expect(src).not.toContain("openProviderNoteDraft");
    expect(src).not.toContain("finalizeProviderNote");
  });

  it("is hosted in inpatient, observation, and emergency workspaces", () => {
    const ed = readFileSync(
      join(__dirname, "../emergency/EmergencyActiveWorkspaceView.tsx"),
      "utf8"
    );
    const obs = readFileSync(
      join(__dirname, "../observation-workspace/ObservationWorkspacePanel.tsx"),
      "utf8"
    );
    const ip = readFileSync(
      join(__dirname, "../inpatient-workspace/InpatientWorkspacePanel.tsx"),
      "utf8"
    );
    expect(ed).toContain("EnterpriseProviderClinicalWorkspaceD4b8");
    expect(obs).toContain("EnterpriseProviderClinicalWorkspaceD4b8");
    expect(ip).toContain("EnterpriseProviderClinicalWorkspaceD4b8");
  });
});
