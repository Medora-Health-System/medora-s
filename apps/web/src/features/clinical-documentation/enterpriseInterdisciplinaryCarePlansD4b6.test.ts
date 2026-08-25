/**
 * MEDUI.CP.1C — Care Plan clinician workspace host characterization.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("EnterpriseInterdisciplinaryCarePlansD4b6", () => {
  it("exports clinician workspace with Add Care Plan and CP.1C workflow (no duplicate plan filters)", () => {
    const src = readFileSync(
      join(__dirname, "EnterpriseInterdisciplinaryCarePlansD4b6.tsx"),
      "utf8"
    );
    expect(src).toContain("enterprise-interdisciplinary-care-plans-d4b6");
    expect(src).toContain("CarePlanClinicianWorkflowCp1c");
    expect(src).toContain("eicp-suggestions");
    expect(src).toContain("activateCarePlanFromTemplate");
    expect(src).toContain("searchCarePlanTemplates");
    expect(src).toContain("eicp-ed-limited-banner");
    expect(src).toContain("eicp-add-care-plan");
    expect(src).not.toContain("eicp-plan-filters");
    expect(src).not.toContain('data-testid="eicp-filter-');
  });

  it("is hosted in inpatient and observation workspaces", () => {
    const obs = readFileSync(
      join(__dirname, "../observation-workspace/ObservationWorkspacePanel.tsx"),
      "utf8"
    );
    const ip = readFileSync(
      join(__dirname, "../inpatient-workspace/InpatientWorkspacePanel.tsx"),
      "utf8"
    );
    expect(obs).toContain("EnterpriseInterdisciplinaryCarePlansD4b6");
    expect(ip).toContain("EnterpriseInterdisciplinaryCarePlansD4b6");
  });
});
