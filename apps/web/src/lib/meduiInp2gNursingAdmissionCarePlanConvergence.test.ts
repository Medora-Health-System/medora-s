/**
 * MEDUI.INP.2G — web surface convergence tests (single Care Plan + Summary wiring).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrc = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(webSrc, rel), "utf8");
}

describe("MEDUI.INP.2G Care Plan single surface", () => {
  it("Care Plan tab mounts D4B.6 only (no ClinicalOps carePlan stack)", () => {
    const panel = read("features/inpatient-workspace/InpatientWorkspacePanel.tsx");
    const carePlanCase = panel.slice(
      panel.indexOf('case "carePlan"'),
      panel.indexOf('case "dischargePlanning"')
    );
    expect(carePlanCase).toContain("EnterpriseInterdisciplinaryCarePlansD4b6");
    expect(carePlanCase).not.toContain('mode="carePlan"');
    expect(carePlanCase).not.toContain("InpatientClinicalOpsPanel");
  });
});

describe("MEDUI.INP.2G Nursing Admission signed lock UX", () => {
  it("surfaces SIGNED vs ROLE_READ_ONLY banners without unlocking signed sections", () => {
    const shell = read("features/inpatient-workspace/InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("writeBlocked = readOnly || signed");
    expect(shell).toContain('data-lock-reason="SIGNED"');
    expect(shell).toContain('data-lock-reason="ROLE_READ_ONLY"');
    expect(shell).toContain("nursing-admission-signed-lock-banner");
    expect(shell).toContain("nursing-admission-amendments");
  });
});

describe("MEDUI.INP.2G Summary projections", () => {
  it("Summary renders structured nursing admission + care plan sections", () => {
    const summary = read(
      "features/inpatient-workspace/InpatientEncounterMedicalRecordSummaryView.tsx"
    );
    expect(summary).toContain("projectNursingAdmissionMedicalRecord");
    expect(summary).toContain("summary-nursing-admission-structured");
    expect(summary).toContain("summary-care-plan");
    expect(summary).toContain("/care-plans");
    expect(summary).toContain("supplementalPrintSections");
  });
});
