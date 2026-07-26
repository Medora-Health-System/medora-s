/**
 * MEDUI.D4B.7 — Web shell host characterization tests.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("EnterpriseCaseManagementDischargePlanningD4b7", () => {
  it("exports a client shell with D4B.1 primitives and authority banners", () => {
    const src = readFileSync(
      join(__dirname, "EnterpriseCaseManagementDischargePlanningD4b7.tsx"),
      "utf8"
    );
    expect(src).toContain("enterprise-case-management-discharge-planning-d4b7");
    expect(src).toContain("EnterpriseClinicalDocumentStatusBadge");
    expect(src).toContain("openCareCoordinationEpisode");
    expect(src).toContain("ecmdp-ed-limited-banner");
    expect(src).toContain("foundationBanner");
    expect(src).toContain("assessReadmissionRiskRules");
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
    expect(ed).toContain("EnterpriseCaseManagementDischargePlanningD4b7");
    expect(obs).toContain("EnterpriseCaseManagementDischargePlanningD4b7");
    expect(ip).toContain("EnterpriseCaseManagementDischargePlanningD4b7");
  });
});
