/**
 * MEDUI.D4B.6 — Web shell host characterization tests.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("EnterpriseInterdisciplinaryCarePlansD4b6", () => {
  it("exports a client shell with D4B.1 primitives and activation UX", () => {
    const src = readFileSync(
      join(__dirname, "EnterpriseInterdisciplinaryCarePlansD4b6.tsx"),
      "utf8"
    );
    expect(src).toContain("enterprise-interdisciplinary-care-plans-d4b6");
    expect(src).toContain("EnterpriseClinicalDocumentStatusBadge");
    expect(src).toContain("activateCarePlanFromTemplate");
    expect(src).toContain("searchCarePlanTemplates");
    expect(src).toContain("eicp-ed-limited-banner");
    expect(src).toContain("foundationBanner");
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
    expect(ed).toContain("EnterpriseInterdisciplinaryCarePlansD4b6");
    expect(obs).toContain("EnterpriseInterdisciplinaryCarePlansD4b6");
    expect(ip).toContain("EnterpriseInterdisciplinaryCarePlansD4b6");
  });
});
