import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("INP.1B.1 shared inpatient nursing navigation", () => {
  const sections = read("features/inpatient-workspace/inpatientWorkspaceSections.ts");
  const view = read("features/inpatient-workspace/InpatientActiveWorkspaceView.tsx");
  const panel = read("features/inpatient-workspace/InpatientWorkspacePanel.tsx");
  const overview = read("features/inpatient-workspace/InpatientOverviewView.tsx");
  const nursing = read("features/inpatient-workspace/InpatientNursingAssessmentSection.tsx");
  const route = readFileSync(join(process.cwd(), "app/app/hospitalisation/inpatient/active/[id]/chart/page.tsx"), "utf8");

  it("defines the exact shared chart header order", () => {
    const block = sections.slice(
      sections.indexOf("INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS"),
      sections.indexOf("/** Nursing sticky"),
    );
    const ids = [...block.matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toEqual([
      "overview",
      "admission",
      "nursing",
      "orders",
      "medications",
      "results",
      "carePlan",
      "dischargePlanning",
    ]);
  });

  it("uses the shared list in the actual /chart runtime header", () => {
    expect(route).toContain('<InpatientActiveWorkspaceView forcedRole="CHART"');
    expect(view).toContain("INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS");
    expect(view).toContain("<InpatientWorkspaceSectionNav");
  });

  it("resolves direct canonical and alias query sections on first render and refresh", () => {
    expect(sections).toContain('nursingadmission: "admission"');
    expect(sections).toContain('nursingassessment: "nursing"');
    expect(view).toContain("resolveInpatientWorkspaceSection");
    expect(view).toContain("replaceInpatientWorkspaceSectionQuery");
  });

  it("routes to existing admission and native assessment engines for the same encounter", () => {
    expect(panel).toContain("<InpatientAdmissionClinicalShell");
    expect(panel).toContain("<InpatientNursingAssessmentSection");
    expect(nursing).toContain("<InpatientNursingAssessmentPanel");
    expect(nursing).not.toContain("EmergencyNursingReassessmentPanel");
  });

  it("provides explicit overview admission and assessment actions", () => {
    expect(overview).toContain('onNavigateSection?.("admission")');
    expect(overview).toContain('onNavigateSection?.("nursing")');
    expect(overview).toContain("openNursingAssessment");
    expect(overview).toMatch(/startAdmission|continueAdmission|reviewAdmission/);
  });

  it("does not convert chart visibility into nursing authoring authority", () => {
    expect(panel).toContain('roles.includes("RN") || roles.includes("ADMIN")');
    expect(nursing).toContain("isLocked={isLocked || !canEditAssessment}");
  });

  it("keeps the change isolated from ED and observation", () => {
    expect(sections).not.toContain("observation");
    expect(sections).not.toContain("emergency");
  });
});
